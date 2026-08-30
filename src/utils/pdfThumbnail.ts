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

// pdf.js treats an ArrayBuffer passed to getDocument() as transferable: the
// browser hands ownership of it to the worker thread, which detaches the
// original buffer (it becomes zero-length) the moment that first call runs.
// Calling getDocument() a second time with the same buffer, for example once
// to count pages and again per page to render, silently fails on every call
// after the first. The fix is to load the document exactly once and reuse
// the resulting PDFDocumentProxy for every page.
export type LoadedPdf = Awaited<ReturnType<typeof pdfjsLib.getDocument>['promise']>;

export async function loadPdfDocument(data: ArrayBuffer): Promise<LoadedPdf | null> {
  try {
    return await pdfjsLib.getDocument({ data }).promise;
  } catch (e) {
    console.error('PDF load failed:', e);
    return null;
  }
}

export async function renderPdfPage(
  pdf: LoadedPdf,
  pageNumber: number,
  canvas: HTMLCanvasElement
): Promise<boolean> {
  try {
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
