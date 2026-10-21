const jwt = require('jsonwebtoken');

function autenticarToken(req, res, next) {
    const cabecalho = req.headers.authorization;

    if (!cabecalho || !cabecalho.startsWith('Bearer ')) {
        return res.status(401).json({
            erro: 'Token de autenticação não informado.'
        });
    }

    const token = cabecalho.split(' ')[1];

    try {
        const dados = jwt.verify(token, process.env.JWT_SECRET);
        req.usuario = dados;
        next();
    } catch (erro) {
        return res.status(401).json({
            erro: 'Token inválido ou expirado.'
        });
    }
}

function exigirAdministrador(req, res, next) {
    if (!req.usuario || req.usuario.tipo !== 'administrador') {
        return res.status(403).json({
            erro: 'Acesso permitido somente para administradores.'
        });
    }

    next();
}

module.exports = {
    autenticarToken,
    exigirAdministrador
};
