// Arquivo: scripts/inspect-unidades-fills.mjs
// Serve para: inspeciona preenchimentos e cores das planilhas de unidades.

import fs from 'node:fs';
import readXlsxFile from 'read-excel-file/node';

const styles = fs.readFileSync('.tmp_unidades_xlsx/xl/styles.xml', 'utf8');
const cellXfs = styles.match(/<cellXfs[\s\S]*?<\/cellXfs>/)?.[0] ?? '';
const xfs = [...cellXfs.matchAll(/<xf\b([^>]*)/g)].map((match) => {
  const fill = match[1].match(/\bfillId="(\d+)"/);
  return fill ? Number(fill[1]) : 0;
});

const sheetXml = fs.readFileSync('.tmp_unidades_xlsx/xl/worksheets/sheet1.xml', 'utf8');
const rowFillIds = new Map();
for (const rowMatch of sheetXml.matchAll(/<row\b[^>]*\br="(\d+)"[\s\S]*?<\/row>/g)) {
  const rowNo = Number(rowMatch[1]);
  const fills = new Set();
  for (const cellMatch of rowMatch[0].matchAll(/<c\s+([^>]*)/g)) {
    const style = cellMatch[1].match(/\bs="(\d+)"/);
    if (style) fills.add(xfs[Number(style[1])] ?? 0);
  }
  rowFillIds.set(rowNo, [...fills].sort((a, b) => a - b));
}

const workbook = await readXlsxFile('C:/Users/vanderson.gabriel/Downloads/UNIDADES.xlsx');
const ownSheet = workbook.find((sheet) => sheet.sheet === 'PRÓPRIAS');
const [headers, ...rows] = ownSheet.data;
const indexes = {
  nome: headers.indexOf('UNIDADE'),
  cnpj: headers.indexOf('CNPJ'),
  data: headers.indexOf('DATA INAUGURAÇÃO'),
  mes: headers.indexOf('MÊS/ANO INAUGURAÇÃO'),
};

const byFill = {};
for (let rowIndex = 0; rowIndex < rows.length; rowIndex += 1) {
  const rowNo = rowIndex + 2;
  const key = (rowFillIds.get(rowNo) ?? []).join(',');
  byFill[key] ??= [];
  byFill[key].push({
    linha: rowNo,
    nome: rows[rowIndex][indexes.nome],
    cnpj: rows[rowIndex][indexes.cnpj],
    data: rows[rowIndex][indexes.data],
    mes: rows[rowIndex][indexes.mes],
  });
}

console.log(JSON.stringify(Object.fromEntries(
  Object.entries(byFill).map(([key, values]) => [key, {
    total: values.length,
    exemplos: values.slice(0, 12),
  }]),
), null, 2));
