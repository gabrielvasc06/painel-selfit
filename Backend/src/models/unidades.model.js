const { BusinessError } = require('./regras/erro-negocio');
const { prepareUnitBatch } = require('./regras/unidades');

function createUnitModel({ unitRepository }) {
    return {
        list: (filters) => unitRepository.list(filters),
        async create(unit) {
            if (await unitRepository.findByCnpj(unit.cnpj)) throw new BusinessError('INVALID_INPUT', 'Ja existe uma unidade cadastrada com este CNPJ.');
            await unitRepository.create(unit);
        },
        async update(id, unit) {
            if (!(await unitRepository.findById(id))) throw new BusinessError('NOT_FOUND', 'Unidade nao encontrada.');
            if (await unitRepository.findByCnpj(unit.cnpj, id)) throw new BusinessError('INVALID_INPUT', 'Ja existe uma unidade cadastrada com este CNPJ.');
            await unitRepository.update(id, unit);
        },
        async remove(id) {
            if (!(await unitRepository.remove(id))) throw new BusinessError('NOT_FOUND', 'Unidade nao encontrada.');
        },
        async importBatch(rows) {
            const prepared = prepareUnitBatch(rows);
            const result = await unitRepository.importBatch(prepared);
            if (result.duplicate) throw new BusinessError('CONFLICT', `CNPJ da unidade ${result.duplicate.nome} ja cadastrado.`);
            return prepared.length;
        },
    };
}
module.exports = { createUnitModel };
