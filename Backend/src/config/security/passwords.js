const bcrypt = require('bcrypt');

// O algoritmo de hash pertence a infraestrutura; os models so conhecem
// as operacoes hash/compare e podem receber um adaptador diferente nos testes.
module.exports = {
    hash: (password) => bcrypt.hash(password, 12),
    compare: (password, hash) => bcrypt.compare(password, hash),
};
