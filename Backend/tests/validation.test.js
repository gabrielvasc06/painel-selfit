const assert = require('node:assert/strict');
const test = require('node:test');
const { isDate } = require('../src/models/regras/datas');

test('datas reais respeitam anos bissextos e limites do DATE do MySQL', () => {
    for (const value of ['2024-02-29', '2026-12-31', '2000-02-29']) assert.equal(isDate(value), true, value);
    for (const value of ['2026-02-29', '2026-02-31', '2026-04-31', '2026-00-10', '2026-13-01', '2026-01-00', '0999-01-01', '20/10/2026', null, 20261020]) {
        assert.equal(isDate(value), false, String(value));
    }
});
