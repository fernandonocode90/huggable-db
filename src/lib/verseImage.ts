/**
 * Generate a polished shareable PNG of a Bible verse.
 *
 * 1080x1350 — Instagram portrait. Sanctuary palette (deep navy + warm gold).
 * Tuned for legibility on small screens and social feeds.
 */

const W = 1080;
const H = 1350;

const TOP_SAFE_Y = 260;
const BOTTOM_SAFE_Y = 1060;

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
}

export const generateVerseImage = async (
  opts: VerseImageOptions,
): Promise<Blob> => {
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas not supported");

  // Background — deep night gradient
  const bg = ctx.createLinearGradient(0, 0, 0, H);
  bg.addColorStop(0, "#0b1329");
  bg.addColorStop(0.55, "#142042");
  bg.addColorStop(1, "#1a2a55");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  // Soft warm radial glow centered on the verse
  const glow = ctx.createRadialGradient(
    W / 2,
    H / 2 - 40,
    0,
    W / 2,
    H / 2 - 40,
    W * 0.7,
  );
  glow.addColorStop(0, "rgba(232, 184, 96, 0.20)");
  glow.addColorStop(1, "rgba(232, 184, 96, 0)");
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, W, H);

  // Top header — gold rule + tracked app label
  ctx.textAlign = "center";
  ctx.textBaseline = "alphabetic";

  ctx.fillStyle = "rgba(244, 215, 122, 0.95)";
  ctx.font = "700 20px 'Inter', system-ui, sans-serif";
  drawTrackedText(ctx, "SOLOMON WEALTH CODE", W / 2, 165, 6);

  ctx.strokeStyle = "rgba(232, 184, 96, 0.7)";
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(W / 2 - 40, 195);
  ctx.lineTo(W / 2 + 40, 195);
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

  // Center the verse + ref block together within the safe region
  const totalContentHeight = blockHeight + REF_BLOCK_HEIGHT;
  const safeTop = TOP_SAFE_Y;
  const safeBottom = BOTTOM_SAFE_Y;
  const safeMid = (safeTop + safeBottom) / 2;
  const blockTop = safeMid - totalContentHeight / 2;
  const startY = blockTop + lineHeight * 0.82;

  // Subtle text shadow for legibility on the gradient
  ctx.shadowColor = "rgba(0, 0, 0, 0.35)";
  ctx.shadowBlur = 12;
  ctx.shadowOffsetY = 2;
  ctx.fillStyle = "#f6ead0";
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
  const goldGrad = ctx.createLinearGradient(0, refY - 32, 0, refY + 8);
  goldGrad.addColorStop(0, "#f7dc8a");
  goldGrad.addColorStop(1, "#caa04a");
  ctx.fillStyle = goldGrad;
  ctx.fillText(opts.reference, W / 2, refY);

  if (opts.translation) {
    ctx.fillStyle = "rgba(245, 232, 200, 0.78)";
    ctx.font = "600 16px 'Inter', system-ui, sans-serif";
    drawTrackedText(
      ctx,
      opts.translation.toUpperCase(),
      W / 2,
      refY + 36,
      4,
    );
  }

  // Footer — rule + URL
  ctx.strokeStyle = "rgba(232, 184, 96, 0.55)";
  ctx.lineWidth = 1.25;
  ctx.beginPath();
  ctx.moveTo(W / 2 - 36, H - 130);
  ctx.lineTo(W / 2 + 36, H - 130);
  ctx.stroke();

  ctx.fillStyle = "rgba(245, 232, 200, 0.72)";
  ctx.font = "600 19px 'Inter', system-ui, sans-serif";
  drawTrackedText(ctx, "solomonwealthcode.app", W / 2, H - 92, 1.5);

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
