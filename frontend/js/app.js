const API_URL = 'http://localhost:3000/api';

const $ = (id) => document.getElementById(id);

let usuarioAtual = null;
let tokenAtual = null;
let filmes = [];
let meusFilmes = [];
let idsCurtidos = new Set();
let modoMeusFilmes = false;

const listaFilmes = $('lista-filmes');
const mensagem = $('mensagem');
const modalLogin = $('modal-login');
const formLogin = $('form-login');

function escapar(valor) {
    return String(valor ?? '').replace(/[&<>"']/g, caractere => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;'
    })[caractere]);
}

async function requisicao(url, opcoes = {}) {
    const cabecalhos = { ...(opcoes.headers || {}) };

    if (tokenAtual) {
        cabecalhos.Authorization = `Bearer ${tokenAtual}`;
    }

    if (opcoes.body && !(opcoes.body instanceof FormData)) {
        cabecalhos['Content-Type'] = 'application/json';
    }

    const resposta = await fetch(`${API_URL}${url}`, {
        ...opcoes,
        headers: cabecalhos
    });

    const dados = await resposta.json().catch(() => ({}));

    if (!resposta.ok) {
        throw new Error(
            dados.erro ||
            dados.mensagem ||
            dados.message ||
            `Ocorreu um erro na requisição (${resposta.status}).`
        );
    }

    return dados;
}

function mostrarMensagem(texto, elemento = mensagem) {
    if (elemento) {
        elemento.textContent = texto || '';
    }
}

function abrirLogin(texto = '') {
    mostrarMensagem(texto, $('mensagem-login'));
    mostrarMensagem('', $('erro-nome-usuario'));
    mostrarMensagem('', $('erro-senha'));

    if (!modalLogin.open) {
        modalLogin.showModal();
    }

    $('nome_usuario').focus();
}

function fecharLogin() {
    if (modalLogin.open) {
        modalLogin.close();
    }
}

function atualizarCabecalho() {
    $('nome-usuario').textContent = usuarioAtual
        ? `@${usuarioAtual.nome_usuario}`
        : '@StreamFlix';

    $('btn-login').hidden = Boolean(usuarioAtual);
    $('btn-logout').hidden = !usuarioAtual;

    $('btn-perfil').disabled =
        !usuarioAtual || usuarioAtual.tipo !== 'administrador';

    const foto = $('foto-perfil');

    if (usuarioAtual && usuarioAtual.imagem_usuario) {
        foto.src = usuarioAtual.imagem_usuario;
        foto.alt = `Foto de ${usuarioAtual.nome || usuarioAtual.nome_usuario}`;
    } else {
        foto.src = 'assets/perfil.svg';
        foto.alt = 'Foto do perfil';
    }

    if (!usuarioAtual || usuarioAtual.tipo !== 'administrador') {
        $('secao-cadastro').hidden = true;
    }
}

function salvarSessao() {
    if (usuarioAtual && tokenAtual) {
        localStorage.setItem(
            'streamflix_usuario',
            JSON.stringify(usuarioAtual)
        );

        localStorage.setItem('streamflix_token', tokenAtual);
    } else {
        localStorage.removeItem('streamflix_usuario');
        localStorage.removeItem('streamflix_token');
    }
}

function carregarSessao() {
    try {
        tokenAtual = localStorage.getItem('streamflix_token');

        const usuarioSalvo = localStorage.getItem('streamflix_usuario');

        usuarioAtual = usuarioSalvo
            ? JSON.parse(usuarioSalvo)
            : null;

        if (!tokenAtual || !usuarioAtual) {
            usuarioAtual = null;
            tokenAtual = null;
        }
    } catch {
        usuarioAtual = null;
        tokenAtual = null;
    }

    atualizarCabecalho();
}

function imagemCapa(caminho) {
    if (!caminho) {
        return '';
    }

    if (/^(https?:\/\/|data:image\/)/i.test(caminho)) {
        return caminho;
    }

    if (caminho.startsWith('/')) {
        return caminho;
    }

    return `./assets/${encodeURIComponent(caminho)}`;
}

async function carregarCurtidas() {
    idsCurtidos.clear();

    if (!usuarioAtual || !tokenAtual) {
        return;
    }

    try {
        const resultado = await requisicao('/curtidas/minhas');

        const lista = Array.isArray(resultado)
            ? resultado
            : (resultado.curtidas || resultado.dados || []);

        lista.forEach(item => {
            const id = typeof item === 'object'
                ? item.id_filme
                : item;

            if (id !== undefined && id !== null) {
                idsCurtidos.add(Number(id));
            }
        });
    } catch (erro) {
        console.warn(
            'Não foi possível carregar as curtidas:',
            erro.message
        );
    }
}

async function quantidadeCurtidas(idFilme) {
    try {
        const dados = await requisicao(
            `/curtidas/${idFilme}/quantidade`
        );

        if (typeof dados === 'number') {
            return dados;
        }

        return Number(
            dados.quantidade ??
            dados.total ??
            dados.likes ??
            0
        );
    } catch {
        return 0;
    }
}

function criarCard(filme, opcoes = {}) {
    const idFilme = Number(filme.id_filme);
    const curtiu = idsCurtidos.has(idFilme);
    const capa = imagemCapa(filme.imagem_capa);

    const botaoExcluir = opcoes.mostrarExcluir
        ? `<button class="botao-cancelar" type="button"
                    data-excluir="${idFilme}">Excluir</button>`
        : '';

    return `
        <article class="filme" data-id="${idFilme}">
            <div class="area-capa">
                ${
                    capa
                        ? `
                            <img
                                class="capa-filme"
                                src="${escapar(capa)}"
                                alt="Capa de ${escapar(filme.titulo || 'filme')}"
                                onerror="this.onerror=null;this.style.display='none';this.nextElementSibling.hidden=false"
                            >

                            <div
                                class="capa-filme capa-vazia"
                                hidden
                            >
                                Imagem indisponível
                            </div>
                        `
                        : `
                            <div
                                class="capa-filme capa-vazia"
                                role="img"
                                aria-label="Capa não disponível"
                            >
                                Capa indisponível
                            </div>
                        `
                }

                <div class="informacao-filme">
                    <p>
                        Cadastrado por:
                        @${escapar(
                            filme.administrador ||
                            usuarioAtual?.nome_usuario ||
                            'administrador'
                        )}
                    </p>

                    <p>
                        Gênero:
                        ${escapar(filme.genero || 'Não informado')}
                    </p>
                </div>
            </div>

            <div class="conteudo-filme">
                <h3>
                    ${escapar(filme.titulo || 'Filme sem título')}
                </h3>

                ${
                    filme.ano_lancamento
                        ? `<p>Ano: ${escapar(filme.ano_lancamento)}</p>`
                        : ''
                }

                ${
                    filme.descricao
                        ? `<p>${escapar(filme.descricao)}</p>`
                        : ''
                }

                <div class="acoes-filme">
                    <button
                        class="botao-curtir ${curtiu ? 'curtiu' : ''}"
                        type="button"
                        data-curtir="${idFilme}"
                        aria-label="${curtiu ? 'Remover curtida' : 'Curtir filme'}"
                        aria-pressed="${curtiu}"
                    >
                        <span
                            class="icone-coracao"
                            style="color:${curtiu ? '#f00' : '#000'}"
                            aria-hidden="true"
                        >${curtiu ? '♥' : '♡'}</span>
                    </button>

                    <span
                        class="quantidade-curtidas"
                        data-quantidade="${idFilme}"
                    >...</span>

                    ${botaoExcluir}
                </div>
            </div>
        </article>
    `;
}

async function atualizarContagens(container = document) {
    const elementos = [
        ...container.querySelectorAll('[data-quantidade]')
    ];

    await Promise.all(
        elementos.map(async elemento => {
            const quantidade = await quantidadeCurtidas(
                Number(elemento.dataset.quantidade)
            );

            elemento.textContent = quantidade;
        })
    );
}

function renderizarFilmes() {
    listaFilmes.innerHTML = '';

    if (!filmes.length) {
        mostrarMensagem('Nenhum filme encontrado.');
        return;
    }

    mostrarMensagem('');

    listaFilmes.innerHTML = filmes
        .map(filme => criarCard(filme))
        .join('');

    atualizarContagens(listaFilmes);
}

async function carregarFilmes() {
    mostrarMensagem('Carregando filmes...');

    try {
        await carregarCurtidas();

        const resultado = await requisicao('/filmes');

        filmes = Array.isArray(resultado)
            ? resultado
            : (resultado.filmes || resultado.dados || []);

        modoMeusFilmes = false;

        $('titulo-galeria').textContent = 'Galeria de filmes';

        renderizarFilmes();
    } catch (erro) {
        listaFilmes.innerHTML = '';

        mostrarMensagem(
            `Não foi possível carregar os filmes: ${erro.message}`
        );
    }
}

async function pesquisarAdministrador() {
    if (!usuarioAtual) {
        abrirLogin('Entre para pesquisar administradores.');
        return;
    }

    const nome = $('campo-busca').value.trim();

    if (!nome) {
        await carregarFilmes();
        return;
    }

    try {
        mostrarMensagem('Pesquisando administrador...');

        const resultado = await requisicao(
            `/filmes/administrador/${encodeURIComponent(
                nome.replace(/^@/, '')
            )}`
        );

        filmes = Array.isArray(resultado)
            ? resultado
            : (resultado.filmes || resultado.dados || []);

        modoMeusFilmes = false;

        $('titulo-galeria').textContent =
            `Filmes de @${nome.replace(/^@/, '')}`;

        renderizarFilmes();

        if (!filmes.length) {
            mostrarMensagem(
                'Este administrador ainda não cadastrou filmes.'
            );
        }
    } catch (erro) {
        filmes = [];
        listaFilmes.innerHTML = '';

        mostrarMensagem(
            erro.message.toLowerCase().includes('não encontrado')
                ? 'Administrador não encontrado.'
                : erro.message
        );
    }
}

async function alternarCurtida(idFilme) {
    if (!usuarioAtual || !tokenAtual) {
        abrirLogin('Entre na sua conta para curtir filmes.');
        return;
    }

    const botao = document.querySelector(
        `[data-curtir="${idFilme}"]`
    );

    if (!botao || botao.disabled) {
        return;
    }

    botao.disabled = true;

    try {
        if (idsCurtidos.has(idFilme)) {
            await requisicao(
                `/curtidas/${idFilme}`,
                { method: 'DELETE' }
            );

            idsCurtidos.delete(idFilme);
        } else {
            await requisicao(
                `/curtidas/${idFilme}`,
                { method: 'POST' }
            );

            idsCurtidos.add(idFilme);
        }

        if (modoMeusFilmes) {
            renderizarMeusFilmes();
        } else {
            renderizarFilmes();
        }
    } catch (erro) {
        mostrarMensagem(erro.message);
    } finally {
        const botaoAtual = document.querySelector(
            `[data-curtir="${idFilme}"]`
        );

        if (botaoAtual) {
            botaoAtual.disabled = false;
        }
    }
}

function renderizarMeusFilmes() {
    const listaAdmin = $('lista-filmes-admin');

    listaAdmin.innerHTML = '';

    if (!meusFilmes.length) {
        listaAdmin.innerHTML =
            '<p>Você ainda não cadastrou filmes.</p>';

        return;
    }

    listaAdmin.innerHTML = meusFilmes
        .map(filme => criarCard(filme, { mostrarExcluir: true }))
        .join('');

    atualizarContagens(listaAdmin);
}

async function carregarMeusFilmes() {
    if (
        !usuarioAtual ||
        usuarioAtual.tipo !== 'administrador'
    ) {
        abrirLogin('Entre com uma conta de administrador.');
        return;
    }

    try {
        const resultado = await requisicao('/filmes/meus');

        meusFilmes = (
            Array.isArray(resultado)
                ? resultado
                : (resultado.filmes || resultado.dados || [])
        ).map(filme => ({
            ...filme,
            administrador: usuarioAtual.nome_usuario
        }));

        renderizarMeusFilmes();

        fecharMenuPerfil();

        $('secao-cadastro').hidden = false;

        $('titulo-galeria').textContent = 'Galeria de filmes';
    } catch (erro) {
        mostrarMensagem(erro.message);
    }
}

async function abrirPerfilAdministrador() {
    if (!usuarioAtual) {
        abrirLogin();
        return;
    }

    if (usuarioAtual.tipo !== 'administrador') {
        return;
    }

    try {
        const resultado = await requisicao('/filmes/meus');

        const lista = Array.isArray(resultado)
            ? resultado
            : (resultado.filmes || resultado.dados || []);

        const quantidades = await Promise.all(
            lista.map(filme =>
                quantidadeCurtidas(filme.id_filme)
            )
        );

        $('total-filmes').textContent =
            `${lista.length} Filmes`;

        $('total-likes').textContent =
            `${quantidades.reduce(
                (total, numero) => total + numero,
                0
            )} Likes`;

        $('fundo-menu').hidden = false;
        $('menu-perfil').hidden = false;
    } catch (erro) {
        mostrarMensagem(erro.message);
    }
}

function fecharMenuPerfil() {
    $('menu-perfil').hidden = true;
    $('fundo-menu').hidden = true;
}

function mostrarCadastro() {
    if (
        !usuarioAtual ||
        usuarioAtual.tipo !== 'administrador'
    ) {
        abrirLogin('Entre com uma conta de administrador.');
        return;
    }

    $('secao-cadastro').hidden = false;

    fecharMenuPerfil();

    $('form-filme').scrollIntoView({
        behavior: 'smooth',
        block: 'start'
    });

    $('titulo-filme').focus();
}

async function excluirFilme(idFilme) {
    try {
        await requisicao(
            `/filmes/${idFilme}`,
            { method: 'DELETE' }
        );

        mostrarMensagem('Filme excluído com sucesso!');

        await carregarMeusFilmes();
        await carregarFilmes();
    } catch (erro) {
        mostrarMensagem(erro.message);
    }
}

formLogin.addEventListener('submit', async evento => {
    evento.preventDefault();

    const nomeUsuario = $('nome_usuario').value.trim();
    const senha = $('senha').value;

    mostrarMensagem('', $('erro-nome-usuario'));
    mostrarMensagem('', $('erro-senha'));
    mostrarMensagem('', $('mensagem-login'));

    let valido = true;

    if (nomeUsuario.length < 3) {
        mostrarMensagem(
            'Digite um nome de usuário com pelo menos 3 caracteres.',
            $('erro-nome-usuario')
        );

        valido = false;
    }

    if (!senha) {
        mostrarMensagem(
            'Digite sua senha.',
            $('erro-senha')
        );

        valido = false;
    }

    if (!valido) {
        return;
    }

    const botaoEnviar = formLogin.querySelector(
        'button[type="submit"]'
    );

    botaoEnviar.disabled = true;
    botaoEnviar.textContent = 'Entrando...';

    try {
        const dados = await requisicao('/auth/login', {
            method: 'POST',
            body: JSON.stringify({
                nome_usuario: nomeUsuario,
                senha
            })
        });

        const usuarioRecebido =
            dados.usuario ||
            dados.user ||
            dados.dados?.usuario;

        const tokenRecebido =
            dados.token ||
            dados.accessToken ||
            dados.access_token;

        if (!usuarioRecebido || !tokenRecebido) {
            throw new Error(
                dados.mensagem ||
                'A API não retornou o usuário e o token do login.'
            );
        }

        usuarioAtual = usuarioRecebido;
        tokenAtual = tokenRecebido;

        salvarSessao();
        atualizarCabecalho();
        fecharLogin();
        formLogin.reset();

        $('campo-busca').value = '';

        mostrarMensagem('Login realizado com sucesso!');

        await carregarFilmes();

        if (usuarioAtual.tipo === 'administrador') {
            await carregarMeusFilmes();
        }
    } catch (erro) {
        mostrarMensagem(
            erro.message || 'Não foi possível entrar.',
            $('mensagem-login')
        );
    } finally {
        botaoEnviar.disabled = false;
        botaoEnviar.textContent = 'Entrar';
    }
});

$('btn-login').addEventListener('click', () => {
    abrirLogin();
});

$('btn-perfil').addEventListener(
    'click',
    abrirPerfilAdministrador
);

$('btn-logout').addEventListener('click', async () => {
    usuarioAtual = null;
    tokenAtual = null;

    idsCurtidos.clear();
    meusFilmes = [];

    salvarSessao();
    atualizarCabecalho();
    fecharMenuPerfil();

    $('campo-busca').value = '';
    $('secao-cadastro').hidden = true;
    $('lista-filmes-admin').innerHTML = '';

    await carregarFilmes();
});

$('btn-fechar-modal').addEventListener(
    'click',
    fecharLogin
);

$('btn-cancelar-login').addEventListener(
    'click',
    fecharLogin
);

modalLogin.addEventListener('click', evento => {
    if (evento.target === modalLogin) {
        fecharLogin();
    }
});

$('campo-busca').addEventListener('focus', () => {
    if (!usuarioAtual) {
        abrirLogin('Entre para pesquisar administradores.');
    }
});

$('btn-busca').addEventListener(
    'click',
    pesquisarAdministrador
);

$('campo-busca').addEventListener('keydown', evento => {
    if (evento.key === 'Enter') {
        evento.preventDefault();
        pesquisarAdministrador();
    }
});

listaFilmes.addEventListener('click', evento => {
    const botao = evento.target.closest('[data-curtir]');

    if (botao) {
        alternarCurtida(Number(botao.dataset.curtir));
    }
});

$('lista-filmes-admin').addEventListener('click', evento => {
    const botaoCurtir = evento.target.closest('[data-curtir]');

    if (botaoCurtir) {
        alternarCurtida(Number(botaoCurtir.dataset.curtir));
        return;
    }

    const botaoExcluir = evento.target.closest('[data-excluir]');

    if (botaoExcluir) {
        excluirFilme(Number(botaoExcluir.dataset.excluir));
    }
});

$('btn-fechar-perfil').addEventListener(
    'click',
    fecharMenuPerfil
);

$('fundo-menu').addEventListener(
    'click',
    fecharMenuPerfil
);

$('btn-seus-filmes').addEventListener(
    'click',
    carregarMeusFilmes
);

$('btn-cadastrar-filme').addEventListener(
    'click',
    mostrarCadastro
);

$('capa-filme').addEventListener('change', evento => {
    const arquivo = evento.target.files[0];

    $('nome-arquivo').textContent = arquivo
        ? arquivo.name
        : 'Nenhum arquivo escolhido';
});

$('form-filme').addEventListener('submit', async evento => {
    evento.preventDefault();

    $('erro-titulo').textContent = '';
    $('erro-genero').textContent = '';
    $('erro-capa').textContent = '';
    $('mensagem-cadastro').textContent = '';

    const titulo = $('titulo-filme').value.trim();
    const genero = $('genero-filme').value.trim();
    const descricao = $('descricao-filme').value.trim();
    const ano = $('ano-filme').value;
    const arquivo = $('capa-filme').files[0];

    let valido = true;

    if (!titulo) {
        $('erro-titulo').textContent =
            'Informe o título do filme.';

        valido = false;
    }

    if (!genero) {
        $('erro-genero').textContent =
            'Informe o gênero do filme.';

        valido = false;
    }

    if (
        arquivo &&
        !/\.(jpe?g|png|gif|webp)$/i.test(arquivo.name)
    ) {
        $('erro-capa').textContent =
            'Use um arquivo JPG, JPEG, PNG, GIF ou WEBP.';

        valido = false;
    }

    if (!valido) {
        return;
    }

    try {
        // O backend atual recebe JSON.
        // Isso salva somente o nome do arquivo, não a imagem em si.
        const resultado = await requisicao('/filmes', {
            method: 'POST',
            body: JSON.stringify({
                titulo,
                genero,
                descricao,
                ano_lancamento: ano || null,
                imagem_capa: arquivo ? arquivo.name : null
            })
        });

        $('mensagem-cadastro').textContent =
            resultado.mensagem ||
            'Filme cadastrado com sucesso!';

        $('form-filme').reset();

        $('nome-arquivo').textContent =
            'Nenhum arquivo escolhido';

        await carregarMeusFilmes();
        await carregarFilmes();
    } catch (erro) {
        $('mensagem-cadastro').textContent =
            erro.message;
    }
});

async function iniciar() {
    carregarSessao();

    await carregarFilmes();

    if (usuarioAtual?.tipo === 'administrador') {
        try {
            await carregarMeusFilmes();
        } catch (erro) {
            console.warn(
                'Não foi possível carregar os filmes do administrador:',
                erro.message
            );
        }
    }
}

iniciar();