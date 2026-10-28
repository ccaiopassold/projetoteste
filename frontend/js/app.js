
const API_URL = 'http://localhost:3000/api';
const SERVIDOR_URL = 'http://localhost:3000';
const ASSETS_URL = `${SERVIDOR_URL}/assets`;

let usuarioAtual = null;
let publicacoes = [];
let minhasCurtidas = new Set();
let modoMinhasPublicacoes = false;
let fotografoBuscado = null;

const elemento = (id) => document.getElementById(id);

// =====================================================
// REQUISIÇÕES À API
// =====================================================

async function requisicao(caminho, opcoes = {}) {
    const cabecalhos = { ...(opcoes.headers || {}) };

    if (opcoes.body && !(opcoes.body instanceof FormData)) {
        cabecalhos['Content-Type'] = 'application/json';
    }

    const resposta = await fetch(`${API_URL}${caminho}`, {
        ...opcoes,
        headers: cabecalhos,
        credentials: 'include'
    });

    const dados = await resposta.json().catch(() => ({}));

    if (!resposta.ok) {
        throw new Error(
            dados.erro || dados.mensagem || 'Ocorreu um erro.'
        );
    }

    return dados;
}

// =====================================================
// MENSAGENS
// =====================================================

function mostrarMensagem(id, mensagem, erro = false) {
    const campo = elemento(id);

    if (!campo) return;

    campo.textContent = mensagem;
    campo.classList.toggle('erro', erro);
    campo.hidden = !mensagem;
    campo.style.display = mensagem ? 'block' : 'none';
}

function limparMensagem(id) {
    mostrarMensagem(id, '');
}

// =====================================================
// IMAGENS
// =====================================================

function urlImagem(caminho) {
    if (!caminho) {
        return `${ASSETS_URL}/saepVision.jpeg`;
    }

    if (/^https?:\/\//i.test(caminho)) {
        return caminho;
    }

    const caminhoLimpo = caminho.replace(/^\/+/, '');

    if (caminhoLimpo.startsWith('assets/')) {
        return `${SERVIDOR_URL}/${caminhoLimpo}`;
    }

    return `${ASSETS_URL}/${encodeURIComponent(
        caminhoLimpo.split('/').pop()
    )}`;
}

function configurarImagem(img, caminho, textoAlternativo = '') {
    if (!img) return;

    img.onerror = () => {
        img.onerror = null;
        img.src = `${ASSETS_URL}/saepVision.jpeg`;
    };

    img.src = urlImagem(caminho);
    img.alt = textoAlternativo;
}

function criarImagem(src, alt, classe) {
    const img = document.createElement('img');

    img.className = classe || '';
    configurarImagem(img, src, alt || '');

    return img;
}

// =====================================================
// CABEÇALHO E PERFIL DO USUÁRIO
// =====================================================

function atualizarCabecalho() {
    const botaoLogin = elemento('btn-login');
    const botaoLogout = elemento('btn-logout');
    const botaoPerfil = elemento('btn-perfil');

    const nomeUsuario = elemento('nome-usuario');
    const fotoPerfil = elemento('foto-perfil');
    const fotoPerfilMenu = elemento('foto-perfil-menu');
    const nomePerfilMenu = elemento('nome-perfil-menu');

    const logado = Boolean(usuarioAtual);

    if (botaoLogin) {
        botaoLogin.hidden = logado;
    }

    if (botaoLogout) {
        botaoLogout.hidden = !logado;
    }

    if (nomeUsuario) {
        nomeUsuario.textContent = usuarioAtual
            ? `@${usuarioAtual.nome_usuario}`
            : '@SAEPVision';
    }

    const caminhoFoto = usuarioAtual?.imagem_usuario || 'saepVision.jpeg';

    const nomeCompleto = usuarioAtual
        ? usuarioAtual.nome || usuarioAtual.nome_usuario
        : 'SAEPVision';

    configurarImagem(
        fotoPerfil,
        caminhoFoto,
        `Foto de ${nomeCompleto}`
    );

    configurarImagem(
        fotoPerfilMenu,
        caminhoFoto,
        `Foto de ${nomeCompleto}`
    );

    if (nomePerfilMenu) {
        nomePerfilMenu.textContent = usuarioAtual
            ? nomeCompleto
            : 'Meu perfil';
    }

    if (botaoPerfil) {
        botaoPerfil.disabled = usuarioAtual?.tipo !== 'fotografo';
    }

    const secaoCadastro = elemento('secao-cadastro');

    if (secaoCadastro) {
        secaoCadastro.hidden = !(
            usuarioAtual?.tipo === 'fotografo' &&
            modoMinhasPublicacoes
        );
    }

    const busca = elemento('secao-busca');

    if (busca) {
        busca.hidden = modoMinhasPublicacoes;
    }
}

// =====================================================
// MODAL DE LOGIN
// =====================================================

function abrirModalLogin() {
    const modal = elemento('modal-login');

    if (!modal) return;

    limparMensagem('mensagem-login');
    limparMensagem('erro-nome-usuario');
    limparMensagem('erro-senha');

    if (typeof modal.showModal === 'function' && !modal.open) {
        modal.showModal();
    } else {
        modal.style.display = 'flex';
    }

    elemento('nome_usuario')?.focus();
}

function fecharModalLogin() {
    const modal = elemento('modal-login');

    if (!modal) return;

    if (typeof modal.close === 'function' && modal.open) {
        modal.close();
    } else {
        modal.style.display = 'none';
    }

    limparMensagem('mensagem-login');
    limparMensagem('erro-nome-usuario');
    limparMensagem('erro-senha');
}

async function fazerLogin(evento) {
    evento.preventDefault();

    const campoNome = elemento('nome_usuario');
    const campoSenha = elemento('senha');

    const nomeUsuario = campoNome.value.trim();
    const senha = campoSenha.value;

    limparMensagem('erro-nome-usuario');
    limparMensagem('erro-senha');
    limparMensagem('mensagem-login');

    if (nomeUsuario.length < 3) {
        mostrarMensagem(
            'erro-nome-usuario',
            'Digite um nome de usuário com pelo menos 3 caracteres.',
            true
        );
        return;
    }

    if (!senha) {
        mostrarMensagem(
            'erro-senha',
            'Digite sua senha.',
            true
        );
        return;
    }

    try {
        const dados = await requisicao('/auth/login', {
            method: 'POST',
            body: JSON.stringify({
                nome_usuario: nomeUsuario,
                senha
            })
        });

        usuarioAtual = dados.usuario || null;

        if (!usuarioAtual) {
            throw new Error('A API não retornou os dados do usuário.');
        }

        fecharModalLogin();
        elemento('form-login').reset();

        modoMinhasPublicacoes = false;
        fotografoBuscado = null;

        await iniciarAplicacao();
    } catch (erro) {
        mostrarMensagem('mensagem-login', erro.message, true);
    }
}

async function verificarSessao() {
    try {
        const dados = await requisicao('/auth/sessao');
        usuarioAtual = dados.usuario || null;
    } catch {
        usuarioAtual = null;
    }

    atualizarCabecalho();
}

async function fazerLogout() {
    try {
        await requisicao('/auth/logout', {
            method: 'POST'
        });
    } catch (erro) {
        console.error('Erro ao sair:', erro.message);
    }

    usuarioAtual = null;
    minhasCurtidas.clear();
    modoMinhasPublicacoes = false;
    fotografoBuscado = null;

    fecharMenuPerfil();
    fecharModalLogin();

    await iniciarAplicacao();
}

// =====================================================
// PUBLICAÇÕES
// =====================================================

async function carregarPublicacoes() {
    let caminho = '/publicacoes';

    if (modoMinhasPublicacoes && usuarioAtual?.tipo === 'fotografo') {
        caminho = '/publicacoes/minhas';
    } else if (fotografoBuscado) {
        caminho =
            `/publicacoes/fotografo/${encodeURIComponent(fotografoBuscado)}`;
    }

    try {
        const dados = await requisicao(caminho);

        publicacoes = dados.publicacoes || [];
        renderizarPublicacoes();
    } catch (erro) {
        publicacoes = [];
        renderizarPublicacoes();
        mostrarMensagem('mensagem', erro.message, true);
    }
}

async function carregarMinhasCurtidas() {
    minhasCurtidas.clear();

    if (!usuarioAtual) return;

    try {
        const dados = await requisicao('/curtidas/minhas');

        const curtidas = dados.curtidas || dados.idsCurtidos || [];

        curtidas.forEach((item) => {
            const id = typeof item === 'object'
                ? item.id_publicacao
                : item;

            if (id !== undefined && id !== null) {
                minhasCurtidas.add(Number(id));
            }
        });
    } catch (erro) {
        console.error('Erro ao carregar curtidas:', erro.message);
    }
}

function renderizarPublicacoes() {
    const lista = elemento(
        modoMinhasPublicacoes
            ? 'lista-filmes-admin'
            : 'lista-filmes'
    );

    if (!lista) return;

    lista.replaceChildren();

    const tituloGaleria = elemento('titulo-galeria');

    if (tituloGaleria) {
        tituloGaleria.textContent = modoMinhasPublicacoes
            ? 'Minhas fotografias'
            : fotografoBuscado
                ? `Fotografias de @${fotografoBuscado}`
                : 'Galeria de fotografias';
    }

    if (publicacoes.length === 0) {
        mostrarMensagem(
            'mensagem',
            modoMinhasPublicacoes
                ? 'Você ainda não publicou fotografias.'
                : fotografoBuscado
                    ? 'Nenhuma fotografia encontrada para este fotógrafo.'
                    : 'Nenhuma fotografia publicada ainda.'
        );

        return;
    }

    mostrarMensagem('mensagem', '');

    publicacoes.forEach((publicacao) => {
        const card = document.createElement('article');
        card.className = 'filme';

        const capa = criarImagem(
            publicacao.url_fotografia,
            publicacao.titulo_imagem,
            'capa-filme'
        );

        card.appendChild(capa);

        const conteudo = document.createElement('div');
        conteudo.className = 'conteudo-filme';

        const titulo = document.createElement('h3');
        titulo.textContent = publicacao.titulo_imagem || 'Fotografia';

        const autor = document.createElement('p');
        autor.className = 'informacao-filme';
        autor.textContent =
            `@${publicacao.nome_usuario || 'fotografo'}`;

        const local = document.createElement('p');
        local.className = 'informacao-filme';
        local.textContent = publicacao.local_foto || '';

        const acoes = document.createElement('div');
        acoes.className = 'acoes-filme';

        const botaoCurtir = document.createElement('button');
        botaoCurtir.type = 'button';
        botaoCurtir.className = 'botao-curtir';
        botaoCurtir.setAttribute('aria-label', 'Curtir fotografia');

        const icone = document.createElement('img');
        icone.className = 'icone-coracao';
        icone.src = `${ASSETS_URL}/coracao.svg`;
        icone.alt = '';

        const quantidade = document.createElement('span');
        quantidade.className = 'quantidade-curtidas';
        quantidade.textContent =
            Number(publicacao.quantidade_curtidas || 0);

        const curtido = minhasCurtidas.has(
            Number(publicacao.id_publicacao)
        );

        botaoCurtir.classList.toggle('curtido', curtido);
        botaoCurtir.append(icone, quantidade);

        botaoCurtir.addEventListener('click', () => {
            alternarCurtida(publicacao.id_publicacao);
        });

        acoes.appendChild(botaoCurtir);

        const podeExcluir =
            usuarioAtual?.tipo === 'fotografo' &&
            Number(usuarioAtual.id_usuario) ===
                Number(publicacao.id_usuario);

        if (podeExcluir) {
            const botaoExcluir = document.createElement('button');

            botaoExcluir.type = 'button';
            botaoExcluir.className = 'botao-excluir';
            botaoExcluir.setAttribute(
                'aria-label',
                'Excluir fotografia'
            );

            const iconeExcluir = document.createElement('img');
            iconeExcluir.src = `${ASSETS_URL}/lixeira.svg`;
            iconeExcluir.alt = '';

            botaoExcluir.appendChild(iconeExcluir);

            botaoExcluir.addEventListener('click', () => {
                excluirPublicacao(publicacao.id_publicacao);
            });

            acoes.appendChild(botaoExcluir);
        }

        conteudo.append(titulo, autor, local, acoes);
        card.appendChild(conteudo);
        lista.appendChild(card);
    });
}

// =====================================================
// CURTIDAS
// =====================================================

async function alternarCurtida(idPublicacao) {
    if (!usuarioAtual) {
        abrirModalLogin();
        return;
    }

    const id = Number(idPublicacao);
    const jaCurtiu = minhasCurtidas.has(id);

    try {
        const dados = await requisicao(`/curtidas/${id}`, {
            method: jaCurtiu ? 'DELETE' : 'POST'
        });

        if (jaCurtiu) {
            minhasCurtidas.delete(id);
        } else {
            minhasCurtidas.add(id);
        }

        const publicacao = publicacoes.find(
            (item) => Number(item.id_publicacao) === id
        );

        if (publicacao && dados.quantidade_curtidas !== undefined) {
            publicacao.quantidade_curtidas =
                dados.quantidade_curtidas;
        }

        renderizarPublicacoes();
        await atualizarResumoPerfil();
    } catch (erro) {
        mostrarMensagem('mensagem', erro.message, true);
    }
}

// =====================================================
// PESQUISA DE FOTÓGRAFOS
// =====================================================

async function executarBuscaFotografo() {
    if (!usuarioAtual) {
        abrirModalLogin();
        return;
    }

    const nome = elemento('campo-busca')?.value.trim() || '';

    limparMensagem('mensagem-busca');

    if (!nome) {
        fotografoBuscado = null;
        modoMinhasPublicacoes = false;

        atualizarCabecalho();
        await carregarPublicacoes();

        return;
    }

    fotografoBuscado = nome.replace(/^@/, '');
    modoMinhasPublicacoes = false;

    atualizarCabecalho();
    await carregarPublicacoes();

    if (publicacoes.length === 0) {
        mostrarMensagem(
            'mensagem-busca',
            'Fotógrafo não encontrado ou sem publicações.',
            true
        );
    }
}

// =====================================================
// CADASTRAR FOTOGRAFIA
// =====================================================

async function cadastrarPublicacao(evento) {
    evento.preventDefault();

    if (usuarioAtual?.tipo !== 'fotografo') {
        abrirModalLogin();
        return;
    }

    const titulo = elemento('titulo-filme').value.trim();
    const local = elemento('genero-filme').value.trim();
    const arquivo = elemento('capa-filme').files[0];

    limparMensagem('erro-titulo');
    limparMensagem('erro-genero');
    limparMensagem('erro-capa');
    limparMensagem('mensagem-cadastro');

    if (!titulo) {
        mostrarMensagem(
            'erro-titulo',
            'Informe o título da fotografia.',
            true
        );
        return;
    }

    if (!local) {
        mostrarMensagem(
            'erro-genero',
            'Informe o local da fotografia.',
            true
        );
        return;
    }

    if (!arquivo) {
        mostrarMensagem(
            'erro-capa',
            'Selecione uma imagem.',
            true
        );
        return;
    }

    const tiposPermitidos = [
        'image/jpeg',
        'image/png',
        'image/gif',
        'image/webp'
    ];

    if (!tiposPermitidos.includes(arquivo.type)) {
        mostrarMensagem(
            'erro-capa',
            'Escolha uma imagem JPG, PNG, GIF ou WEBP.',
            true
        );
        return;
    }

    if (arquivo.size > 10 * 1024 * 1024) {
        mostrarMensagem(
            'erro-capa',
            'A imagem deve ter no máximo 10 MB.',
            true
        );
        return;
    }

    const formulario = new FormData();

    formulario.append('titulo_imagem', titulo);
    formulario.append('local_foto', local);
    formulario.append('fotografia', arquivo);

    const form = elemento('form-filme');
    const botao = form.querySelector('button[type="submit"]');

    botao.disabled = true;
    botao.textContent = 'Publicando...';

    try {
        await requisicao('/publicacoes', {
            method: 'POST',
            body: formulario
        });

        form.reset();

        if (elemento('nome-arquivo')) {
            elemento('nome-arquivo').textContent =
                'Nenhum arquivo escolhido';
        }

        mostrarMensagem(
            'mensagem-cadastro',
            'Fotografia publicada com sucesso!'
        );

        await carregarPublicacoes();
        await atualizarResumoPerfil();
    } catch (erro) {
        mostrarMensagem(
            'mensagem-cadastro',
            erro.message,
            true
        );
    } finally {
        botao.disabled = false;
        botao.textContent = 'Publicar fotografia';
    }
}

// =====================================================
// EXCLUIR FOTOGRAFIA
// =====================================================

async function excluirPublicacao(idPublicacao) {
    if (!confirm('Deseja realmente excluir esta fotografia?')) {
        return;
    }

    try {
        await requisicao(`/publicacoes/${idPublicacao}`, {
            method: 'DELETE'
        });

        await carregarPublicacoes();
        await atualizarResumoPerfil();
    } catch (erro) {
        mostrarMensagem('mensagem', erro.message, true);
    }
}

// =====================================================
// MENU LATERAL DO PERFIL
// =====================================================

function abrirMenuPerfil() {
    if (usuarioAtual?.tipo !== 'fotografo') {
        abrirModalLogin();
        return;
    }

    const fundo = elemento('fundo-menu');
    const menu = elemento('menu-perfil');

    if (fundo) {
        fundo.hidden = false;
        fundo.style.display = 'block';
    }

    if (menu) {
        menu.hidden = false;
        menu.style.display = 'block';
    }

    atualizarCabecalho();
    atualizarResumoPerfil();
}

function fecharMenuPerfil() {
    const fundo = elemento('fundo-menu');
    const menu = elemento('menu-perfil');

    if (fundo) {
        fundo.style.display = 'none';
        fundo.hidden = true;
    }

    if (menu) {
        menu.style.display = 'none';
        menu.hidden = true;
    }
}

async function atualizarResumoPerfil() {
    if (usuarioAtual?.tipo !== 'fotografo') return;

    try {
        const dados = await requisicao('/publicacoes/minhas');
        const minhasPublicacoes = dados.publicacoes || [];

        const totalCurtidas = minhasPublicacoes.reduce(
            (total, item) =>
                total + Number(item.quantidade_curtidas || 0),
            0
        );

        const campoLikes = elemento('total-likes');
        const campoPublicacoes = elemento('total-filmes');

        if (campoLikes) {
            campoLikes.textContent = `${totalCurtidas} curtidas`;
        }

        if (campoPublicacoes) {
            campoPublicacoes.textContent =
                `${minhasPublicacoes.length} fotografias`;
        }
    } catch (erro) {
        console.error(
            'Erro ao carregar resumo:',
            erro.message
        );
    }
}

async function mostrarMinhasPublicacoes() {
    fecharMenuPerfil();

    modoMinhasPublicacoes = true;
    fotografoBuscado = null;

    if (elemento('campo-busca')) {
        elemento('campo-busca').value = '';
    }

    atualizarCabecalho();
    await carregarPublicacoes();

    elemento('secao-cadastro')?.scrollIntoView({
        behavior: 'smooth',
        block: 'start'
    });
}

function mostrarFormularioCadastro() {
    if (usuarioAtual?.tipo !== 'fotografo') {
        abrirModalLogin();
        return;
    }

    fecharMenuPerfil();

    modoMinhasPublicacoes = true;
    fotografoBuscado = null;

    if (elemento('campo-busca')) {
        elemento('campo-busca').value = '';
    }

    atualizarCabecalho();
    carregarPublicacoes();

    elemento('secao-cadastro')?.scrollIntoView({
        behavior: 'smooth',
        block: 'start'
    });

    elemento('titulo-filme')?.focus();
}

// =====================================================
// INICIALIZAÇÃO
// =====================================================

async function iniciarAplicacao() {
    atualizarCabecalho();

    await carregarMinhasCurtidas();
    await carregarPublicacoes();
    await atualizarResumoPerfil();

    // Atualiza o cabeçalho novamente após carregar a sessão.
    atualizarCabecalho();
}

document.addEventListener('DOMContentLoaded', async () => {
    elemento('form-login')?.addEventListener(
        'submit',
        fazerLogin
    );

    elemento('btn-login')?.addEventListener(
        'click',
        abrirModalLogin
    );

    elemento('btn-fechar-modal')?.addEventListener(
        'click',
        fecharModalLogin
    );

    elemento('btn-cancelar-login')?.addEventListener(
        'click',
        fecharModalLogin
    );

    elemento('btn-logout')?.addEventListener(
        'click',
        fazerLogout
    );

    elemento('btn-perfil')?.addEventListener(
        'click',
        abrirMenuPerfil
    );

    elemento('btn-fechar-perfil')?.addEventListener(
        'click',
        fecharMenuPerfil
    );

    elemento('fundo-menu')?.addEventListener(
        'click',
        fecharMenuPerfil
    );

    elemento('btn-seus-filmes')?.addEventListener(
        'click',
        mostrarMinhasPublicacoes
    );

    elemento('btn-cadastrar-filme')?.addEventListener(
        'click',
        mostrarFormularioCadastro
    );

    elemento('form-filme')?.addEventListener(
        'submit',
        cadastrarPublicacao
    );

    elemento('btn-busca')?.addEventListener(
        'click',
        executarBuscaFotografo
    );

    elemento('campo-busca')?.addEventListener('keydown', (evento) => {
        if (evento.key === 'Enter') {
            evento.preventDefault();
            executarBuscaFotografo();
        }
    });

    elemento('capa-filme')?.addEventListener('change', (evento) => {
        const arquivo = evento.target.files?.[0];
        const nomeArquivo = elemento('nome-arquivo');

        if (nomeArquivo) {
            nomeArquivo.textContent =
                arquivo?.name || 'Nenhum arquivo escolhido';
        }
    });

    elemento('modal-login')?.addEventListener('click', (evento) => {
        if (evento.target === elemento('modal-login')) {
            fecharModalLogin();
        }
    });

    await verificarSessao();
    await iniciarAplicacao();
});
