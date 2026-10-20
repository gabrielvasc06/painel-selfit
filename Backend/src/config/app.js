const pool = require('./database');
const { createContainer } = require('./container');
const { createHttpApp } = require('./http');

function createApp({ database = pool, healthDatabase = database, models = createContainer(database), staticDir } = {}) {
    return createHttpApp({ database: healthDatabase, models, staticDir });
}
module.exports = { createApp };
