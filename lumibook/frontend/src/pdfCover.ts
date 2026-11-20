/** Renders page 1 of a PDF (in the browser) to a JPEG so the owner doesn't have to make a cover by hand. */
export async function coverFromPdf(file: File, width = 600): Promise<File> {
  const pdfjs = await import('pdfjs-dist');
  pdfjs.GlobalWorkerOptions.workerSrc = new URL('pdfjs-dist/build/pdf.worker.min.mjs', import.meta.url).toString();
  const doc = await pdfjs.getDocument({ data: await file.arrayBuffer() }).promise;
  const page = await doc.getPage(1);
  const base = page.getViewport({ scale: 1 });
  const viewport = page.getViewport({ scale: width / base.width });
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(viewport.width);
  canvas.height = Math.round(viewport.height);
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas not available');
  await page.render({ canvasContext: ctx, viewport }).promise;
  const blob = await new Promise<Blob>((ok, fail) => canvas.toBlob((b) => (b ? ok(b) : fail(new Error('No image'))), 'image/jpeg', 0.85));
  return new File([blob], 'cover.jpg', { type: 'image/jpeg' });
}
