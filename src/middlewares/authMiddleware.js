
function autenticarSessao(req, res, next) {
    if (!req.session || !req.session.usuario) {
        return res.status(401).json({
            erro: 'Você precisa entrar na sua conta para continuar.'
        });
    }

    next();
}

function exigirFotografo(req, res, next) {
    if (!req.session || !req.session.usuario) {
        return res.status(401).json({
            erro: 'Você precisa entrar na sua conta para continuar.'
        });
    }

    if (req.session.usuario.tipo !== 'fotografo') {
        return res.status(403).json({
            erro: 'Apenas fotógrafos podem realizar esta ação.'
        });
    }

    next();
}

module.exports = {
    autenticarSessao,
    exigirFotografo
};
