// Captures a visible DOM element and saves it as an A4 PDF.
// The target element must be rendered and visible when this is called —
// the InvoicePreviewModal guarantees that.
export async function downloadInvoicePDF(elementId: string, filename: string): Promise<void> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const html2pdf = (await import('html2pdf.js' as any)).default;

  const el = document.getElementById(elementId);
  if (!el) throw new Error(`PDF target #${elementId} not found in DOM`);

  await html2pdf()
    .set({
      margin:      [8, 8, 8, 8],
      filename,
      image:       { type: 'jpeg', quality: 0.98 },
      html2canvas: {
        scale:           2,
        useCORS:         true,
        logging:         false,
        backgroundColor: '#ffffff',
      },
      jsPDF: {
        unit:        'mm',
        format:      'a4',
        orientation: 'portrait',
      },
      pagebreak: { mode: ['avoid-all', 'css', 'legacy'] },
    })
    .from(el)
    .save();
}
