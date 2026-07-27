import {
  BinaryBitmap,
  HybridBinarizer,
  HTMLCanvasElementLuminanceSource,
  QRCodeReader,
  Result,
} from '@zxing/library';

import { MESSAGE_TYPE } from '../../constants';

export interface IQrBox {
  x: number;
  y: number;
  width: number;
  height: number;
  text: string;
}

const MAX_CODES_PER_IMAGE = 8;
// Screen-captured QR codes can be too low-resolution for their density to read cleanly
// at 1x. Retrying at 2x is a cheap, standard mitigation for marginal ZXing decode misses.
const SCALE_FACTORS = [1, 2];

interface IRegion {
  x: number;
  y: number;
  width: number;
  height: number;
}

// Decoding the whole screenshot in one pass can misfire when two QR codes sit near each
// other in the same image: the detector's finder-pattern matching can occasionally pair
// patterns belonging to two different codes, producing a bogus "detected size" and a
// consistent decode failure for the whole image regardless of resolution. Restricting
// each attempt to a cropped region (with generous overlap so a single code near the
// middle still falls entirely inside at least one region) avoids that cross-code mixup.
const getCandidateRegions = (width: number, height: number): IRegion[] => {
  const halfW = Math.round(width * 0.6);
  const halfH = Math.round(height * 0.6);
  return [
    { x: 0, y: 0, width, height }, // whole image
    { x: 0, y: 0, width: halfW, height }, // left column
    { x: width - halfW, y: 0, width: halfW, height }, // right column
    { x: 0, y: 0, width, height: halfH }, // top row
    { x: 0, y: height - halfH, width, height: halfH }, // bottom row
  ];
};

const loadImage = (dataUrl: string): Promise<HTMLImageElement> => new Promise((resolve, reject) => {
  const img = new Image();
  img.onload = () => resolve(img);
  img.onerror = () => reject(new Error('Failed to load captured screenshot'));
  img.src = dataUrl;
});

const cropCanvas = (source: HTMLCanvasElement, region: IRegion): HTMLCanvasElement => {
  const cropped = document.createElement('canvas');
  cropped.width = region.width;
  cropped.height = region.height;
  const croppedCtx = cropped.getContext('2d');
  if (!croppedCtx) {
    throw new Error('Could not get 2d context for cropped canvas');
  }
  croppedCtx.drawImage(source, region.x, region.y, region.width, region.height, 0, 0, region.width, region.height);
  return cropped;
};

const decodeAtScale = (reader: QRCodeReader, sourceCanvas: HTMLCanvasElement, scale: number): Result => {
  let target = sourceCanvas;
  if (scale !== 1) {
    target = document.createElement('canvas');
    target.width = Math.round(sourceCanvas.width * scale);
    target.height = Math.round(sourceCanvas.height * scale);
    const targetCtx = target.getContext('2d');
    if (!targetCtx) {
      throw new Error('Could not get 2d context for scaled canvas');
    }
    targetCtx.drawImage(sourceCanvas, 0, 0, target.width, target.height);
  }
  const luminanceSource = new HTMLCanvasElementLuminanceSource(target);
  const binaryBitmap = new BinaryBitmap(new HybridBinarizer(luminanceSource));
  return reader.decode(binaryBitmap);
};

/*
 * @zxing/library@0.23.0 has no ready-made "find several QR codes in one image" reader.
 * ZXing's own multi-barcode approach is: decode one code, black out its region, decode
 * again, repeat until nothing more is found -- so we do that manually here, trying a
 * handful of candidate regions (see getCandidateRegions) per pass to sidestep cross-code
 * confusion when multiple codes are visible at once.
 */
export const decodeQrCodesFromDataUrl = async (dataUrl: string): Promise<IQrBox[]> => {
  const img = await loadImage(dataUrl);
  const canvas = document.createElement('canvas');
  canvas.width = img.naturalWidth;
  canvas.height = img.naturalHeight;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    console.error('decodeQrCodesFromDataUrl: could not get 2d context');
    return [];
  }
  ctx.drawImage(img, 0, 0);

  const reader = new QRCodeReader();
  const boxes: IQrBox[] = [];

  for (let i = 0; i < MAX_CODES_PER_IMAGE; i++) {
    let result: Result | undefined;
    let usedScale = 1;
    let usedRegion: IRegion = { x: 0, y: 0, width: canvas.width, height: canvas.height };

    for (const region of getCandidateRegions(canvas.width, canvas.height)) {
      const regionCanvas = cropCanvas(canvas, region);
      for (const scale of SCALE_FACTORS) {
        try {
          result = decodeAtScale(reader, regionCanvas, scale);
          usedScale = scale;
          usedRegion = region;
          break;
        } catch (err) {
          // Expected: most region/scale combinations won't contain a decodable code.
        }
      }
      if (result) {
        break;
      }
    }

    if (!result) {
      break;
    }

    const points = result.getResultPoints();
    const xs = points.map((point) => usedRegion.x + (point.getX() / usedScale));
    const ys = points.map((point) => usedRegion.y + (point.getY() / usedScale));
    const minX = Math.min(...xs);
    const maxX = Math.max(...xs);
    const minY = Math.min(...ys);
    const maxY = Math.max(...ys);
    // Finder-pattern points sit slightly inside the code's true edge; pad outward
    // so the highlighted box covers the whole code, not just the finder patterns.
    const padX = (maxX - minX) * 0.15 + 8;
    const padY = (maxY - minY) * 0.15 + 8;
    const x = Math.max(0, minX - padX);
    const y = Math.max(0, minY - padY);
    const width = Math.min(canvas.width, maxX + padX) - x;
    const height = Math.min(canvas.height, maxY + padY) - y;

    boxes.push({ x, y, width, height, text: result.getText() });

    // Black out the found region (in original-canvas coordinates) so the next pass detects a different code.
    ctx.fillStyle = '#000000';
    ctx.fillRect(x, y, width, height);
  }

  return boxes;
};

export const parseAddressFromQrText = (text: string): string => {
  const withoutScheme = text.replace(/^[a-zA-Z][a-zA-Z0-9+.-]*:/, '');
  return withoutScheme.split('?')[0];
};

export const getTabDevicePixelRatio = async (tabId: number): Promise<number> => {
  const [{ result }] = await chrome.scripting.executeScript({
    target: { tabId },
    func: () => window.devicePixelRatio,
  });
  return result || 1;
};

export const injectQrOverlay = (tabId: number, boxes: IQrBox[], dpr: number) => chrome.scripting.executeScript({
  target: { tabId },
  func: (
    serializedBoxes: { x: number; y: number; width: number; height: number; text: string }[],
    pixelRatio: number,
    messageType: string,
  ) => {
    const OVERLAY_ID = 'metrimask-qr-overlay';
    const existing = document.getElementById(OVERLAY_ID);
    if (existing) {
      existing.remove();
    }

    const container = document.createElement('div');
    container.id = OVERLAY_ID;
    container.style.position = 'fixed';
    container.style.top = '0';
    container.style.left = '0';
    container.style.right = '0';
    container.style.bottom = '0';
    container.style.zIndex = '2147483647';
    container.style.pointerEvents = 'none';

    let dismissed = false;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        cleanup();
      }
    };
    const cleanup = () => {
      if (dismissed) {
        return;
      }
      dismissed = true;
      container.remove();
      document.removeEventListener('keydown', onKeyDown);
    };

    serializedBoxes.forEach((box, index) => {
      const el = document.createElement('div');
      el.style.position = 'fixed';
      el.style.left = `${box.x / pixelRatio}px`;
      el.style.top = `${box.y / pixelRatio}px`;
      el.style.width = `${box.width / pixelRatio}px`;
      el.style.height = `${box.height / pixelRatio}px`;
      el.style.border = '3px solid #A569D4';
      el.style.borderRadius = '8px';
      el.style.background = 'rgba(165, 105, 212, 0.15)';
      el.style.cursor = 'pointer';
      el.style.pointerEvents = 'auto';
      el.style.boxSizing = 'border-box';

      const label = document.createElement('div');
      label.textContent = serializedBoxes.length > 1 ? `Use address #${index + 1}` : 'Use this address';
      label.style.position = 'absolute';
      label.style.top = '-24px';
      label.style.left = '0';
      label.style.background = '#A569D4';
      label.style.color = '#FFFFFF';
      label.style.fontSize = '12px';
      label.style.fontFamily = 'sans-serif';
      label.style.padding = '2px 6px';
      label.style.borderRadius = '4px';
      label.style.whiteSpace = 'nowrap';
      el.appendChild(label);

      el.addEventListener('click', (event) => {
        event.stopPropagation();
        event.preventDefault();
        chrome.runtime.sendMessage({ type: messageType, address: box.text });
        cleanup();
      });

      container.appendChild(el);
    });

    const cancelButton = document.createElement('div');
    cancelButton.textContent = '✕ Cancel scan';
    cancelButton.style.position = 'fixed';
    cancelButton.style.top = '12px';
    cancelButton.style.right = '12px';
    cancelButton.style.background = '#1C1320';
    cancelButton.style.color = '#FFFFFF';
    cancelButton.style.padding = '6px 12px';
    cancelButton.style.borderRadius = '999px';
    cancelButton.style.fontSize = '13px';
    cancelButton.style.fontFamily = 'sans-serif';
    cancelButton.style.cursor = 'pointer';
    cancelButton.style.pointerEvents = 'auto';
    cancelButton.style.border = '1px solid #A569D4';
    cancelButton.addEventListener('click', cleanup);
    container.appendChild(cancelButton);

    document.addEventListener('keydown', onKeyDown);
    document.body.appendChild(container);

    setTimeout(cleanup, 20000);
  },
  args: [
    boxes.map(({ x, y, width, height, text }) => ({ x, y, width, height, text })),
    dpr,
    MESSAGE_TYPE.QR_CODE_SELECTED,
  ],
});
