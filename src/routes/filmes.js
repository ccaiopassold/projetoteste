const express = require('express');
const router = express.Router();
const pool = require('../config/database');

const {
    autenticarToken,
    exigirAdministrador
} = require('../middlewares/authMiddleware');

// Listar todos os filmes publicamente
router.get('/', async (req, res) => {
    try {
        const resultado = await pool.query(`
            SELECT
                f.id_filme,
                f.titulo,
                f.descricao,
                f.genero,
                f.ano_lancamento,
                f.imagem_capa,
                u.nome_usuario AS administrador,
                u.nome AS nome_administrador
            FROM tb_filme f
            INNER JOIN tb_usuario u
                ON f.id_administrador = u.id_usuario
            ORDER BY f.id_filme DESC
        `);

        res.json(resultado.rows);
    } catch (erro) {
        console.error('Erro ao buscar filmes:', erro.message);
        res.status(500).json({
            erro: 'Não foi possível buscar os filmes.'
        });
    }
});

// Pesquisar filmes pelo nome de usuário do administrador
router.get('/administrador/:nome_usuario', async (req, res) => {
    try {
        const nomeUsuario = req.params.nome_usuario.trim();

        const administrador = await pool.query(
            `SELECT id_usuario
             FROM tb_usuario
             WHERE nome_usuario = $1
               AND tipo = 'administrador'`,
            [nomeUsuario]
        );

        if (administrador.rowCount === 0) {
            return res.status(404).json({
                erro: 'Administrador não encontrado.'
            });
        }

        const resultado = await pool.query(`
            SELECT
                f.id_filme,
                f.titulo,
                f.descricao,
                f.genero,
                f.ano_lancamento,
                f.imagem_capa,
                u.nome_usuario AS administrador,
                u.nome AS nome_administrador
            FROM tb_filme f
            INNER JOIN tb_usuario u
                ON f.id_administrador = u.id_usuario
            WHERE u.id_usuario = $1
            ORDER BY f.id_filme DESC
        `, [administrador.rows[0].id_usuario]);

        res.json(resultado.rows);
    } catch (erro) {
        console.error('Erro ao pesquisar administrador:', erro.message);
        res.status(500).json({
            erro: 'Não foi possível pesquisar o administrador.'
        });
    }
});

// Listar filmes do administrador autenticado
router.get('/meus', autenticarToken, exigirAdministrador, async (req, res) => {
    try {
        const resultado = await pool.query(`
            SELECT
                id_filme,
                titulo,
                descricao,
                genero,
                ano_lancamento,
                imagem_capa
            FROM tb_filme
            WHERE id_administrador = $1
            ORDER BY id_filme DESC
        `, [req.usuario.id_usuario]);

        res.json(resultado.rows);
    } catch (erro) {
        console.error('Erro ao buscar seus filmes:', erro.message);
        res.status(500).json({
            erro: 'Não foi possível buscar seus filmes.'
        });
    }
});

// Cadastrar filme (somente administradores autenticados)
router.post('/', autenticarToken, exigirAdministrador, async (req, res) => {
    try {
        const {
            titulo,
            descricao,
            genero,
            ano_lancamento,
            imagem_capa
        } = req.body;

        if (
            typeof titulo !== 'string' ||
            !titulo.trim() ||
            typeof genero !== 'string' ||
            !genero.trim()
        ) {
            return res.status(400).json({
                erro: 'Informe um título e um gênero válidos.'
            });
        }

        const ano = ano_lancamento === '' ||
            ano_lancamento === undefined ||
            ano_lancamento === null
            ? null
            : Number(ano_lancamento);

        if (
            ano !== null &&
            (!Number.isInteger(ano) ||
                ano < 1888 ||
                ano > new Date().getFullYear() + 10)
        ) {
            return res.status(400).json({
                erro: 'Informe um ano de lançamento válido.'
            });
        }

        const resultado = await pool.query(
            `INSERT INTO tb_filme
                (titulo, descricao, genero, ano_lancamento,
                 imagem_capa, id_administrador)
             VALUES ($1, $2, $3, $4, $5, $6)
             RETURNING *`,
            [
                titulo.trim(),
                descricao || null,
                genero.trim(),
                ano,
                imagem_capa || null,
                req.usuario.id_usuario
            ]
        );

        res.status(201).json({
            mensagem: 'Filme cadastrado com sucesso!',
            filme: resultado.rows[0]
        });
    } catch (erro) {
        console.error('Erro ao cadastrar filme:', erro.message);
        res.status(500).json({
            erro: 'Não foi possível cadastrar o filme.'
        });
    }
});

// Excluir filme pertencente ao administrador autenticado
router.delete('/:id_filme', autenticarToken, exigirAdministrador, async (req, res) => {
    try {
        const idFilme = Number(req.params.id_filme);

        if (!Number.isInteger(idFilme) || idFilme <= 0) {
            return res.status(400).json({
                erro: 'ID do filme inválido.'
            });
        }

        const resultado = await pool.query(
            `DELETE FROM tb_filme
             WHERE id_filme = $1
               AND id_administrador = $2
             RETURNING id_filme`,
            [idFilme, req.usuario.id_usuario]
        );

        if (resultado.rowCount === 0) {
            return res.status(404).json({
                erro: 'Filme não encontrado ou você não tem permissão para excluí-lo.'
            });
        }

        res.json({
            mensagem: 'Filme excluído com sucesso!'
        });
    } catch (erro) {
        console.error('Erro ao excluir filme:', erro.message);
        res.status(500).json({
            erro: 'Não foi possível excluir o filme.'
        });
    }
});

module.exports = router;
