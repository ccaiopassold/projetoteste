
const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT) || 5432,
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD
});

pool.on('connect', () => {
    console.log('Conexão com PostgreSQL estabelecida.');
});

pool.on('error', (erro) => {
    console.error('Erro inesperado na conexão com PostgreSQL:', erro.message);
});

module.exports = pool;
