const { createContainer } = require('./container');
const { createHttpApp } = require('./http');

function createApp({ database = require('./database'), healthDatabase = database, models = createContainer(database), staticDir } = {}) {
    return createHttpApp({ database: healthDatabase, models, staticDir });
}
module.exports = { createApp };
