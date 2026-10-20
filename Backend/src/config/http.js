const fs = require('node:fs');
const path = require('node:path');
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const { rateLimit } = require('express-rate-limit');
const { createCorsOptions } = require('./cors');
const { BusinessError } = require('../models/regras/erro-negocio');
const { networkAccess, userAdministration } = require('../routes/middlewares/access');

// Dependencias chegam prontas de config/app.js; o transporte nao cria o banco.
function createHttpApp({ database, models, staticDir = path.resolve(__dirname, '../../../Frontend/dist') }) {
    const app = express();
    const production = process.env.NODE_ENV === 'production';
    app.disable('x-powered-by');
    // Confiar somente nos IPs/sub-redes dos proxies realmente administrados pelo TI.
    if (process.env.TRUST_PROXY) app.set('trust proxy', process.env.TRUST_PROXY.split(',').map((v) => v.trim()));
    app.use(helmet({
        contentSecurityPolicy: production ? {
            directives: {
                'connect-src': ["'self'", 'https://viacep.com.br'],
                'upgrade-insecure-requests': null,
            },
        } : false,
        // HTTPS e HSTS sao configurados no proxy da empresa/nuvem.
        strictTransportSecurity: false,
    }));
    app.use(networkAccess());
    app.use((req, res, next) => {
        if (req.path.split('/').some((part) => part.startsWith('.'))) {
            return res.status(404).json({ sucesso: false, mensagem: 'Rota nao encontrada.' });
        }
        next();
    });
    app.use(cors(createCorsOptions()));
    app.use(express.json({ limit: '2mb' }));
    app.use((req, res, next) => { req.body ??= {}; next(); });

    const api = express.Router();
    api.use((req, res, next) => { res.set('Cache-Control', 'no-store'); next(); });
    api.get('/health', (req, res) => res.json({ sucesso: true, status: 'ok' }));
    api.get('/ready', async (req, res) => {
        try {
            await database.query({ sql: 'SELECT 1', timeout: 5000 });
            res.json({ sucesso: true, status: 'ready' });
        } catch {
            res.status(503).json({ sucesso: false, status: 'unavailable' });
        }
    });
    if (!production) {
        const swaggerUi = require('swagger-ui-express');
        api.use('/api-docs', swaggerUi.serve, swaggerUi.setup(require('./swagger')));
    }
    api.use('/auth', rateLimit({
        windowMs: 15 * 60 * 1000,
        limit: 30,
        standardHeaders: 'draft-8',
        legacyHeaders: false,
        skipSuccessfulRequests: true,
        message: { sucesso: false, mensagem: 'Muitas tentativas de login. Tente novamente mais tarde.' },
    }));
    api.use(require('../routes/autenticacao.routes')(models.auth));
    api.use(require('../routes/middlewares/auth')(models.auth));
    api.get('/session', (req, res) => res.json({ sucesso: true, dados: { usuario: req.usuarioLogado.usuario } }));
    api.post('/register', userAdministration);
    api.use(require('../routes/usuarios.routes')(models.users));
    api.use(require('../routes/unidades.routes')(models.units));
    api.use(require('../routes/equipamentos.routes')(models.inventory));
    api.use(require('../routes/garantias.routes')(models.inventory));
    api.use(require('../routes/manutencoes.routes')(models.maintenance, models.inventory));
    api.use((req, res) => res.status(404).json({ sucesso: false, mensagem: 'Rota nao encontrada.' }));
    app.use('/api', api);
    // Preserva clientes e scripts que ainda usam os endpoints sem /api.
    app.use((req, res, next) => {
        if (/^\/(auth|register|unidades|equipamentos|manutencoes|session|health|ready|api-docs)(\/|$)/.test(req.path)) {
            return api(req, res, next);
        }
        next();
    });
    if (production) {
        if (!fs.existsSync(path.join(staticDir, 'index.html'))) {
            throw new Error('Frontend compilado ausente. Execute npm run build antes de npm start.');
        }
        app.use('/assets', express.static(path.join(staticDir, 'assets'), { immutable: true, maxAge: '1y', fallthrough: false }));
        app.use(express.static(staticDir, { maxAge: 0, setHeaders: (res) => res.set('Cache-Control', 'no-cache') }));
        app.get('/{*path}', (req, res, next) => {
            if (path.extname(req.path)) return next();
            res.set('Cache-Control', 'no-cache');
            res.sendFile(path.join(staticDir, 'index.html'));
        });
    }
    app.use((req, res) => res.status(404).json({ sucesso: false, mensagem: 'Rota nao encontrada.' }));
    app.use((error, req, res, next) => {
        if (res.headersSent) return next(error);
        if (error instanceof BusinessError) {
            const statuses = { INVALID_INPUT: 400, NOT_FOUND: 404, CONFLICT: 409, UNAUTHENTICATED: 401 };
            // Preserva os dois nomes de mensagem aceitos pelos clientes existentes.
            return res.status(statuses[error.code] || 400).json({ sucesso: false, mensagem: error.message, message: error.message, ...error.details });
        }
        if (error.code === 'ER_DUP_ENTRY' || error.errno === 1062) {
            return res.status(req.path.endsWith('/bulk') ? 409 : 400).json({ sucesso: false, mensagem: 'Registro duplicado.', message: 'Registro duplicado.' });
        }
        const status = error.status >= 400 && error.status < 600 ? error.status : 500;
        if (status >= 500) console.error('Falha na requisicao:', error.code || error.name);
        res.status(status).json({
            sucesso: false,
            mensagem: status === 500 ? 'Erro interno do servidor.' :
                status === 413 ? 'Corpo da requisicao excede o limite permitido.' :
                status === 400 ? 'Requisicao invalida.' :
                status === 403 ? 'Origem nao permitida.' : 'Rota nao encontrada.',
        });
    });
    return app;
}

module.exports = { createHttpApp };
