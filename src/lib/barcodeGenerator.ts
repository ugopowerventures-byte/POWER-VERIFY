import JsBarcode from 'jsbarcode';

export interface BarcodeOptions {
  format?: 'CODE128' | 'CODE39' | 'EAN13';
  width?: number;
  height?: number;
  displayValue?: boolean;
  lineColor?: string;
  background?: string;
  margin?: number;
}

/**
 * Generates a clean 1D barcode image as a Data URL (PNG)
 */
export function generateBarcodeDataUrl(
  text: string,
  options: BarcodeOptions = {}
): string {
  if (typeof document === 'undefined') return '';
  try {
    const canvas = document.createElement('canvas');
    JsBarcode(canvas, text, {
      format: options.format || 'CODE128',
      displayValue: options.displayValue ?? false,
      margin: options.margin ?? 0,
      width: options.width ?? 2,
      height: options.height ?? 80,
      lineColor: options.lineColor || '#000000',
      background: options.background || '#ffffff'
    });
    return canvas.toDataURL('image/png');
  } catch (err) {
    console.warn('Barcode generation warning:', err);
    return '';
  }
}
