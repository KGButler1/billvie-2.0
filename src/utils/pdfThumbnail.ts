import * as pdfjsLib from 'pdfjs-dist';
import PdfWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url';

pdfjsLib.GlobalWorkerOptions.workerSrc = PdfWorker;

export async function generatePdfThumbnail(file: File): Promise<Blob | null> {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    const page = await pdf.getPage(1);

    const targetWidth = 300;
    const viewport = page.getViewport({ scale: 1 });
    const scale = targetWidth / viewport.width;
    const scaledViewport = page.getViewport({ scale });

    const canvas = document.createElement('canvas');
    canvas.width = scaledViewport.width;
    canvas.height = scaledViewport.height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    await page.render({ canvasContext: ctx, viewport: scaledViewport }).promise;

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, 'image/jpeg', 0.7)
    );
    return blob;
  } catch (e) {
    console.warn('PDF thumbnail generation failed:', e);
    return null;
  }
}

export async function renderPdfPage(
  pdfData: ArrayBuffer,
  pageNumber: number,
  canvas: HTMLCanvasElement
): Promise<boolean> {
  try {
    const pdf = await pdfjsLib.getDocument({ data: pdfData }).promise;
    if (pageNumber > pdf.numPages) return false;
    const page = await pdf.getPage(pageNumber);

    const containerWidth = canvas.parentElement?.clientWidth || 800;
    const viewport = page.getViewport({ scale: 1 });
    const scale = containerWidth / viewport.width;
    const scaledViewport = page.getViewport({ scale });

    canvas.width = scaledViewport.width;
    canvas.height = scaledViewport.height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return false;

    await page.render({ canvasContext: ctx, viewport: scaledViewport }).promise;
    return true;
  } catch (e) {
    console.error('PDF page render failed:', e);
    return false;
  }
}

export async function getPdfPageCount(data: ArrayBuffer): Promise<number> {
  try {
    const pdf = await pdfjsLib.getDocument({ data }).promise;
    return pdf.numPages;
  } catch {
    return 0;
  }
}
