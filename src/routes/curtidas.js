const express = require('express');
const router = express.Router();
const pool = require('../config/database');
const { autenticarToken } = require('../middlewares/authMiddleware');

// Listar as curtidas do usuário autenticado
router.get('/minhas', autenticarToken, async (req, res) => {
    try {
        const resultado = await pool.query(
            `SELECT id_filme
             FROM tb_curtida
             WHERE id_usuario = $1`,
            [req.usuario.id_usuario]
        );

        res.json(resultado.rows);
    } catch (erro) {
        console.error('Erro ao buscar curtidas:', erro.message);
        res.status(500).json({
            erro: 'Não foi possível buscar suas curtidas.'
        });
    }
});

// Consultar quantidade de curtidas de um filme
router.get('/:id_filme/quantidade', async (req, res) => {
    try {
        const idFilme = Number(req.params.id_filme);

        if (!Number.isInteger(idFilme) || idFilme <= 0) {
            return res.status(400).json({
                erro: 'ID do filme inválido.'
            });
        }

        const resultado = await pool.query(
            `SELECT COUNT(*)::INTEGER AS quantidade
             FROM tb_curtida
             WHERE id_filme = $1`,
            [idFilme]
        );

        res.json({
            quantidade: resultado.rows[0].quantidade
        });
    } catch (erro) {
        console.error('Erro ao consultar curtidas:', erro.message);
        res.status(500).json({
            erro: 'Não foi possível consultar as curtidas.'
        });
    }
});

// Curtir um filme
router.post('/:id_filme', autenticarToken, async (req, res) => {
    try {
        const idFilme = Number(req.params.id_filme);

        if (!Number.isInteger(idFilme) || idFilme <= 0) {
            return res.status(400).json({
                erro: 'ID do filme inválido.'
            });
        }

        const resultado = await pool.query(
            `INSERT INTO tb_curtida (id_usuario, id_filme)
             VALUES ($1, $2)
             ON CONFLICT (id_usuario, id_filme) DO NOTHING
             RETURNING id_curtida`,
            [req.usuario.id_usuario, idFilme]
        );

        if (resultado.rowCount === 0) {
            return res.status(409).json({
                erro: 'Você já curtiu este filme.'
            });
        }

        res.status(201).json({
            mensagem: 'Filme curtido com sucesso!'
        });
    } catch (erro) {
        if (erro.code === '23503') {
            return res.status(404).json({
                erro: 'Filme não encontrado.'
            });
        }

        console.error('Erro ao curtir filme:', erro.message);
        res.status(500).json({
            erro: 'Não foi possível curtir o filme.'
        });
    }
});

// Remover a própria curtida
router.delete('/:id_filme', autenticarToken, async (req, res) => {
    try {
        const idFilme = Number(req.params.id_filme);

        if (!Number.isInteger(idFilme) || idFilme <= 0) {
            return res.status(400).json({
                erro: 'ID do filme inválido.'
            });
        }

        const resultado = await pool.query(
            `DELETE FROM tb_curtida
             WHERE id_usuario = $1 AND id_filme = $2
             RETURNING id_curtida`,
            [req.usuario.id_usuario, idFilme]
        );

        if (resultado.rowCount === 0) {
            return res.status(404).json({
                erro: 'Curtida não encontrada.'
            });
        }

        res.json({
            mensagem: 'Curtida removida com sucesso!'
        });
    } catch (erro) {
        console.error('Erro ao remover curtida:', erro.message);
        res.status(500).json({
            erro: 'Não foi possível remover a curtida.'
        });
    }
});

module.exports = router;
