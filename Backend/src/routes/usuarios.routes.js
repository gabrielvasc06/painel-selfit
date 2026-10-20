const express = require('express');

// Rotas definem somente URL, middleware e controller; nao executam SQL.
module.exports = function routes(model) {
    const router = express.Router();
    const controller = require('../controllers/usuarios.controller')(model);
    router.post('/register', controller.create);
    return router;
};
