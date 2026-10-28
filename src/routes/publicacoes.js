
const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const pool = require('../config/database');
const {
    autenticarSessao,
    exigirFotografo
} = require('../middlewares/authMiddleware');

const router = express.Router();

const pastaUploads = path.join(
    __dirname,
    '..',
    '..',
    'frontend',
    'assets',
    'uploads'
);

fs.mkdirSync(pastaUploads, { recursive: true });

const armazenamento = multer.diskStorage({
    destination: (req, file, callback) => {
        callback(null, pastaUploads);
    },
    filename: (req, file, callback) => {
        const extensoesPermitidas = {
            'image/jpeg': '.jpg',
            'image/png': '.png',
            'image/gif': '.gif',
            'image/webp': '.webp'
        };

        const extensao = extensoesPermitidas[file.mimetype];

        if (!extensao) {
            return callback(
                new Error('Formato inválido. Use JPG, PNG, GIF ou WEBP.')
            );
        }

        const nomeArquivo =
            `fotografia-${Date.now()}-${Math.round(Math.random() * 1e9)}${extensao}`;

        callback(null, nomeArquivo);
    }
});

const upload = multer({
    storage: armazenamento,
    limits: {
        fileSize: 10 * 1024 * 1024
    },
    fileFilter: (req, file, callback) => {
        const tiposPermitidos = [
            'image/jpeg',
            'image/png',
            'image/gif',
            'image/webp'
        ];

        if (!tiposPermitidos.includes(file.mimetype)) {
            return callback(
                new Error('Formato inválido. Use JPG, PNG, GIF ou WEBP.')
            );
        }

        callback(null, true);
    }
});


router.get('/', async (req, res) => {
    try {
        const resultado = await pool.query(`
            SELECT
                publicacao.id_publicacao,
                publicacao.titulo_imagem,
                publicacao.local_foto,
                publicacao.url_fotografia,
                publicacao.id_usuario,
                publicacao.created_at,
                usuario.nome,
                usuario.nome_usuario,
                usuario.imagem_usuario,
                COUNT(curtida.id_curtida)::integer AS quantidade_curtidas
            FROM tb_publicacao AS publicacao
            INNER JOIN tb_usuario AS usuario
                ON usuario.id_usuario = publicacao.id_usuario
            LEFT JOIN tb_curtida AS curtida
                ON curtida.id_publicacao = publicacao.id_publicacao
            GROUP BY
                publicacao.id_publicacao,
                usuario.id_usuario
            ORDER BY publicacao.created_at DESC NULLS LAST,
                     publicacao.id_publicacao DESC
        `);

        res.json({ publicacoes: resultado.rows });
    } catch (erro) {
        console.error('Erro ao listar publicações:', erro.message);
        res.status(500).json({ erro: 'Não foi possível listar as publicações.' });
    }
});


router.get('/fotografo/:nome_usuario', async (req, res) => {
    try {
        const { nome_usuario } = req.params;

        const resultado = await pool.query(`
            SELECT
                publicacao.id_publicacao,
                publicacao.titulo_imagem,
                publicacao.local_foto,
                publicacao.url_fotografia,
                publicacao.id_usuario,
                publicacao.created_at,
                usuario.nome,
                usuario.nome_usuario,
                usuario.imagem_usuario,
                COUNT(curtida.id_curtida)::integer AS quantidade_curtidas
            FROM tb_publicacao AS publicacao
            INNER JOIN tb_usuario AS usuario
                ON usuario.id_usuario = publicacao.id_usuario
            LEFT JOIN tb_curtida AS curtida
                ON curtida.id_publicacao = publicacao.id_publicacao
            WHERE LOWER(usuario.nome_usuario) = LOWER($1)
              AND usuario.tipo = 'fotografo'
            GROUP BY
                publicacao.id_publicacao,
                usuario.id_usuario
            ORDER BY publicacao.created_at DESC NULLS LAST,
                     publicacao.id_publicacao DESC
        `, [nome_usuario]);

        res.json({ publicacoes: resultado.rows });
    } catch (erro) {
        console.error('Erro ao buscar fotógrafo:', erro.message);
        res.status(500).json({ erro: 'Não foi possível buscar as publicações.' });
    }
});

router.get('/minhas', exigirFotografo, async (req, res) => {
    try {
        const idUsuario = req.session.usuario.id_usuario;

        const resultado = await pool.query(`
            SELECT
                publicacao.id_publicacao,
                publicacao.titulo_imagem,
                publicacao.local_foto,
                publicacao.url_fotografia,
                publicacao.id_usuario,
                publicacao.created_at,
                usuario.nome,
                usuario.nome_usuario,
                usuario.imagem_usuario,
                COUNT(curtida.id_curtida)::integer AS quantidade_curtidas
            FROM tb_publicacao AS publicacao
            INNER JOIN tb_usuario AS usuario
                ON usuario.id_usuario = publicacao.id_usuario
            LEFT JOIN tb_curtida AS curtida
                ON curtida.id_publicacao = publicacao.id_publicacao
            WHERE publicacao.id_usuario = $1
            GROUP BY
                publicacao.id_publicacao,
                usuario.id_usuario
            ORDER BY publicacao.created_at DESC NULLS LAST,
                     publicacao.id_publicacao DESC
        `, [idUsuario]);

        res.json({ publicacoes: resultado.rows });
    } catch (erro) {
        console.error('Erro ao listar suas publicações:', erro.message);
        res.status(500).json({ erro: 'Não foi possível listar suas publicações.' });
    }
});


router.post(
    '/',
    autenticarSessao,
    exigirFotografo,
    (req, res, next) => {
        upload.single('fotografia')(req, res, (erro) => {
            if (erro) {
                if (erro instanceof multer.MulterError) {
                    if (erro.code === 'LIMIT_FILE_SIZE') {
                        return res.status(400).json({
                            erro: 'A imagem deve ter no máximo 10 MB.'
                        });
                    }

                    return res.status(400).json({
                        erro: 'Não foi possível receber a imagem.'
                    });
                }

                return res.status(400).json({ erro: erro.message });
            }

            next();
        });
    },
    async (req, res) => {
        let arquivoSalvo = null;

        try {
            const { titulo_imagem, local_foto } = req.body;

            if (!titulo_imagem || !titulo_imagem.trim()) {
                return res.status(400).json({
                    erro: 'Informe o título da fotografia.'
                });
            }

            if (!req.file) {
                return res.status(400).json({
                    erro: 'Selecione uma fotografia.'
                });
            }

            arquivoSalvo = req.file.path;

            const idUsuario = req.session.usuario.id_usuario;
            const urlFotografia = `/assets/uploads/${req.file.filename}`;

            const resultado = await pool.query(`
                INSERT INTO tb_publicacao
                    (titulo_imagem, local_foto, id_usuario, url_fotografia)
                VALUES ($1, $2, $3, $4)
                RETURNING
                    id_publicacao,
                    titulo_imagem,
                    local_foto,
                    id_usuario,
                    url_fotografia,
                    created_at
            `, [
                titulo_imagem.trim(),
                local_foto ? local_foto.trim() : null,
                idUsuario,
                urlFotografia
            ]);

            res.status(201).json({
                mensagem: 'Fotografia publicada com sucesso!',
                publicacao: {
                    ...resultado.rows[0],
                    nome: req.session.usuario.nome,
                    nome_usuario: req.session.usuario.nome_usuario,
                    imagem_usuario: req.session.usuario.imagem_usuario,
                    quantidade_curtidas: 0
                }
            });
        } catch (erro) {
            if (arquivoSalvo) {
                fs.unlink(arquivoSalvo, () => {});
            }

            console.error('Erro ao cadastrar publicação:', erro.message);
            res.status(500).json({
                erro: 'Não foi possível cadastrar a fotografia.'
            });
        }
    }
);


router.delete('/:id_publicacao', exigirFotografo, async (req, res) => {
    try {
        const idPublicacao = Number(req.params.id_publicacao);
        const idUsuario = req.session.usuario.id_usuario;

        if (!Number.isInteger(idPublicacao) || idPublicacao <= 0) {
            return res.status(400).json({
                erro: 'Identificador de publicação inválido.'
            });
        }

        const resultado = await pool.query(`
            DELETE FROM tb_publicacao
            WHERE id_publicacao = $1
              AND id_usuario = $2
            RETURNING id_publicacao, url_fotografia
        `, [idPublicacao, idUsuario]);

        if (resultado.rowCount === 0) {
            return res.status(404).json({
                erro: 'Publicação não encontrada ou não pertence a você.'
            });
        }

        const urlFotografia = resultado.rows[0].url_fotografia;

        if (urlFotografia && urlFotografia.startsWith('/assets/uploads/')) {
            const nomeArquivo = path.basename(urlFotografia);
            const caminhoArquivo = path.join(pastaUploads, nomeArquivo);

            fs.unlink(caminhoArquivo, (erro) => {
                if (erro && erro.code !== 'ENOENT') {
                    console.error('Erro ao remover arquivo:', erro.message);
                }
            });
        }

        res.json({ mensagem: 'Publicação excluída com sucesso.' });
    } catch (erro) {
        console.error('Erro ao excluir publicação:', erro.message);
        res.status(500).json({ erro: 'Não foi possível excluir a publicação.' });
    }
});

module.exports = router;
