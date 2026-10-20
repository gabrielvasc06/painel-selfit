const { BusinessError } = require('./regras/erro-negocio');
const { parseItemRef } = require('./regras/equipamentos');

function createMaintenanceModel({ maintenanceRepository, inventoryRepository }) {
    async function activeItem(ref) {
        const item = ref && await inventoryRepository.findActive(ref);
        if (!item) throw new BusinessError('NOT_FOUND', 'Item nao encontrado ou removido.');
        return item;
    }
    return {
        async create(input) {
            const ref = parseItemRef(input.equipamento_id);
            if (!ref || !input.unidade_id || !input.descricao || !input.data_envio) {
                throw new BusinessError('INVALID_INPUT', 'equipamento_id, unidade_id, descricao e data_envio sao obrigatorios.');
            }
            const item = await activeItem(ref);
            if (Number(item.unidade_id) !== Number(input.unidade_id)) {
                throw new BusinessError('INVALID_INPUT', 'O item selecionado nao pertence a unidade informada.');
            }
            // A referencia polimorfica e sempre o par tipo + ID. Usar so o ID
            // pode vincular a manutencao a um item de outro modulo.
            return maintenanceRepository.create({ item_tipo: ref.tipo, item_id: ref.id,
                descricao: input.descricao, data_envio: input.data_envio,
                data_retorno: input.data_retorno ?? null, custo: input.custo ?? null,
                status_manutencao: input.status_manutencao ?? 'ABERTA' });
        },
        async update(id, input) {
            const allowed = ['equipamento_id', 'descricao', 'data_envio', 'data_retorno', 'custo', 'status_manutencao'];
            const updates = Object.fromEntries(Object.entries(input).filter(([key]) => allowed.includes(key)));
            if (!Object.keys(updates).length) throw new BusinessError('INVALID_INPUT', 'Nenhum campo valido foi enviado.');
            if (!(await maintenanceRepository.findById(id))) throw new BusinessError('NOT_FOUND', 'Manutencao nao encontrada.');
            if (updates.equipamento_id !== undefined) {
                const ref = parseItemRef(updates.equipamento_id);
                await activeItem(ref);
                Object.assign(updates, { item_tipo: ref.tipo, item_id: ref.id });
                delete updates.equipamento_id;
            }
            await maintenanceRepository.update(id, updates);
        },
        async remove(id) {
            if (!(await maintenanceRepository.remove(id))) throw new BusinessError('NOT_FOUND', 'Manutencao nao encontrada.');
        },
    };
}
module.exports = { createMaintenanceModel };
