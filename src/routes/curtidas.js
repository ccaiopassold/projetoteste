
const express = require('express');
const router = express.Router();
const pool = require('../config/database');

const {
    autenticarSessao
} = require('../middlewares/authMiddleware');


router.get('/minhas', autenticarSessao, async (req, res) => {
    try {
        const resultado = await pool.query(`
            SELECT id_publicacao
            FROM tb_curtida
            WHERE id_usuario = $1
        `, [req.session.usuario.id_usuario]);

        res.json(resultado.rows);
    } catch (erro) {
        console.error('Erro ao buscar curtidas:', erro.message);

        res.status(500).json({
            erro: 'Não foi possível carregar suas curtidas.'
        });
    }
});

router.get('/:id_publicacao/quantidade', async (req, res) => {
    try {
        const idPublicacao = Number(req.params.id_publicacao);

        if (!Number.isInteger(idPublicacao) || idPublicacao <= 0) {
            return res.status(400).json({
                erro: 'Identificador da publicação inválido.'
            });
        }

        const resultado = await pool.query(`
            SELECT COUNT(*) AS quantidade
            FROM tb_curtida
            WHERE id_publicacao = $1
        `, [idPublicacao]);

        res.json({
            id_publicacao: idPublicacao,
            quantidade: Number(resultado.rows[0].quantidade)
        });
    } catch (erro) {
        console.error('Erro ao contar curtidas:', erro.message);

        res.status(500).json({
            erro: 'Não foi possível contar as curtidas.'
        });
    }
});

router.post('/:id_publicacao', autenticarSessao, async (req, res) => {
    try {
        const idPublicacao = Number(req.params.id_publicacao);

        if (!Number.isInteger(idPublicacao) || idPublicacao <= 0) {
            return res.status(400).json({
                erro: 'Identificador da publicação inválido.'
            });
        }

        const publicacao = await pool.query(
            `SELECT id_publicacao
             FROM tb_publicacao
             WHERE id_publicacao = $1`,
            [idPublicacao]
        );

        if (publicacao.rowCount === 0) {
            return res.status(404).json({
                erro: 'Publicação não encontrada.'
            });
        }

        const resultado = await pool.query(`
            INSERT INTO tb_curtida (id_usuario, id_publicacao)
            VALUES ($1, $2)
            ON CONFLICT (id_usuario, id_publicacao) DO NOTHING
            RETURNING id_curtida
        `, [
            req.session.usuario.id_usuario,
            idPublicacao
        ]);

        const total = await pool.query(
            `SELECT COUNT(*) AS quantidade
             FROM tb_curtida
             WHERE id_publicacao = $1`,
            [idPublicacao]
        );

        res.status(resultado.rowCount ? 201 : 200).json({
            mensagem: resultado.rowCount
                ? 'Curtida registrada!'
                : 'Você já curtiu esta publicação.',
            curtido: true,
            quantidade: Number(total.rows[0].quantidade)
        });
    } catch (erro) {
        console.error('Erro ao registrar curtida:', erro.message);

        res.status(500).json({
            erro: 'Não foi possível registrar a curtida.'
        });
    }
});

router.delete('/:id_publicacao', autenticarSessao, async (req, res) => {
    try {
        const idPublicacao = Number(req.params.id_publicacao);

        if (!Number.isInteger(idPublicacao) || idPublicacao <= 0) {
            return res.status(400).json({
                erro: 'Identificador da publicação inválido.'
            });
        }

        await pool.query(`
            DELETE FROM tb_curtida
            WHERE id_usuario = $1
              AND id_publicacao = $2
        `, [
            req.session.usuario.id_usuario,
            idPublicacao
        ]);

        const total = await pool.query(
            `SELECT COUNT(*) AS quantidade
             FROM tb_curtida
             WHERE id_publicacao = $1`,
            [idPublicacao]
        );

        res.json({
            mensagem: 'Curtida removida.',
            curtido: false,
            quantidade: Number(total.rows[0].quantidade)
        });
    } catch (erro) {
        console.error('Erro ao remover curtida:', erro.message);

        res.status(500).json({
            erro: 'Não foi possível remover a curtida.'
        });
    }
});

module.exports = router;
