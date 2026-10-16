import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import ts from 'typescript';
// Executa o modulo real usado pela interface, sem copiar as regras para o teste.
const source = fs.readFileSync(new URL('../src/services/inventory/inventoryLogic.ts', import.meta.url), 'utf8');
const { outputText } = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2020 } });
const logic = await import(`data:text/javascript;base64,${Buffer.from(outputText).toString('base64')}`);
test('isola inventario de TVs, cameras e equipamentos pelos identificadores reais', () => {
  const rows = [
    { id: 'TV:1', tipo_modulo: 'TV', categoria: 'TV' },
    { id: 'CAMERA:1', tipo_modulo: 'CAMERA', categoria: 'CAMERAS' },
    { id: 'EQUIPAMENTO:1', tipo_modulo: 'EQUIPAMENTO', categoria: 'TOTEM' },
  ];
  assert.deepEqual(logic.filterEquipamentosByModulo(rows, 'tvs').map((item) => item.id), ['TV:1']);
  assert.deepEqual(logic.filterEquipamentosByModulo(rows, 'cameras').map((item) => item.id), ['CAMERA:1']);
  assert.deepEqual(logic.filterEquipamentosByModulo(rows, 'equipamentos').map((item) => item.id), ['EQUIPAMENTO:1']);
});
test('mantem categorias validas e rejeita entradas que nao pertencem ao cadastro', () => {
  assert.deepEqual(logic.getSafeEquipmentCategories(['TV', 'CAMERAS', 'TOTEM', 'SERVIDOR', '<script>']), ['TV', 'CAMERAS', 'TOTEM']);
});
test('normaliza nomes, numeros e busca sem diferenciar acentos', () => {
  assert.equal(logic.normalizeUnitName('  Recife II  '), 'RECIFE 2');
  assert.equal(logic.normalizeUnitNumber('00010'), '10');
  assert.equal(logic.normalizeUnitNumber('000'), 'S/N');
  assert.equal(logic.matchesUnidadeSearch('sao', 'SÃO PAULO'), true);
});
test('importa CSV real, preserva zeros e infere UF pelo endereco', () => {
  const [row] = logic.parseUnidadesCsv('nome;cnpj;cep;cidade;bairro;rua;numero\nTESTE;12345678000190;50000000;Recife;CENTRO;RUA TESTE;0010');
  assert.equal(row.nome, 'TESTE');
  assert.equal(row.numero, '10');
  assert.equal(row.estado, 'PE');
  assert.equal(row.erro, undefined);
});
test('marca registros incompletos e franquias antes da importacao', () => {
  const rows = logic.parseUnidadesRows([{ nome: '', cnpj: '1' }, { nome: 'TESTE', tipo: 'FRANQUIA' }]);
  assert.ok(rows[0].erro);
  assert.match(rows[1].erro, /franqueadas/);
});
