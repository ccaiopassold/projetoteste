
CREATE EXTENSION IF NOT EXISTS pgcrypto;

DROP TABLE IF EXISTS tb_curtida CASCADE;
DROP TABLE IF EXISTS tb_filme CASCADE;
DROP TABLE IF EXISTS tb_usuario CASCADE;

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

CREATE INDEX idx_filme_titulo ON tb_filme(titulo);
CREATE INDEX idx_filme_genero ON tb_filme(genero);
CREATE INDEX idx_filme_administrador ON tb_filme(id_administrador);
CREATE INDEX idx_curtida_filme ON tb_curtida(id_filme);

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

INSERT INTO tb_filme
    (titulo, descricao, genero, ano_lancamento, imagem_capa, id_administrador)
VALUES
    ('Interestelar',
     'Uma equipe viaja pelo espaço em busca de um novo lar para a humanidade.',
     'Ficção científica', 2014, 'interestelar.jpg',
     (SELECT id_usuario FROM tb_usuario WHERE nome_usuario = 'bulma')),
    ('Matrix',
     'Um programador descobre que a realidade pode não ser o que parece.',
     'Ficção científica', 1999, 'matrix.jpg',
     (SELECT id_usuario FROM tb_usuario WHERE nome_usuario = 'bulma')),
    ('O Senhor dos Anéis',
     'Uma jornada para destruir um poderoso anel.',
     'Fantasia', 2001, 'senhor_dos_aneis.jpg',
     (SELECT id_usuario FROM tb_usuario WHERE nome_usuario = 'mestrekame'));

SELECT id_usuario, nome, nome_usuario, email, imagem_usuario, tipo
FROM tb_usuario
ORDER BY id_usuario;

SELECT id_usuario, nome, nome_usuario
FROM tb_usuario
WHERE tipo = 'administrador';

SELECT
    tb_filme.id_filme,
    tb_filme.titulo,
    tb_filme.genero,
    tb_filme.ano_lancamento,
    tb_usuario.nome_usuario AS administrador
FROM tb_filme
INNER JOIN tb_usuario
    ON tb_filme.id_administrador = tb_usuario.id_usuario
ORDER BY tb_filme.id_filme;

SELECT
    tb_usuario.nome_usuario,
    COUNT(tb_filme.id_filme) AS total_filmes
FROM tb_usuario
LEFT JOIN tb_filme
    ON tb_usuario.id_usuario = tb_filme.id_administrador
WHERE tb_usuario.tipo = 'administrador'
GROUP BY tb_usuario.nome_usuario;

SELECT
    tb_filme.titulo,
    COUNT(tb_curtida.id_curtida) AS total_curtidas
FROM tb_filme
LEFT JOIN tb_curtida
    ON tb_filme.id_filme = tb_curtida.id_filme
GROUP BY tb_filme.id_filme, tb_filme.titulo
ORDER BY tb_filme.id_filme;
