export async function detectFileIntent(message) {
  const res = await fetch('/api/detect-intent', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message }),
  });

  const data = await res.json();
  return data.intent; // "pdf", "xlsx", "docx", "none"
}

export async function generateDocx(content) {
  const doc = new Document({
    sections: [
      {
        children: [
          new Paragraph({
            children: [new TextRun(content)],
          }),
        ],
      },
    ],
  });

  const blob = await Packer.toBlob(doc);
  saveAs(blob, 'output.docx');
}

export function generateExcel(markdownTable) {
  const rows = markdownTable
    .trim()
    .split('\n')
    .filter(r => r.includes('|'))
    .map(r => r.split('|').map(cell => cell.trim()).filter(Boolean));

  const [headers, ...dataRows] = rows;
  const worksheetData = [headers, ...dataRows];

  const worksheet = XLSX.utils.aoa_to_sheet(worksheetData);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Foglio1');

  const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
  const blob = new Blob([excelBuffer], { type: 'application/octet-stream' });
  const url = window.URL.createObjectURL(blob);

  const a = document.createElement('a');
  a.href = url;
  a.download = 'output.xlsx';
  a.click();
  window.URL.revokeObjectURL(url);
}


