import readXlsxFile from 'read-excel-file/node';

const workbook = await readXlsxFile('C:/Users/vanderson.gabriel/Downloads/UNIDADES.xlsx');
const ownSheet = workbook.find((sheet) => sheet.sheet === 'PRÓPRIAS');
const [headers, ...rows] = ownSheet.data;
const indexes = {
  nome: headers.indexOf('UNIDADE'),
  cnpj: headers.indexOf('CNPJ'),
  endereco: headers.indexOf('ENDEREÇO'),
  data: headers.indexOf('DATA INAUGURAÇÃO'),
  mes: headers.indexOf('MÊS/ANO INAUGURAÇÃO'),
};

function normalize(value) {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase();
}

function isBlocked(value) {
  return ['PRE OPERACIONAL', 'FECHADA', 'WEBURN', 'GALPAO'].some((blocked) => normalize(value).includes(blocked));
}

const pattern = /HOLDING|MATRIZ|ESCRIT|ADM|ADMIN|CORPORAT|SEDE|RECIFE|WE BURN|WEBURN|GALP|DOMINGOS FERREIRA|CARREFOUR/;
const active = rows
  .map((row, index) => ({
    linha: index + 2,
    nome: row[indexes.nome],
    cnpj: row[indexes.cnpj],
    endereco: row[indexes.endereco],
    data: String(row[indexes.data] ?? ''),
    mes: String(row[indexes.mes] ?? ''),
  }))
  .filter((row) => !isBlocked(`${row.data} ${row.mes}`));

console.log(JSON.stringify({
  total_ativas: active.length,
  candidatas: active.filter((row) => pattern.test(normalize(`${row.nome} ${row.endereco}`))),
}, null, 2));
