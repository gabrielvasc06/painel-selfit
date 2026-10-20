const jwt = require('jsonwebtoken');

module.exports = {
    sign: (claims) => jwt.sign(claims, process.env.JWT_SECRET, { algorithm: 'HS256', expiresIn: '8h' }),
    verify: (token) => jwt.verify(token, process.env.JWT_SECRET, { algorithms: ['HS256'] }),
};
