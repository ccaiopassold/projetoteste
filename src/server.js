
const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Rota inicial da API
app.get('/api', (req, res) => {
    res.json({
        mensagem: 'API da StreamFlix funcionando!',
        status: 'online'
    });
});

// Rotas de filmes
app.use('/api/filmes', require('./routes/filmes'));

// Rota de autenticação
app.use('/api/auth', require('./routes/auth'));
app.use('/api/curtidas', require('./routes/curtidas'));

app.listen(PORT, () => {
    console.log(`Servidor StreamFlix rodando em http://localhost:${PORT}`);
});
