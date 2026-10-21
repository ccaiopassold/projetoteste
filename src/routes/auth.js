const express = require('express');
const router = express.Router();
const pool = require('../config/database');
const jwt = require('jsonwebtoken');

router.post('/login', async (req, res) => {
    try {
        const { nome_usuario, senha } = req.body;

        if (
            typeof nome_usuario !== 'string' ||
            typeof senha !== 'string' ||
            !nome_usuario.trim() ||
            !senha
        ) {
            return res.status(400).json({
                erro: 'Informe o nome de usuário e a senha.'
            });
        }

        const resultado = await pool.query(
            `SELECT id_usuario, nome, nome_usuario, email, senha, tipo, imagem_usuario
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

        const verificacao = await pool.query(
            'SELECT crypt($1, $2) = $2 AS senha_valida',
            [senha, usuario.senha]
        );

        if (!verificacao.rows[0].senha_valida) {
            return res.status(401).json({
                erro: 'Usuário ou senha incorretos.'
            });
        }

        if (!process.env.JWT_SECRET) {
            console.error('JWT_SECRET não está configurado.');
            return res.status(500).json({
                erro: 'Configuração de autenticação incompleta.'
            });
        }

        const token = jwt.sign(
            {
                id_usuario: usuario.id_usuario,
                tipo: usuario.tipo
            },
            process.env.JWT_SECRET,
            { expiresIn: '2h' }
        );

        res.json({
            mensagem: 'Login realizado com sucesso!',
            token,
            usuario: {
                id_usuario: usuario.id_usuario,
                nome: usuario.nome,
                nome_usuario: usuario.nome_usuario,
                email: usuario.email,
                tipo: usuario.tipo,
                imagem_usuario: usuario.imagem_usuario
            }
        });
    } catch (erro) {
        console.error('Erro no login:', erro.message);
        res.status(500).json({
            erro: 'Não foi possível realizar o login.'
        });
    }
});

module.exports = router;
