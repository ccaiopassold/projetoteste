
const express = require('express');
const router = express.Router();
const pool = require('../config/database');

function usuarioSeguro(usuario) {
    return {
        id_usuario: usuario.id_usuario,
        nome: usuario.nome,
        nome_usuario: usuario.nome_usuario,
        email: usuario.email,
        imagem_usuario: usuario.imagem_usuario,
        tipo: usuario.tipo
    };
}


router.post('/login', async (req, res) => {
    try {
        const { nome_usuario, senha } = req.body;

        if (!nome_usuario || !senha) {
            return res.status(400).json({
                erro: 'Informe o nome de usuário e a senha.'
            });
        }

        const resultado = await pool.query(
            `SELECT
                id_usuario,
                nome,
                nome_usuario,
                email,
                senha,
                imagem_usuario,
                tipo
             FROM tb_usuario
             WHERE nome_usuario = $1`,
            [nome_usuario.trim()]
        );

        if (resultado.rows.length === 0) {
            return res.status(401).json({
                erro: 'Usuário ou senha incorretos.'
            });
        }

        const usuario = resultado.rows[0];
        let senhaValida = false;

        
        if (senha === usuario.senha) {
            senhaValida = true;
        } else {
            
            try {
                const verificacao = await pool.query(
                    'SELECT ($1 = crypt($2, $1)) AS valida',
                    [usuario.senha, senha]
                );

                senhaValida = verificacao.rows[0].valida === true;
            } catch (erroSenha) {
                senhaValida = false;
            }
        }

        if (!senhaValida) {
            return res.status(401).json({
                erro: 'Usuário ou senha incorretos.'
            });
        }

        req.session.usuario = usuarioSeguro(usuario);

        req.session.save((erro) => {
            if (erro) {
                console.error('Erro ao salvar sessão:', erro.message);

                return res.status(500).json({
                    erro: 'Não foi possível iniciar a sessão.'
                });
            }

            return res.json({
                mensagem: 'Login realizado com sucesso!',
                usuario: req.session.usuario
            });
        });
    } catch (erro) {
        console.error('Erro no login:', erro.message);

        res.status(500).json({
            erro: 'Erro interno ao realizar login.'
        });
    }
});


router.get('/sessao', (req, res) => {
    if (!req.session || !req.session.usuario) {
        return res.status(401).json({
            autenticado: false,
            mensagem: 'Nenhum usuário conectado.'
        });
    }

    res.json({
        autenticado: true,
        usuario: req.session.usuario
    });
});


router.post('/logout', (req, res) => {
    if (!req.session) {
        return res.json({
            mensagem: 'Logout realizado.'
        });
    }

    req.session.destroy((erro) => {
        if (erro) {
            console.error('Erro ao encerrar sessão:', erro.message);

            return res.status(500).json({
                erro: 'Não foi possível encerrar a sessão.'
            });
        }

        res.clearCookie('connect.sid');

        res.json({
            mensagem: 'Logout realizado com sucesso!'
        });
    });
});

module.exports = router;
