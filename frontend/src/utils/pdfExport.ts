type PdfColumn = { label: string; weight?: number };

const cleanText = (value: unknown) => String(value ?? '')
  .normalize('NFKD')
  .replace(/[\u0300-\u036f]/g, '')
  .replace(/[–—]/g, '-')
  .replace(/[“”]/g, '"')
  .replace(/[‘’]/g, "'")
  .replace(/·/g, ' | ')
  .replace(/₱/g, 'PHP ')
  .replace(/[\r\n\t]+/g, ' ')
  .replace(/[^\x20-\x7E]/g, '?')
  .trim();

const escapePdf = (value: string) => value.replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');
const textCommand = (text: string, x: number, y: number, size: number, bold = false) =>
  'BT /' + (bold ? 'F2' : 'F1') + ' ' + size + ' Tf ' + x.toFixed(2) + ' ' + y.toFixed(2) + ' Td (' + escapePdf(text) + ') Tj ET';

function wrapText(value: unknown, maxCharacters: number) {
  const text = cleanText(value);
  if (!text) return [''];
  const lines: string[] = [];
  let line = '';
  for (const word of text.split(/\s+/)) {
    if (word.length > maxCharacters) {
      if (line) { lines.push(line); line = ''; }
      for (let offset = 0; offset < word.length; offset += maxCharacters) lines.push(word.slice(offset, offset + maxCharacters));
      continue;
    }
    const next = line ? line + ' ' + word : word;
    if (next.length > maxCharacters && line) { lines.push(line); line = word; }
    else line = next;
  }
  if (line) lines.push(line);
  return lines.length ? lines : [''];
}

export function downloadPdfTable(title: string, subtitle: string, labels: string[], data: unknown[][], filename: string) {
  const columns: PdfColumn[] = labels.map((label, index) => {
    const sampleLength = data.slice(0, 24).reduce((longest, row) => Math.max(longest, cleanText(row[index]).length), 0);
    const preferred = Math.max(cleanText(label).length, Math.min(sampleLength, 28));
    return { label, weight: Math.max(8, Math.min(30, preferred * 0.72)) };
  });
  const pageWidth = 842;
  const pageHeight = 595;
  const margin = 28;
  const tableWidth = pageWidth - margin * 2;
  const weights = columns.map(column => column.weight || 8);
  const totalWeight = weights.reduce((sum, weight) => sum + weight, 0);
  const widths = weights.map(weight => tableWidth * weight / totalWeight);
  const fontSize = columns.length > 10 ? 5.6 : columns.length > 7 ? 6.5 : 8;
  const lineHeight = fontSize * 1.25;
  const bottomLimit = 32;
  const pageCommands: string[][] = [];
  let commands: string[] = [];
  let y = 0;
  let page = 0;

  const drawCell = (x: number, top: number, width: number, height: number, lines: string[], bold: boolean, size: number) => {
    const cellBottom = top - height;
    commands.push('0.78 0.82 0.87 RG 0.45 w ' + x.toFixed(2) + ' ' + cellBottom.toFixed(2) + ' ' + width.toFixed(2) + ' ' + height.toFixed(2) + ' re S');
    lines.forEach((line, index) => {
      const baseline = top - 4 - size - index * lineHeight;
      commands.push(textCommand(line, x + 3, baseline, size, bold));
    });
  };

  const drawColumnHeader = () => {
    const headerLines = columns.map((column, index) => wrapText(column.label, Math.max(7, Math.floor((widths[index] - 6) / (fontSize * 0.52)))));
    const headerHeight = Math.max(2, ...headerLines.map(lines => lines.length)) * lineHeight + 8;
    let x = margin;
    headerLines.forEach((lines, index) => {
      const width = widths[index];
      const cellBottom = y - headerHeight;
      commands.push('0.91 0.94 0.97 rg ' + x.toFixed(2) + ' ' + cellBottom.toFixed(2) + ' ' + width.toFixed(2) + ' ' + headerHeight.toFixed(2) + ' re f');
      commands.push('0.15 0.22 0.32 rg');
      drawCell(x, y, width, headerHeight, lines, true, fontSize);
      x += width;
    });
    y -= headerHeight;
  };

  const startPage = (continued = false) => {
    page += 1;
    commands = [];
    pageCommands.push(commands);
    commands.push('0.12 0.20 0.34 rg');
    commands.push(textCommand(continued ? cleanText(title) + ' - continued' : cleanText(title), margin, pageHeight - 35, continued ? 11 : 16, true));
    commands.push('0.32 0.38 0.46 rg');
    if (subtitle) commands.push(textCommand(cleanText(subtitle).slice(0, 150), margin, pageHeight - 52, 8));
    commands.push(textCommand(cleanText('Generated ' + new Date().toLocaleString()), margin, pageHeight - 66, 7));
    y = pageHeight - 78;
    drawColumnHeader();
  };

  startPage();
  const rows = data.length ? data : [[labels.length ? 'No records found.' : 'No records found.']];
  for (const row of rows) {
    const cellLines = columns.map((_, index) => wrapText(row[index], Math.max(7, Math.floor((widths[index] - 6) / (fontSize * 0.52)))));
    const rowLineCount = Math.max(1, ...cellLines.map(lines => lines.length));
    let offset = 0;
    while (offset < rowLineCount) {
      const availableLines = Math.floor((y - bottomLimit - 6) / lineHeight);
      if (availableLines < 1) { startPage(true); continue; }
      const count = Math.min(availableLines, rowLineCount - offset);
      const height = count * lineHeight + 6;
      let x = margin;
      cellLines.forEach((lines, index) => {
        drawCell(x, y, widths[index], height, lines.slice(offset, offset + count), false, fontSize);
        x += widths[index];
      });
      y -= height;
      offset += count;
      if (offset < rowLineCount) startPage(true);
    }
  }

  pageCommands.forEach((pageContent, index) => {
    pageContent.push('0.38 0.42 0.48 rg');
    pageContent.push(textCommand('Page ' + (index + 1) + ' of ' + pageCommands.length, pageWidth - margin - 55, 16, 7));
  });

  const objects: string[] = [];
  objects[1] = '<< /Type /Catalog /Pages 2 0 R >>';
  const pageIds = pageCommands.map((_, index) => 5 + index * 2);
  objects[2] = '<< /Type /Pages /Kids [' + pageIds.map(id => id + ' 0 R').join(' ') + '] /Count ' + pageIds.length + ' >>';
  objects[3] = '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>';
  objects[4] = '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>';
  pageCommands.forEach((pageContent, index) => {
    const pageId = 5 + index * 2;
    const contentId = pageId + 1;
    const stream = pageContent.join('\n');
    objects[pageId] = '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ' + pageWidth + ' ' + pageHeight + '] /Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> /Contents ' + contentId + ' 0 R >>';
    objects[contentId] = '<< /Length ' + stream.length + ' >>\nstream\n' + stream + '\nendstream';
  });

  let pdf = '%PDF-1.4\n% BJMP report\n';
  const offsets: number[] = [0];
  for (let id = 1; id < objects.length; id += 1) {
    offsets[id] = pdf.length;
    pdf += id + ' 0 obj\n' + objects[id] + '\nendobj\n';
  }
  const xrefOffset = pdf.length;
  pdf += 'xref\n0 ' + objects.length + '\n0000000000 65535 f \n';
  for (let id = 1; id < objects.length; id += 1) pdf += String(offsets[id]).padStart(10, '0') + ' 00000 n \n';
  pdf += 'trailer\n<< /Size ' + objects.length + ' /Root 1 0 R >>\nstartxref\n' + xrefOffset + '\n%%EOF';

  const blob = new Blob([pdf], { type: 'application/pdf' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename.toLowerCase().endsWith('.pdf') ? filename : filename + '.pdf';
  anchor.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}
