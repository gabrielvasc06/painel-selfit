require('dotenv').config();
const express = require('express');
const cors = require('cors');

const app = express();
const port = process.env.PORT;

app.use(cors({
    origin: process.env.FRONT
}));

app.use(express.json());

if (process.env.NODE_ENV !== 'production') {
    const swaggerUi = require('swagger-ui-express');
    const swaggerSpec = require('./docs/swaggerConfig');

    app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));
    console.log('Documentação disponível em /api-docs (Ambiente de Desenvolvimento)');
}

const autenticador = require('./routes/autenticacao/autenticador-usuarios');

const cadastroUsuarios = require('./routes/cadastros/cadastro-usuarios');
const cadastroUnidades = require('./routes/cadastros/cadastro-unidades');
const cadastroEquipamentos = require('./routes/cadastros/cadastro-equipamentos');
const cadastroManutencoes = require('./routes/cadastros/cadastro-manutencoes');

const consultaEquipamentos = require('./routes/consultas/consulta-equipamentos');
const consultaGarantias = require('./routes/consultas/consulta-garantias');
const consultaManutencoes = require('./routes/consultas/consulta-manutencoes');

const atualizacaoEquipamentos = require('./routes/atualizacao-exclusao/atualizacao-equipamento');
const exclusaoEquipamentos = require('./routes/atualizacao-exclusao/exclusao-equipamento');

const verificarToken = require('./middleware/auth');

app.use(autenticador);

app.use(verificarToken);

app.use(cadastroUsuarios);
app.use(cadastroUnidades);
app.use(cadastroEquipamentos);
app.use(cadastroManutencoes);

app.use(consultaEquipamentos);
app.use(consultaGarantias);
app.use(consultaManutencoes);

app.use(atualizacaoEquipamentos);
app.use(exclusaoEquipamentos);

app.listen(port, () => {
    console.log(`Aplicação rodando na porta ${port}.`);
});