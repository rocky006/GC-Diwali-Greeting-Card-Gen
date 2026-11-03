export interface RenderOptions {
  creativeUrl: string;
  fallbackUrl?: string;
  name: string;
  designation: string;
  prefix?: string;
  yOffset?: number; // Y position in 1080x1350 space
  alignment?: 'center' | 'left' | 'right';
  badgeStyle?: 'frosted-pill' | 'minimal' | 'ornamental-line';
  scale?: number; // 0.8 - 1.2 font scale
  showPrefix?: boolean;
  nameColor?: string;
  desigColor?: string;
  nameFontSize?: number;
  desigFontSize?: number;
}

export const CANVAS_WIDTH = 1080;
export const CANVAS_HEIGHT = 1350;

// In-memory image cache for instant snappy switching
const imageCache = new Map<string, HTMLImageElement>();

export async function preloadImage(url: string, fallbackUrl?: string): Promise<HTMLImageElement> {
  if (imageCache.has(url)) {
    const cached = imageCache.get(url)!;
    if (cached.complete && cached.naturalWidth > 0) return cached;
  }

  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';

    img.onload = () => {
      imageCache.set(url, img);
      resolve(img);
    };

    img.onerror = () => {
      if (fallbackUrl && fallbackUrl !== url) {
        console.warn(`Primary image failed (${url}), trying fallback: ${fallbackUrl}`);
        const fallbackImg = new Image();
        fallbackImg.crossOrigin = 'anonymous';
        fallbackImg.onload = () => {
          imageCache.set(url, fallbackImg);
          resolve(fallbackImg);
        };
        fallbackImg.onerror = (e) => reject(new Error(`Failed to load image from both sources: ${e}`));
        fallbackImg.src = fallbackUrl;
      } else {
        reject(new Error(`Failed to load image: ${url}`));
      }
    };

    img.src = url;
  });
}

// Ensure fonts are ready before drawing to canvas
export async function ensureFontsLoaded(): Promise<void> {
  if ('fonts' in document) {
    try {
      await Promise.all([
        document.fonts.load('600 48px Poppins'),
        document.fonts.load('400 32px Poppins'),
        document.fonts.load('500 24px Poppins'),
        document.fonts.ready,
      ]);
    } catch (e) {
      console.warn('Font load check warning, continuing:', e);
    }
  }
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  radius: number
) {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + w, y, x + w, y + h, radius);
  ctx.arcTo(x + w, y + h, x, y + h, radius);
  ctx.arcTo(x, y + h, x, y, radius);
  ctx.arcTo(x, y, x + w, y, radius);
  ctx.closePath();
}

export async function renderCardToCanvas(
  canvas: HTMLCanvasElement,
  options: RenderOptions
): Promise<void> {
  canvas.width = CANVAS_WIDTH;
  canvas.height = CANVAS_HEIGHT;

  const ctx = canvas.getContext('2d', { alpha: false });
  if (!ctx) throw new Error('Could not get 2d context');

  // 1. Ensure fonts are loaded
  await ensureFontsLoaded();

  // 2. Load background image
  const img = await preloadImage(options.creativeUrl, options.fallbackUrl);

  // 3. Draw background image preserving 1080x1350 scale
  ctx.drawImage(img, 0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

  const nameText = options.name.trim();
  const desigText = options.designation.trim();

  // If no text entered yet, we still display the pristine creative
  if (!nameText && !desigText) {
    return;
  }

  // 4. Typography setup according to user rule
  const fontScale = options.scale || 1.0;
  let nameFontSize = Math.round((options.nameFontSize || 42) * fontScale);
  let desigFontSize = Math.round((options.desigFontSize || 24) * fontScale);

  const nameColor = options.nameColor || '#7D1848';
  const desigColor = options.desigColor || '#555555';

  ctx.save();
  ctx.textBaseline = 'top'; // Explicit deterministic baseline across all platforms

  // Alignment coordinates
  let anchorX = CANVAS_WIDTH / 2;
  ctx.textAlign = 'center';
  if (options.alignment === 'left') {
    anchorX = 140;
    ctx.textAlign = 'left';
  } else if (options.alignment === 'right') {
    anchorX = CANVAS_WIDTH - 140;
    ctx.textAlign = 'right';
  }

  // Auto-fit long names: max width is 840px
  const maxAvailableWidth = 840;
  
  ctx.font = `600 ${nameFontSize}px 'Poppins', sans-serif`;
  let nameWidth = ctx.measureText(nameText).width;
  while (nameWidth > maxAvailableWidth && nameFontSize > 22) {
    nameFontSize -= 2;
    ctx.font = `600 ${nameFontSize}px 'Poppins', sans-serif`;
    nameWidth = ctx.measureText(nameText).width;
  }

  ctx.font = `400 ${desigFontSize}px 'Poppins', sans-serif`;
  let desigWidth = ctx.measureText(desigText).width;
  while (desigWidth > maxAvailableWidth && desigFontSize > 16) {
    desigFontSize -= 2;
    ctx.font = `400 ${desigFontSize}px 'Poppins', sans-serif`;
    desigWidth = ctx.measureText(desigText).width;
  }

  const lineSpacing = 14 * fontScale;

  // Designated text space: 1200px to 1350px (150px height)
  const zoneTop = 1200;
  const zoneHeight = 150;
  const totalContentHeight = (nameText ? nameFontSize : 0) + 
                            (nameText && desigText ? lineSpacing : 0) + 
                            (desigText ? desigFontSize : 0);

  // Center vertically in [1200, 1350]
  const startY = zoneTop + Math.max(10, (zoneHeight - totalContentHeight) / 2);

  // Render Name and Designation directly on creative in the bottom 1200-1350px space
  let currentY = startY;

  // 1. Employee Name: Poppins SemiBold
  if (nameText) {
    ctx.font = `600 ${nameFontSize}px 'Poppins', sans-serif`;
    ctx.fillStyle = nameColor;
    ctx.fillText(nameText, anchorX, currentY);
    currentY += nameFontSize + lineSpacing;
  }

  // 2. Designation: Poppins Regular
  if (desigText) {
    ctx.font = `400 ${desigFontSize}px 'Poppins', sans-serif`;
    ctx.fillStyle = desigColor;
    ctx.fillText(desigText, anchorX, currentY);
  }

  ctx.restore();
}

// Download canvas directly as PNG
export function downloadCanvasAsPng(canvas: HTMLCanvasElement, filename: string): void {
  canvas.toBlob((blob) => {
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.download = filename.endsWith('.png') ? filename : `${filename}.png`;
    link.href = url;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => URL.revokeObjectURL(url), 2000);
  }, 'image/png', 1.0);
}

// Copy canvas image to clipboard if supported
export async function copyCanvasToClipboard(canvas: HTMLCanvasElement): Promise<boolean> {
  if (!navigator.clipboard || !window.ClipboardItem) {
    return false;
  }
  return new Promise((resolve) => {
    canvas.toBlob(async (blob) => {
      if (!blob) {
        resolve(false);
        return;
      }
      try {
        await navigator.clipboard.write([
          new ClipboardItem({ 'image/png': blob })
        ]);
        resolve(true);
      } catch (err) {
        console.warn('Clipboard write error:', err);
        resolve(false);
      }
    }, 'image/png', 1.0);
  });
}
