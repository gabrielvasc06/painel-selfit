const fs = require('node:fs');
const path = require('node:path');
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const { rateLimit } = require('express-rate-limit');
const { createCorsOptions } = require('./config/cors');
const mysql = require('./config/db');
const { networkAccess, userAdministration } = require('./middleware/access');

function createApp({ database = mysql, staticDir = path.resolve(__dirname, '../../dist') } = {}) {
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
        api.use('/api-docs', swaggerUi.serve, swaggerUi.setup(require('./docs/swaggerConfig')));
    }
    api.use('/auth', rateLimit({
        windowMs: 15 * 60 * 1000,
        limit: 30,
        standardHeaders: 'draft-8',
        legacyHeaders: false,
        skipSuccessfulRequests: true,
        message: { sucesso: false, mensagem: 'Muitas tentativas de login. Tente novamente mais tarde.' },
    }));
    api.use(require('./routes/autenticacao/autenticador-usuarios'));
    api.use(require('./middleware/auth'));
    api.get('/session', (req, res) => res.json({ sucesso: true, dados: { usuario: req.usuarioLogado.usuario } }));
    api.post('/register', userAdministration);
    for (const route of [
        './routes/cadastros/cadastro-usuarios',
        './routes/cadastros/cadastro-unidades',
        './routes/cadastros/cadastro-equipamentos',
        './routes/cadastros/cadastro-manutencoes',
        './routes/consultas/consulta-equipamentos',
        './routes/consultas/consulta-garantias',
        './routes/consultas/consulta-manutencoes',
        './routes/atualizacao-exclusao/atualizacao-equipamento',
        './routes/atualizacao-exclusao/exclusao-equipamento',
    ]) api.use(require(route));
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

module.exports = { createApp };
