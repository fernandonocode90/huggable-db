/**
 * Generate a polished shareable PNG of a Bible verse.
 *
 * 1080x1350 — Instagram portrait. Two themes:
 *   - "night": deep navy gradient + warm gold (sanctuary at night)
 *   - "day":   soft cream/parchment + ink + muted gold (sanctuary at dawn)
 *
 * Both palettes are tuned for legibility on small screens and social feeds.
 */

import crownUrl from "@/assets/golden-crown.webp";

const W = 1080;
const H = 1350;

const TOP_SAFE_Y = 320;
const BOTTOM_SAFE_Y = 1060;

/** Cache the crown bitmap so repeated shares don't re-decode the asset. */
let crownPromise: Promise<HTMLImageElement> | null = null;
const loadCrown = (): Promise<HTMLImageElement> => {
  if (crownPromise) return crownPromise;
  crownPromise = new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Failed to load crown"));
    img.src = crownUrl;
  });
  return crownPromise;
};

export type VerseImageTheme = "night" | "day";

interface Palette {
  bgTop: string;
  bgMid: string;
  bgBottom: string;
  glow: string; // rgba
  glowFade: string; // rgba(...,0)
  rule: string; // rgba
  ruleSoft: string;
  header: string;
  verse: string;
  verseShadow: string; // rgba
  refTop: string; // gold gradient top
  refBottom: string; // gold gradient bottom
  translation: string;
  footer: string;
}

const PALETTES: Record<VerseImageTheme, Palette> = {
  night: {
    bgTop: "#0b1329",
    bgMid: "#142042",
    bgBottom: "#1a2a55",
    glow: "rgba(232, 184, 96, 0.20)",
    glowFade: "rgba(232, 184, 96, 0)",
    rule: "rgba(232, 184, 96, 0.70)",
    ruleSoft: "rgba(232, 184, 96, 0.55)",
    header: "rgba(244, 215, 122, 0.95)",
    verse: "#f6ead0",
    verseShadow: "rgba(0, 0, 0, 0.35)",
    refTop: "#f7dc8a",
    refBottom: "#caa04a",
    translation: "rgba(245, 232, 200, 0.78)",
    footer: "rgba(245, 232, 200, 0.72)",
  },
  day: {
    // Warm parchment with a subtle vertical wash
    bgTop: "#fbf3e2",
    bgMid: "#f6ead0",
    bgBottom: "#efdfba",
    glow: "rgba(196, 138, 50, 0.14)",
    glowFade: "rgba(196, 138, 50, 0)",
    rule: "rgba(154, 110, 38, 0.70)",
    ruleSoft: "rgba(154, 110, 38, 0.55)",
    // Header: deep amber for tracked caps — readable on cream
    header: "rgba(124, 86, 22, 0.95)",
    // Verse: rich ink, not pure black, for warmth
    verse: "#1f1a14",
    verseShadow: "rgba(255, 240, 210, 0.55)", // soft light glow behind glyphs
    // Reference: deep amber → bronze gradient
    refTop: "#a87421",
    refBottom: "#6b4612",
    translation: "rgba(80, 56, 22, 0.78)",
    footer: "rgba(80, 56, 22, 0.72)",
  },
};

/** Word-wrap to a max pixel width using the current ctx font. */
const wrap = (
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
): string[] => {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let line = "";
  for (const w of words) {
    const candidate = line ? `${line} ${w}` : w;
    if (ctx.measureText(candidate).width <= maxWidth) {
      line = candidate;
    } else {
      if (line) lines.push(line);
      line = w;
    }
  }
  if (line) lines.push(line);
  return lines;
};

/**
 * Draw text centered with manual letter-spacing (canvas ignores the CSS
 * letterSpacing property in many browsers, so we space glyphs by hand for
 * the elegant tracked-out caps in the header / translation labels).
 */
const drawTrackedText = (
  ctx: CanvasRenderingContext2D,
  text: string,
  cx: number,
  y: number,
  trackingPx: number,
) => {
  const chars = [...text];
  const widths = chars.map((c) => ctx.measureText(c).width);
  const total =
    widths.reduce((s, w) => s + w, 0) + trackingPx * (chars.length - 1);
  let x = cx - total / 2;
  const prevAlign = ctx.textAlign;
  ctx.textAlign = "left";
  for (let i = 0; i < chars.length; i++) {
    ctx.fillText(chars[i], x, y);
    x += widths[i] + trackingPx;
  }
  ctx.textAlign = prevAlign;
};

export interface VerseImageOptions {
  reference: string;
  text: string;
  translation?: string;
  /** Defaults to "night" to match historical behavior. */
  theme?: VerseImageTheme;
}

export const generateVerseImage = async (
  opts: VerseImageOptions,
): Promise<Blob> => {
  const theme: VerseImageTheme = opts.theme ?? "night";
  const p = PALETTES[theme];

  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas not supported");

  // Background — vertical gradient
  const bg = ctx.createLinearGradient(0, 0, 0, H);
  bg.addColorStop(0, p.bgTop);
  bg.addColorStop(0.55, p.bgMid);
  bg.addColorStop(1, p.bgBottom);
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  // Soft radial glow centered slightly above middle
  const glow = ctx.createRadialGradient(
    W / 2,
    H / 2 - 40,
    0,
    W / 2,
    H / 2 - 40,
    W * 0.7,
  );
  glow.addColorStop(0, p.glow);
  glow.addColorStop(1, p.glowFade);
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, W, H);

  // Crown — sits above the header. Pure transparent background, no halo,
  // so it blends seamlessly with the gradient.
  try {
    const crown = await loadCrown();
    const crownW = 150;
    const crownH = (crown.height / crown.width) * crownW;
    const crownY = 110;
    ctx.drawImage(crown, W / 2 - crownW / 2, crownY, crownW, crownH);
  } catch {
    /* crown is decorative — fall back silently */
  }

  // Header — elegant serif wordmark with a soft gold gradient that
  // echoes the crown above. Mixed-case small caps feel for refinement.
  ctx.textAlign = "center";
  ctx.textBaseline = "alphabetic";

  const headerY = 288;
  ctx.font = "italic 600 30px 'Playfair Display', Georgia, serif";
  const headerGrad = ctx.createLinearGradient(0, headerY - 26, 0, headerY + 4);
  headerGrad.addColorStop(0, p.refTop);
  headerGrad.addColorStop(1, p.refBottom);
  ctx.fillStyle = headerGrad;
  drawTrackedText(ctx, "Solomon Wealth Code", W / 2, headerY, 2);

  // Thin rule beneath, slightly wider for breathing room
  ctx.strokeStyle = p.rule;
  ctx.lineWidth = 1.25;
  ctx.beginPath();
  ctx.moveTo(W / 2 - 56, 312);
  ctx.lineTo(W / 2 + 56, 312);
  ctx.stroke();

  // Verse text — auto-fit
  const maxTextWidth = W - 180;
  const REF_BLOCK_HEIGHT = 110;
  const availableHeight = BOTTOM_SAFE_Y - TOP_SAFE_Y - REF_BLOCK_HEIGHT;

  let fontSize = 62;
  ctx.font = `italic 600 ${fontSize}px 'Playfair Display', Georgia, serif`;
  let lines = wrap(ctx, `\u201C${opts.text.trim()}\u201D`, maxTextWidth);
  let lineHeight = Math.round(fontSize * 1.32);
  let blockHeight = lines.length * lineHeight;

  while (blockHeight > availableHeight && fontSize > 28) {
    fontSize -= 2;
    ctx.font = `italic 600 ${fontSize}px 'Playfair Display', Georgia, serif`;
    lines = wrap(ctx, `\u201C${opts.text.trim()}\u201D`, maxTextWidth);
    lineHeight = Math.round(fontSize * 1.32);
    blockHeight = lines.length * lineHeight;
  }

  const totalContentHeight = blockHeight + REF_BLOCK_HEIGHT;
  const safeMid = (TOP_SAFE_Y + BOTTOM_SAFE_Y) / 2;
  const blockTop = safeMid - totalContentHeight / 2;
  const startY = blockTop + lineHeight * 0.82;

  // Subtle shadow for legibility — dark on night, soft light on day
  ctx.shadowColor = p.verseShadow;
  ctx.shadowBlur = theme === "night" ? 12 : 6;
  ctx.shadowOffsetY = theme === "night" ? 2 : 0;
  ctx.fillStyle = p.verse;
  for (let i = 0; i < lines.length; i++) {
    ctx.fillText(lines[i], W / 2, startY + i * lineHeight);
  }
  ctx.shadowColor = "transparent";
  ctx.shadowBlur = 0;
  ctx.shadowOffsetY = 0;

  // Reference + translation
  const verseEnd = startY + (lines.length - 1) * lineHeight;
  const refY = verseEnd + 78;

  ctx.font = "700 38px 'Playfair Display', Georgia, serif";
  const refGrad = ctx.createLinearGradient(0, refY - 32, 0, refY + 8);
  refGrad.addColorStop(0, p.refTop);
  refGrad.addColorStop(1, p.refBottom);
  ctx.fillStyle = refGrad;
  ctx.fillText(opts.reference, W / 2, refY);

  if (opts.translation) {
    ctx.fillStyle = p.translation;
    ctx.font = "600 16px 'Inter', system-ui, sans-serif";
    drawTrackedText(ctx, opts.translation.toUpperCase(), W / 2, refY + 36, 4);
  }

  // Footer rule + URL
  ctx.strokeStyle = p.ruleSoft;
  ctx.lineWidth = 1.25;
  ctx.beginPath();
  ctx.moveTo(W / 2 - 36, H - 130);
  ctx.lineTo(W / 2 + 36, H - 130);
  ctx.stroke();

  ctx.fillStyle = p.footer;
  ctx.font = "600 19px 'Inter', system-ui, sans-serif";
  drawTrackedText(ctx, "solomonwealthcode.com", W / 2, H - 92, 1.5);

  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("toBlob failed"))),
      "image/png",
      0.95,
    );
  });
};

/**
 * Try Web Share API with a file. Falls back to download.
 */
export const shareOrDownloadVerse = async (
  blob: Blob,
  filename: string,
): Promise<"shared" | "downloaded"> => {
  const file = new File([blob], filename, { type: "image/png" });
  const navAny = navigator as Navigator & {
    canShare?: (data: ShareData) => boolean;
  };
  if (navAny.canShare && navAny.canShare({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: "A verse for you" });
      return "shared";
    } catch {
      // user cancelled — fall through to download
    }
  }
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  return "downloaded";
};
