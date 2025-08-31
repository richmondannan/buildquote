import jsPDF from 'jspdf';
export function generateReceiptPdf(quotation, items, company) {
  const doc = new jsPDF();
  doc.setFontSize(16);
  doc.text(company?.name || 'Company', 14, 18);
  doc.setFontSize(12);
  doc.text('Receipt for Quotation ' + quotation.id, 14, 28);
  let y = 40;
  items.forEach((it, idx) => {
    doc.text(`${idx+1}. ${it.name} - ${it.qty} x ${it.unit_price} = ${it.line_total}`, 14, y);
    y += 8;
  });
  doc.text(`Total: ${quotation.total}`, 14, y+8);
  return doc.output('blob');
}
