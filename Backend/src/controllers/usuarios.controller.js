module.exports = function createUserController(users) {
    return {
        async create(req, res) {
            await users.create(req.body);
            res.status(201).json({ sucesso: true, message: 'Usuario cadastrado com sucesso!' });
        },
    };
};
