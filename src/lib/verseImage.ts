/**
 * Generate a polished shareable PNG of a Bible verse.
 *
 * The image uses the app's sanctuary palette (deep navy + warm gold) and is
 * sized at 1080x1350 — Instagram portrait — so it looks good on any social
 * feed or messaging app. Returns a Blob ready to be shared, downloaded, or
 * uploaded.
 */

const W = 1080;
const H = 1350;

// Vertical zones — verse text is constrained between these Y bounds so it
// never overlaps the top branding or the bottom reference/URL block.
const TOP_SAFE_Y = 240; // below the gold rule + app label
const BOTTOM_SAFE_Y = 1050; // above reference + bottom rule + URL

/** Word-wrap a string to a max pixel width using the current ctx font. */
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

export interface VerseImageOptions {
  reference: string; // e.g. "Proverbs 3:5"
  text: string;
  translation?: string; // e.g. "KJV"
}

export const generateVerseImage = async (
  opts: VerseImageOptions,
): Promise<Blob> => {
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas not supported");

  // Background: deep navy gradient (matches --gradient-night)
  const bg = ctx.createLinearGradient(0, 0, 0, H);
  bg.addColorStop(0, "#0b1329");
  bg.addColorStop(0.55, "#142042");
  bg.addColorStop(1, "#1a2a55");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  // Soft gold radial glow
  const glow = ctx.createRadialGradient(W / 2, H / 2, 0, W / 2, H / 2, W * 0.7);
  glow.addColorStop(0, "rgba(232, 184, 96, 0.22)");
  glow.addColorStop(1, "rgba(232, 184, 96, 0)");
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, W, H);

  // Decorative gold rule near the top
  ctx.strokeStyle = "rgba(232, 184, 96, 0.85)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(W / 2 - 60, 200);
  ctx.lineTo(W / 2 + 60, 200);
  ctx.stroke();

  // App label
  ctx.fillStyle = "rgba(232, 184, 96, 0.9)";
  ctx.font = "600 22px 'Inter', system-ui, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "alphabetic";
  ctx.letterSpacing = "0.4em" as unknown as string; // ignored on most browsers; harmless
  ctx.fillText("SOLOMON  WEALTH  CODE", W / 2, 160);

  // Verse text — Playfair Display (loaded by app), serif fallback
  const maxTextWidth = W - 200;
  // Reserve space for the reference (~36px) + translation (~20px) + gap.
  const REF_BLOCK_HEIGHT = 90;
  // Available vertical space for the verse text itself.
  const availableHeight = BOTTOM_SAFE_Y - TOP_SAFE_Y - REF_BLOCK_HEIGHT;

  // Auto-fit: shrink the font size until the wrapped text fits in the
  // available vertical region. This guarantees long verses never overlap
  // the top branding or the bottom reference/URL.
  let fontSize = 60;
  ctx.font = `italic 600 ${fontSize}px 'Playfair Display', Georgia, serif`;
  let lines = wrap(ctx, `\u201C${opts.text.trim()}\u201D`, maxTextWidth);
  let lineHeight = Math.round(fontSize * 1.3);
  let blockHeight = lines.length * lineHeight;

  while (blockHeight > availableHeight && fontSize > 26) {
    fontSize -= 2;
    ctx.font = `italic 600 ${fontSize}px 'Playfair Display', Georgia, serif`;
    lines = wrap(ctx, `\u201C${opts.text.trim()}\u201D`, maxTextWidth);
    lineHeight = Math.round(fontSize * 1.3);
    blockHeight = lines.length * lineHeight;
  }

  // Center the verse block within the safe region.
  const safeCenter = (TOP_SAFE_Y + (BOTTOM_SAFE_Y - REF_BLOCK_HEIGHT)) / 2;
  const startY = safeCenter - blockHeight / 2 + lineHeight * 0.8;

  ctx.fillStyle = "#f5e8c8";
  ctx.textBaseline = "alphabetic";
  for (let i = 0; i < lines.length; i++) {
    ctx.fillText(lines[i], W / 2, startY + i * lineHeight);
  }

  // Reference + translation — always sits just below the verse block,
  // but never below BOTTOM_SAFE_Y.
  const refY = Math.min(
    startY + (lines.length - 1) * lineHeight + 80,
    BOTTOM_SAFE_Y,
  );
  ctx.font = "700 36px 'Playfair Display', Georgia, serif";
  // Gold gradient fill for the reference
  const goldGrad = ctx.createLinearGradient(0, refY - 30, 0, refY + 10);
  goldGrad.addColorStop(0, "#f4d77a");
  goldGrad.addColorStop(1, "#c89a3c");
  ctx.fillStyle = goldGrad;
  ctx.fillText(opts.reference, W / 2, refY);

  if (opts.translation) {
    ctx.fillStyle = "rgba(245, 232, 200, 0.55)";
    ctx.font = "500 18px 'Inter', system-ui, sans-serif";
    ctx.fillText(opts.translation.toUpperCase(), W / 2, refY + 40);
  }

  // Bottom rule + URL
  ctx.strokeStyle = "rgba(232, 184, 96, 0.6)";
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(W / 2 - 50, H - 130);
  ctx.lineTo(W / 2 + 50, H - 130);
  ctx.stroke();

  ctx.fillStyle = "rgba(245, 232, 200, 0.6)";
  ctx.font = "500 20px 'Inter', system-ui, sans-serif";
  ctx.fillText("solomonwealthcode.app", W / 2, H - 90);

  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("toBlob failed"))),
      "image/png",
      0.95,
    );
  });
};

/**
 * Try the native Web Share API with a file. Falls back to a download if not
 * available or the user cancels.
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