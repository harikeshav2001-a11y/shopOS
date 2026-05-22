// Opens a clean print window containing just the invoice HTML, then
// triggers the browser's native print dialog.  The user can choose
// "Save as PDF" (Chrome/Edge) or any printer.
export function printInvoice(elementId: string, title: string): void {
  const el = document.getElementById(elementId);
  if (!el) throw new Error(`Element #${elementId} not found`);

  const popup = window.open('', '_blank', 'width=900,height=700');
  if (!popup) throw new Error('Popup blocked — please allow pop-ups for this site and try again.');

  popup.document.write(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>${title}</title>
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link href="https://fonts.googleapis.com/css2?family=Google+Sans+Flex:wght@100..900&display=swap" rel="stylesheet" />
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

    body {
      font-family: 'Google Sans Flex', 'Google Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      background: #f4f4f4;
      color: #0D1F13;
    }

    /* ── Toolbar (screen only) ── */
    #pdf-toolbar {
      position: fixed;
      top: 0; left: 0; right: 0;
      height: 52px;
      background: #18191A;
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0 20px;
      z-index: 1000;
      gap: 12px;
    }
    #pdf-toolbar button {
      display: flex; align-items: center; gap: 6px;
      padding: 7px 14px;
      border-radius: 8px;
      border: 1px solid rgba(255,255,255,0.2);
      background: transparent;
      color: #F8FAFC;
      font-size: 13px;
      font-weight: 500;
      cursor: pointer;
      font-family: inherit;
    }
    #pdf-toolbar button:hover { background: rgba(255,255,255,0.1); }
    #pdf-toolbar button.primary {
      background: #E8A020;
      border-color: #E8A020;
      color: #18191A;
      font-weight: 600;
    }
    #pdf-toolbar button.primary:hover { opacity: 0.9; }
    #pdf-toolbar span {
      color: #94A3B8;
      font-size: 13px;
      flex: 1;
      text-align: center;
    }
    #pdf-spacer { height: 52px; }

    /* Invoice fills page width */
    #pdf-spacer + div, body > div:not(#pdf-toolbar) {
      width: 100% !important;
      max-width: 100% !important;
    }

    /* ── Print rules ── */
    @page { size: A4 portrait; margin: 10mm; }

    @media print {
      #pdf-toolbar, #pdf-spacer { display: none !important; }
      body { background: #fff; }
      body {
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
        color-adjust: exact;
      }
    }
  </style>
</head>
<body>
  <div id="pdf-toolbar">
    <button onclick="window.close()">&#8592; Back</button>
    <span>${title}</span>
    <button class="primary" onclick="window.print()">&#128438; Print / Save as PDF</button>
  </div>
  <div id="pdf-spacer"></div>
  ${el.outerHTML}
</body>
</html>`);

  popup.document.close();

  // Fire print once everything (including base64 logo) is loaded
  popup.addEventListener('load', () => {
    popup.focus();
    popup.print();
  });

  // Fallback for browsers that don't fire 'load' on document.write
  setTimeout(() => {
    try { popup.focus(); popup.print(); } catch { /* already printed */ }
  }, 800);
}
