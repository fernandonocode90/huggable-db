/**
 * Minimal Web Push implementation using Deno's Web Crypto.
 * Produces a VAPID JWT (ES256) and an aes128gcm-encrypted push body.
 * No external npm dependency required.
 */

const enc = new TextEncoder();

const b64urlEncode = (input: ArrayBuffer | Uint8Array | string): string => {
  let bytes: Uint8Array;
  if (typeof input === "string") bytes = enc.encode(input);
  else if (input instanceof Uint8Array) bytes = input;
  else bytes = new Uint8Array(input);
  let bin = "";
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
};

const b64urlDecode = (str: string): Uint8Array => {
  const pad = "=".repeat((4 - (str.length % 4)) % 4);
  const b = (str + pad).replace(/-/g, "+").replace(/_/g, "/");
  const bin = atob(b);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
};

/** Convert IEEE-P1363 (r||s, 64 bytes) to ASN.1 DER for ECDSA — not needed here, JWT uses raw. */

const importVapidPrivateKey = async (
  privateKeyB64Url: string,
  publicKeyB64Url: string,
): Promise<CryptoKey> => {
  // P-256 private scalar (32 bytes) + uncompressed public point (65 bytes, 0x04||X||Y)
  const d = b64urlEncode(b64urlDecode(privateKeyB64Url));
  const pub = b64urlDecode(publicKeyB64Url);
  if (pub[0] !== 0x04 || pub.length !== 65) {
    throw new Error("Invalid VAPID public key (must be 65-byte uncompressed P-256 point)");
  }
  const x = b64urlEncode(pub.slice(1, 33));
  const y = b64urlEncode(pub.slice(33, 65));
  const jwk: JsonWebKey = {
    kty: "EC",
    crv: "P-256",
    d,
    x,
    y,
    ext: true,
  };
  return crypto.subtle.importKey(
    "jwk",
    jwk,
    { name: "ECDSA", namedCurve: "P-256" },
    false,
    ["sign"],
  );
};

const buildVapidJwt = async (
  endpoint: string,
  subject: string,
  privKey: CryptoKey,
): Promise<string> => {
  const url = new URL(endpoint);
  const aud = `${url.protocol}//${url.host}`;
  const header = { typ: "JWT", alg: "ES256" };
  const payload = {
    aud,
    exp: Math.floor(Date.now() / 1000) + 12 * 60 * 60,
    sub: subject,
  };
  const unsigned = `${b64urlEncode(JSON.stringify(header))}.${b64urlEncode(JSON.stringify(payload))}`;
  const sig = await crypto.subtle.sign(
    { name: "ECDSA", hash: { name: "SHA-256" } },
    privKey,
    enc.encode(unsigned),
  );
  return `${unsigned}.${b64urlEncode(sig)}`;
};

const hkdf = async (
  salt: Uint8Array,
  ikm: Uint8Array,
  info: Uint8Array,
  length: number,
): Promise<Uint8Array> => {
  const key = await crypto.subtle.importKey("raw", ikm, "HKDF", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits(
    { name: "HKDF", hash: "SHA-256", salt, info },
    key,
    length * 8,
  );
  return new Uint8Array(bits);
};

const concat = (...arrs: Uint8Array[]): Uint8Array => {
  const len = arrs.reduce((s, a) => s + a.length, 0);
  const out = new Uint8Array(len);
  let off = 0;
  for (const a of arrs) {
    out.set(a, off);
    off += a.length;
  }
  return out;
};

/** RFC 8291 aes128gcm content encoding for Web Push. */
const encryptPayload = async (
  payload: Uint8Array,
  uaPublicB64: string,
  authSecretB64: string,
): Promise<{ body: Uint8Array }> => {
  const uaPublic = b64urlDecode(uaPublicB64); // 65 bytes uncompressed
  const authSecret = b64urlDecode(authSecretB64); // 16 bytes

  // Generate ephemeral ECDH keypair
  const ephemeral = await crypto.subtle.generateKey(
    { name: "ECDH", namedCurve: "P-256" },
    true,
    ["deriveBits"],
  );
  const asPublicJwk = await crypto.subtle.exportKey("jwk", ephemeral.publicKey);
  const asPublicRaw = concat(
    new Uint8Array([0x04]),
    b64urlDecode(asPublicJwk.x!),
    b64urlDecode(asPublicJwk.y!),
  );

  // Import UA public key
  const uaJwk: JsonWebKey = {
    kty: "EC",
    crv: "P-256",
    x: b64urlEncode(uaPublic.slice(1, 33)),
    y: b64urlEncode(uaPublic.slice(33, 65)),
    ext: true,
  };
  const uaPubKey = await crypto.subtle.importKey(
    "jwk",
    uaJwk,
    { name: "ECDH", namedCurve: "P-256" },
    true,
    [],
  );

  const sharedBits = await crypto.subtle.deriveBits(
    { name: "ECDH", public: uaPubKey },
    ephemeral.privateKey,
    256,
  );
  const ecdhSecret = new Uint8Array(sharedBits);

  // PRK_key = HKDF(authSecret, ecdhSecret, "WebPush: info\0" || uaPublic || asPublic, 32)
  const keyInfo = concat(
    enc.encode("WebPush: info\0"),
    uaPublic,
    asPublicRaw,
  );
  const ikm = await hkdf(authSecret, ecdhSecret, keyInfo, 32);

  // Random salt (16 bytes)
  const salt = crypto.getRandomValues(new Uint8Array(16));

  // CEK
  const cek = await hkdf(salt, ikm, enc.encode("Content-Encoding: aes128gcm\0"), 16);
  // Nonce
  const nonce = await hkdf(salt, ikm, enc.encode("Content-Encoding: nonce\0"), 12);

  // Plaintext + 0x02 padding delimiter (single record)
  const plaintext = concat(payload, new Uint8Array([0x02]));

  const cekKey = await crypto.subtle.importKey("raw", cek, { name: "AES-GCM" }, false, ["encrypt"]);
  const ciphertextBuf = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv: nonce },
    cekKey,
    plaintext,
  );
  const ciphertext = new Uint8Array(ciphertextBuf);

  // aes128gcm header: salt(16) | rs(4 BE) | idlen(1) | keyid(idlen)
  const rs = new Uint8Array(4);
  new DataView(rs.buffer).setUint32(0, 4096, false);
  const header = concat(salt, rs, new Uint8Array([asPublicRaw.length]), asPublicRaw);

  return { body: concat(header, ciphertext) };
};

export interface WebPushSubscription {
  endpoint: string;
  p256dh: string;
  auth: string;
}

export interface SendPushOptions {
  vapidPublicKey: string;
  vapidPrivateKey: string;
  vapidSubject: string;
  ttl?: number;
}

export const sendWebPush = async (
  sub: WebPushSubscription,
  payload: Record<string, unknown>,
  opts: SendPushOptions,
): Promise<{ status: number; body: string }> => {
  const privKey = await importVapidPrivateKey(opts.vapidPrivateKey, opts.vapidPublicKey);
  const jwt = await buildVapidJwt(sub.endpoint, opts.vapidSubject, privKey);

  const { body } = await encryptPayload(
    enc.encode(JSON.stringify(payload)),
    sub.p256dh,
    sub.auth,
  );

  const res = await fetch(sub.endpoint, {
    method: "POST",
    headers: {
      Authorization: `vapid t=${jwt}, k=${opts.vapidPublicKey}`,
      "Content-Encoding": "aes128gcm",
      "Content-Type": "application/octet-stream",
      TTL: String(opts.ttl ?? 60 * 60 * 24),
    },
    body,
  });

  const text = await res.text();
  return { status: res.status, body: text };
};