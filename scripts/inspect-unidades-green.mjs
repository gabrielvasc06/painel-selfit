// Arquivo: scripts/inspect-unidades-green.mjs
// Serve para: inspeciona linhas verdes das planilhas para entender status de unidades.

import fs from 'node:fs';
import readXlsxFile from 'read-excel-file/node';

const styles = fs.readFileSync('.tmp_unidades_xlsx/xl/styles.xml', 'utf8');
const cellXfs = styles.match(/<cellXfs[\s\S]*?<\/cellXfs>/)?.[0] ?? '';
const xfs = [...cellXfs.matchAll(/<xf\b([^>]*)/g)].map((match) => match[1]);
const greenStyles = new Set(
  xfs
    .map((attrs, index) => (/\bfillId="7"/.test(attrs) ? index : null))
    .filter((value) => value !== null),
);

const sheetXml = fs.readFileSync('.tmp_unidades_xlsx/xl/worksheets/sheet1.xml', 'utf8');
const greenRows = new Set();
for (const match of sheetXml.matchAll(/<c\s+([^>]*)/g)) {
  const attrs = match[1];
  const style = attrs.match(/\bs="(\d+)"/);
  const row = attrs.match(/\br="[A-Z]+(\d+)"/);
  if (style && row && greenStyles.has(Number(style[1]))) greenRows.add(Number(row[1]));
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

console.log(JSON.stringify({
  greenStyles: [...greenStyles],
  greenRows: [...greenRows].sort((left, right) => left - right).filter((row) => row > 1).map((row) => {
    const values = rows[row - 2];
    return {
      linha: row,
      nome: values[indexes.nome],
      cnpj: values[indexes.cnpj],
      data: values[indexes.data],
      mes: values[indexes.mes],
    };
  }),
}, null, 2));
