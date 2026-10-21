
-- =========================================
-- TABELA DE USUÁRIOS
-- =========================================
CREATE TABLE tb_usuario (
    id_usuario SERIAL PRIMARY KEY,
    nome VARCHAR(150) NOT NULL,
    nome_usuario VARCHAR(50) NOT NULL UNIQUE,
    email VARCHAR(150) NOT NULL UNIQUE,
    senha VARCHAR(255) NOT NULL,
    imagem_usuario VARCHAR(255),
    tipo VARCHAR(20) NOT NULL
        CHECK (tipo IN ('administrador', 'usuario')),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- =========================================
-- TABELA DE FILMES
-- =========================================
CREATE TABLE tb_filme (
    id_filme SERIAL PRIMARY KEY,
    titulo VARCHAR(200) NOT NULL,
    descricao TEXT,
    genero VARCHAR(100) NOT NULL,
    ano_lancamento INTEGER
        CHECK (ano_lancamento IS NULL OR ano_lancamento >= 1888),
    imagem_capa VARCHAR(255),
    id_administrador INTEGER NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_filme_administrador
        FOREIGN KEY (id_administrador)
        REFERENCES tb_usuario(id_usuario)
        ON DELETE RESTRICT
);

-- =========================================
-- TABELA DE CURTIDAS
-- =========================================
CREATE TABLE tb_curtida (
    id_curtida SERIAL PRIMARY KEY,
    id_usuario INTEGER NOT NULL,
    id_filme INTEGER NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_curtida_usuario
        FOREIGN KEY (id_usuario)
        REFERENCES tb_usuario(id_usuario)
        ON DELETE CASCADE,

    CONSTRAINT fk_curtida_filme
        FOREIGN KEY (id_filme)
        REFERENCES tb_filme(id_filme)
        ON DELETE CASCADE,

    CONSTRAINT uq_curtida_usuario_filme
        UNIQUE (id_usuario, id_filme)
);

-- =========================================
-- ÍNDICES PARA CONSULTAS
-- =========================================
CREATE INDEX idx_filme_titulo ON tb_filme(titulo);
CREATE INDEX idx_filme_genero ON tb_filme(genero);
CREATE INDEX idx_curtida_filme ON tb_curtida(id_filme);


-- Habilitar funções criptográficas do PostgreSQL
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Importar os usuários do protótipo
INSERT INTO tb_usuario
    (nome, nome_usuario, email, senha, imagem_usuario, tipo)
VALUES
    ('Bulma Briefs', 'bulma', 'bulma@streamflix.com',
     crypt('Bulma@123', gen_salt('bf')), 'bulma.png', 'administrador'),

    ('Mestre Kame', 'mestrekame', 'mestrekame@streamflix.com',
     crypt('Kame@123', gen_salt('bf')), 'mestrekame.png', 'administrador'),

    ('Son Goku', 'goku', 'goku@email.com',
     crypt('Goku@123', gen_salt('bf')), 'goku.png', 'usuario'),

    ('Vegeta', 'vegeta', 'vegeta@email.com',
     crypt('Vegeta@123', gen_salt('bf')), 'vegeta.png', 'usuario'),

    ('Son Gohan', 'gohan', 'gohan@email.com',
     crypt('Gohan@123', gen_salt('bf')), 'gohan.png', 'usuario'),

    ('Piccolo', 'piccolo', 'piccolo@email.com',
     crypt('Piccolo@123', gen_salt('bf')), 'piccolo.png', 'usuario'),

    ('Kuririn', 'kuririn', 'kuririn@email.com',
     crypt('Kuririn@123', gen_salt('bf')), 'kuririn.png', 'usuario'),

    ('Android 18', 'A18', 'a18@email.com',
     crypt('A18@123', gen_salt('bf')), 'a18.png', 'usuario');



	 SELECT
    id_usuario,
    nome,
    nome_usuario,
    email,
    imagem_usuario,
    tipo
FROM tb_usuario
ORDER BY id_usuario;

SELECT
    id_usuario,
    nome,
    nome_usuario,
    tipo
FROM tb_usuario
WHERE tipo = 'administrador';
