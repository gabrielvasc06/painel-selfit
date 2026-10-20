const { BusinessError } = require('./regras/erro-negocio');
const { parseItemRef, resolveItemType } = require('./regras/equipamentos');

// Os repositorios chegam por parametro. Estes models nao importam banco,
// Express ou configuracao: a mesma regra pode ser chamada por HTTP ou testes.
function createInventoryModel({ inventoryRepository, unitRepository }) {
    return {
        list: (filters) => inventoryRepository.list(filters),
        async create(input) {
            const units = await unitRepository.findByName(input.unidade_nome, input.unidade_uf);
            if (!units.length) throw new BusinessError('INVALID_INPUT', 'A unidade informada nao esta cadastrada no sistema.');
            if (units.length > 1) throw new BusinessError('CONFLICT', 'Mais de uma unidade corresponde ao nome e UF informados. Revise o cadastro de unidades.');
            const type = resolveItemType(input.categoria);
            await inventoryRepository.create(type, { unidade_id: units[0].id,
                nome_identificacao: input.nome_identificacao, categoria: input.categoria,
                marca: input.marca, status: input.status, data_garantia: input.data_garantia });
            return type;
        },
        async update(id, input) {
            const allowed = new Set(['unidade_nome', 'nome_identificacao', 'categoria', 'marca', 'status', 'data_garantia']);
            if (Object.keys(input).some((field) => !allowed.has(field))) {
                throw new BusinessError('INVALID_INPUT', 'A requisicao contem campos que nao pertencem ao cadastro atual.');
            }
            const ref = parseItemRef(id);
            if (!ref) throw new BusinessError('INVALID_INPUT', 'Identificador invalido.');
            if (input.categoria && resolveItemType(input.categoria) !== ref.tipo) {
                throw new BusinessError('INVALID_INPUT', 'A categoria deve pertencer ao modulo atual do item.');
            }
            const current = await inventoryRepository.findActive(ref);
            if (!current) throw new BusinessError('NOT_FOUND', 'Item nao encontrado ou inativo.');
            const updates = { ...input };
            if (updates.unidade_nome) {
                const units = await unitRepository.findByName(updates.unidade_nome);
                if (!units.length) throw new BusinessError('INVALID_INPUT', 'A unidade informada nao esta cadastrada no sistema.');
                // Nomes nao sao chaves unicas. Ao salvar a unidade atual, preserve
                // seu ID para nao transferir o item para uma homonima de outro estado.
                const selected = units.find((unit) => Number(unit.id) === Number(current.unidade_id));
                if (!selected && units.length > 1) throw new BusinessError('CONFLICT', 'Nome de unidade ambiguo. Revise o cadastro antes de transferir o item.');
                updates.unidade_id = (selected || units[0]).id;
                delete updates.unidade_nome;
            }
            if (!Object.keys(updates).length) throw new BusinessError('INVALID_INPUT', 'Nenhum dado foi enviado para atualizacao.');
            await inventoryRepository.update(ref, updates);
        },
        async remove(id) {
            const ref = parseItemRef(id);
            if (!ref) throw new BusinessError('INVALID_INPUT', 'Identificador invalido.');
            if (!(await inventoryRepository.findActive(ref))) throw new BusinessError('NOT_FOUND', 'Item nao encontrado ou ja foi excluido.');
            // Exclusao logica preserva os vinculos e o historico de manutencoes.
            await inventoryRepository.softDelete(ref);
        },
    };
}
module.exports = { createInventoryModel };
