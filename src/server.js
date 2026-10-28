
const express = require('express');
const cors = require('cors');
const session = require('express-session');
const pgSession = require('connect-pg-simple')(session);
const path = require('path');

require('dotenv').config();

const pool = require('./config/database');

const app = express();
const PORT = process.env.PORT || 3000;

// Configuração do CORS para permitir sessões no navegador
app.use(cors({
    origin: true,
    credentials: true
}));

// Permite receber dados JSON
app.use(express.json({ limit: '12mb' }));

// Disponibiliza as imagens
app.use(
    '/assets',
    express.static(path.join(__dirname, '..', 'frontend', 'assets'))
);

// Disponibiliza o HTML, CSS e JavaScript do site
app.use(express.static(path.join(__dirname, '..', 'frontend')));

// Configuração das sessões
app.use(session({
    store: new pgSession({
        pool,
        tableName: 'saep_sessoes',
        createTableIfMissing: true
    }),
    secret: process.env.SESSION_SECRET || 'saep-sessao-local-altere-em-producao',
    resave: false,
    saveUninitialized: false,
    cookie: {
        httpOnly: true,
        sameSite: 'lax',
        secure: process.env.NODE_ENV === 'production',
        maxAge: 1000 * 60 * 60 * 4
    }
}));

// Rota inicial da API
app.get('/api', (req, res) => {
    res.json({
        mensagem: 'API do SAEP funcionando!',
        status: 'online'
    });
});

// Rotas da aplicação
app.use('/api/auth', require('./routes/auth'));
app.use('/api/publicacoes', require('./routes/publicacoes'));
app.use('/api/curtidas', require('./routes/curtidas'));

// Tratamento de rotas inexistentes
app.use((req, res) => {
    res.status(404).json({
        erro: 'Rota não encontrada.'
    });
});

// Tratamento de erros
app.use((erro, req, res, next) => {
    console.error('Erro no servidor:', erro);

    if (res.headersSent) {
        return next(erro);
    }

    res.status(500).json({
        erro: 'Ocorreu um erro interno no servidor.'
    });
});

// Inicialização
app.listen(PORT, () => {
    console.log(`Servidor SAEP rodando em http://localhost:${PORT}`);
});
