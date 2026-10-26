const assert = require('node:assert/strict');
const test = require('node:test');
const { createInventoryModel } = require('../src/models/equipamentos.model');
const { createMaintenanceModel } = require('../src/models/manutencoes.model');
const { prepareUnitBatch } = require('../src/models/regras/unidades');
const { normalizarIdentificadores, IDENTIFICADOR_NAO_INFORMADO } = require('../src/models/regras/identificadores');

test('identificadores preservam zeros, aceitam ausencia e rejeitam tipos e tamanhos invalidos', () => {
    assert.deepEqual(normalizarIdentificadores({ numero_serie: ' 00abc-123 ', numero_patrimonio: '00012' }), { numero_serie: '00ABC-123', numero_patrimonio: '00012' });
    assert.deepEqual(normalizarIdentificadores({ numero_serie: '  ', numero_patrimonio: null }), { numero_serie: IDENTIFICADOR_NAO_INFORMADO, numero_patrimonio: IDENTIFICADOR_NAO_INFORMADO });
    assert.deepEqual(normalizarIdentificadores({ marca: 'TESTE' }), {});
    for (const field of ['numero_serie', 'numero_patrimonio']) {
        for (const value of [123, false, {}, [], 'a'.repeat(101)]) {
            assert.throws(() => normalizarIdentificadores({ [field]: value }), { code: 'INVALID_INPUT' });
        }
    }
});

test('cadastro antigo continua valido e edicao parcial nao apaga identificadores omitidos', async () => {
    let inserted, updated;
    const model = createInventoryModel({
        inventoryRepository: {
            create: async (type, values) => { inserted = values; },
            findActive: async () => ({ id: 1, unidade_id: 20 }),
            update: async (ref, values) => { updated = values; },
        },
        unitRepository: { findByName: async () => [{ id: 20 }] },
    });
    await model.create({ unidade_nome: 'TESTE', categoria: 'TV' });
    assert.equal(inserted.numero_serie, IDENTIFICADOR_NAO_INFORMADO);
    assert.equal(inserted.numero_patrimonio, IDENTIFICADOR_NAO_INFORMADO);
    await model.update('TV:1', { marca: 'TESTE' });
    assert.deepEqual(updated, { marca: 'TESTE' });
    await model.update('TV:1', { numero_serie: ' 001ab ', numero_patrimonio: null });
    assert.deepEqual(updated, { numero_serie: '001AB', numero_patrimonio: IDENTIFICADOR_NAO_INFORMADO });
});

test('salvar um item preserva sua unidade quando existem nomes iguais', async () => {
    let saved;
    const useCases = createInventoryModel({
        inventoryRepository: { findActive: async () => ({ id: 1, unidade_id: 20 }), update: async (ref, values) => { saved = { ref, values }; } },
        unitRepository: { findByName: async () => [{ id: 10 }, { id: 20 }] },
    });
    await useCases.update('TV:1', { unidade_nome: 'CENTRO', marca: 'TESTE' });
    assert.equal(saved.values.unidade_id, 20);
    assert.equal(saved.ref.tipo, 'TV');
});

test('transferencia ambigua e troca de modulo nao gravam alteracoes', async () => {
    let writes = 0;
    const useCases = createInventoryModel({
        inventoryRepository: { findActive: async () => ({ id: 1, unidade_id: 30 }), update: async () => { writes++; } },
        unitRepository: { findByName: async () => [{ id: 10 }, { id: 20 }] },
    });
    await assert.rejects(useCases.update('TV:1', { unidade_nome: 'CENTRO' }), { code: 'CONFLICT' });
    await assert.rejects(useCases.update('TV:1', { categoria: 'FIREWALL' }), { code: 'INVALID_INPUT' });
    assert.equal(writes, 0);
});

test('manutencao exige que o item pertenca a unidade escolhida', async () => {
    let writes = 0;
    const useCases = createMaintenanceModel({
        inventoryRepository: { findActive: async () => ({ id: 1, unidade_id: 20 }) },
        maintenanceRepository: { create: async () => { writes++; } },
    });
    await assert.rejects(useCases.create({ equipamento_id: 'CAMERA:1', unidade_id: 10, descricao: 'TESTE', data_envio: '2026-10-20' }), { code: 'INVALID_INPUT' });
    assert.equal(writes, 0);
});

test('importacao detecta duplicidade antes de persistir qualquer linha', () => {
    const row = { nome: 'TESTE', tipo_unidade: 'PROPRIA', cnpj: '12345678000190', cep: '50000000', uf: 'PE', bairro: 'CENTRO', rua: 'RUA TESTE', numero: '0010' };
    assert.throws(() => prepareUnitBatch([row, row]), { code: 'INVALID_INPUT' });
    assert.equal(prepareUnitBatch([row])[0].numero, '10');
});
