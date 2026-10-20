const { createInventoryModel } = require('../models/equipamentos.model');
const { createUnitModel } = require('../models/unidades.model');
const { createMaintenanceModel } = require('../models/manutencoes.model');
const { createAuthModel } = require('../models/autenticacao.model');
const { createUserModel } = require('../models/usuarios.model');
const { createInventoryRepository } = require('../models/repositories/equipamentos.repository');
const { createUnitRepository } = require('../models/repositories/unidades.repository');
const { createMaintenanceRepository } = require('../models/repositories/manutencoes.repository');
const { createUserRepository } = require('../models/repositories/usuarios.repository');
const passwords = require('./security/passwords');
const tokens = require('./security/tokens');
const { isAllowedUser } = require('../routes/middlewares/access');

// Unico ponto de composicao: conecta implementacoes externas aos contratos da
// aplicacao. Nenhum model instancia um pool, le .env ou importa este arquivo.
function createContainer(database) {
    const inventoryRepository = createInventoryRepository(database);
    const unitRepository = createUnitRepository(database);
    const maintenanceRepository = createMaintenanceRepository(database);
    const userRepository = createUserRepository(database);
    return {
        inventory: createInventoryModel({ inventoryRepository, unitRepository }),
        units: createUnitModel({ unitRepository }),
        maintenance: createMaintenanceModel({ maintenanceRepository, inventoryRepository }),
        auth: createAuthModel({ userRepository, passwords, tokens, accessPolicy: { isAllowedUser } }),
        users: createUserModel({ userRepository, passwords }),
    };
}
module.exports = { createContainer };
