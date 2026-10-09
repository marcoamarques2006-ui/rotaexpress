/* ==========================================================================
   RotaExpress — Sistema de Gestão de Encomendas e Frete
   Projeto 01 · Desenvolvimento Web · CEUB · 2º/2026
   Autor: Marco Antônio Marques Monte

   1. Classe Encomenda ............ entidade: dados, #status privado e frete
   2. Classe GerenciadorLogistica . coleção privada, status e faturamento
   3. buscarEndereco() ............ consulta assíncrona à API ViaCEP
   4. Interface ................... formulário, cards e contadores (DOM)
   ========================================================================== */

'use strict';

/* ==========================================================================
   1. ENTIDADE — Encomenda
   ========================================================================== */

/**
 * Representa uma encomenda. Os dados ficam em campos privados (#) e só podem
 * ser lidos pelos getters. Depois do cadastro, o único dado que muda é o
 * status, e apenas pelo método avancarStatus().
 */
class Encomenda {
  /** Modalidades: rótulo, fator de urgência aplicado ao frete e prazo estimado. */
  static MODALIDADES = {
    economica: { rotulo: 'Econômica', fator: 1.0, prazo: '7 a 10 dias úteis' },
    padrao: { rotulo: 'Padrão', fator: 1.4, prazo: '3 a 5 dias úteis' },
    expressa: { rotulo: 'Expressa', fator: 2.0, prazo: '1 a 2 dias úteis' },
  };

  /** Etapas do status, na única ordem permitida. */
  static FLUXO_STATUS = ['Pendente', 'Em Trânsito', 'Entregue'];

  static TAXA_BASE = 9.9; // R$ fixos por envio
  static VALOR_POR_KG = 3.5; // R$ por quilo
  static PESO_MAXIMO = 30; // kg

  static #sequencial = 0; // contador privado usado para gerar os códigos de rastreio

  #codigo;
  #destinatario;
  #peso;
  #modalidade;
  #endereco;
  #status;

  /**
   * Cria a encomenda com status "Pendente".
   * @param {Object} dados
   * @param {string} dados.destinatario - Nome do destinatário (mínimo de 3 letras).
   * @param {number} dados.peso - Peso em kg (maior que 0 e no máximo PESO_MAXIMO).
   * @param {string} dados.modalidade - 'economica', 'padrao' ou 'expressa'.
   * @param {Object} dados.endereco - { cep, logradouro, numero, bairro, cidade, uf }, todos preenchidos.
   * @throws {Error} Se algum dado não respeitar essas regras.
   */
  constructor({ destinatario, peso, modalidade, endereco }) {
    if (destinatario.trim().length < 3) {
      throw new Error('Informe o nome do destinatário (mínimo de 3 letras).');
    }
    if (Number.isNaN(peso) || peso <= 0 || peso > Encomenda.PESO_MAXIMO) {
      throw new Error(`O peso deve ser maior que 0 e no máximo ${Encomenda.PESO_MAXIMO} kg.`);
    }
    if (!Encomenda.modalidadeValida(modalidade)) {
      throw new Error('Modalidade de envio inválida.');
    }
    if (Object.values(endereco).some((valor) => valor.trim() === '')) {
      throw new Error('Preencha todos os campos do endereço.');
    }

    this.#codigo = Encomenda.#gerarCodigo();
    this.#destinatario = destinatario.trim();
    this.#peso = peso;
    this.#modalidade = modalidade;
    this.#endereco = { ...endereco };
    this.#status = Encomenda.FLUXO_STATUS[0];
  }

  /* ---------- Getters: leitura dos campos privados ---------- */
  get codigo() { return this.#codigo; }
  get destinatario() { return this.#destinatario; }
  get peso() { return this.#peso; }
  get modalidade() { return this.#modalidade; }
  get endereco() { return { ...this.#endereco }; } // cópia: mudar o retorno não altera a encomenda
  get status() { return this.#status; }

  /** Posição do status no fluxo: 0 = Pendente, 1 = Em Trânsito, 2 = Entregue. */
  get etapa() { return Encomenda.FLUXO_STATUS.indexOf(this.#status); }

  /** true quando a encomenda chegou ao último status. */
  get foiEntregue() { return this.etapa === Encomenda.FLUXO_STATUS.length - 1; }

  /** Valor do frete desta encomenda, em reais. */
  get frete() { return Encomenda.calcularFrete(this.#peso, this.#modalidade); }

  /* ---------- Método de negócio ---------- */

  /**
   * Avança para o próximo status: Pendente → Em Trânsito → Entregue.
   * Não volta e não pula etapas.
   * @returns {string} O novo status.
   * @throws {Error} Se a encomenda já foi entregue.
   */
  avancarStatus() {
    if (this.foiEntregue) {
      throw new Error(`A encomenda ${this.#codigo} já foi entregue.`);
    }
    this.#status = Encomenda.FLUXO_STATUS[this.etapa + 1];
    return this.#status;
  }

  /* ---------- Métodos utilitários estáticos ---------- */

  /**
   * Regra do frete: (TAXA_BASE + peso × VALOR_POR_KG) × fator da modalidade.
   * Ex.: 2 kg na Expressa → (9,90 + 7,00) × 2,0 = R$ 33,80.
   * É estático para também servir à prévia do formulário, antes de a encomenda existir.
   * @param {number} peso - Peso em kg.
   * @param {string} modalidade - Chave de Encomenda.MODALIDADES.
   * @returns {number} Valor arredondado para centavos.
   */
  static calcularFrete(peso, modalidade) {
    const { fator } = Encomenda.MODALIDADES[modalidade];
    const valor = (Encomenda.TAXA_BASE + peso * Encomenda.VALOR_POR_KG) * fator;
    return Math.round(valor * 100) / 100;
  }

  /** Confere se a chave existe em MODALIDADES. */
  static modalidadeValida(chave) {
    return Object.keys(Encomenda.MODALIDADES).includes(chave);
  }

  /** Formata um número como moeda brasileira. Ex.: 33.8 → "R$ 33,80". */
  static formatarMoeda(valor) {
    return valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  }

  /** Gera códigos sequenciais no padrão RX000001BR. Privado: só a classe cria códigos. */
  static #gerarCodigo() {
    Encomenda.#sequencial += 1;
    return `RX${String(Encomenda.#sequencial).padStart(6, '0')}BR`;
  }
}

/* ==========================================================================
   2. GERENCIADOR — GerenciadorLogistica
   ========================================================================== */

/**
 * Controla a coleção de encomendas: cadastro, transição de status, exclusão,
 * contadores e faturamento. A lista é privada (#encomendas), então só muda
 * pelos métodos desta classe.
 */
class GerenciadorLogistica {
  #encomendas;

  constructor() {
    this.#encomendas = [];
  }

  /**
   * Cadastra uma encomenda.
   * @param {Encomenda} encomenda - Objeto criado com new Encomenda(...).
   * @throws {Error} Se o objeto não for uma Encomenda.
   */
  cadastrar(encomenda) {
    if (!(encomenda instanceof Encomenda)) {
      throw new Error('Só é possível cadastrar objetos da classe Encomenda.');
    }
    this.#encomendas.push(encomenda);
  }

  /**
   * Procura uma encomenda pelo código de rastreio.
   * @param {string} codigo
   * @returns {Encomenda}
   * @throws {Error} Se o código não existir.
   */
  buscar(codigo) {
    const encomenda = this.#encomendas.find((item) => item.codigo === codigo);
    if (!encomenda) {
      throw new Error(`Encomenda ${codigo} não encontrada.`);
    }
    return encomenda;
  }

  /**
   * Transição de status. A regra do fluxo fica na própria Encomenda;
   * o gerenciador localiza a encomenda e delega.
   * @param {string} codigo
   * @returns {Encomenda} A encomenda já com o novo status.
   */
  avancarStatus(codigo) {
    const encomenda = this.buscar(codigo);
    encomenda.avancarStatus();
    return encomenda;
  }

  /**
   * Exclui uma encomenda; o frete dela deixa de contar no faturamento.
   * @param {string} codigo
   * @throws {Error} Se o código não existir.
   */
  remover(codigo) {
    this.buscar(codigo);
    this.#encomendas = this.#encomendas.filter((item) => item.codigo !== codigo);
  }

  /**
   * Conta as encomendas que estão em determinado status.
   * @param {string} status - Um dos valores de Encomenda.FLUXO_STATUS.
   * @returns {number}
   */
  contarPorStatus(status) {
    return this.#encomendas.filter((item) => item.status === status).length;
  }

  /** Total de encomendas cadastradas. */
  get quantidade() {
    return this.#encomendas.length;
  }

  /** Faturamento acumulado: soma dos fretes de todas as encomendas cadastradas. */
  get faturamentoAcumulado() {
    return GerenciadorLogistica.somarFretes(this.#encomendas);
  }

  /**
   * Soma os fretes de uma lista de encomendas.
   * @param {Encomenda[]} lista
   * @returns {number} Total arredondado para centavos.
   */
  static somarFretes(lista) {
    const total = lista.reduce((soma, item) => soma + item.frete, 0);
    return Math.round(total * 100) / 100;
  }
}

/* ==========================================================================
   3. INTEGRAÇÃO ASSÍNCRONA — API ViaCEP
   ========================================================================== */

/**
 * Consulta um CEP na API ViaCEP: GET https://viacep.com.br/ws/{cep}/json/
 * @param {string} cep - CEP com ou sem hífen.
 * @returns {Promise<{cep: string, logradouro: string, bairro: string, cidade: string, uf: string}>}
 * @throws {Error} Com mensagem pronta para a tela se o CEP for inválido, não
 *   existir ou se a API não puder ser acessada.
 */
async function buscarEndereco(cep) {
  const numeros = cep.replace(/\D/g, '');
  if (numeros.length !== 8) {
    throw new Error('Digite os 8 números do CEP.');
  }

  let resposta;
  try {
    resposta = await fetch(`https://viacep.com.br/ws/${numeros}/json/`);
  } catch {
    // O fetch só falha assim quando não chega resposta: sem internet ou API fora do ar
    throw new Error('Sem conexão com a ViaCEP. Verifique a internet e tente de novo.');
  }
  if (!resposta.ok) {
    throw new Error(`A ViaCEP respondeu com erro (HTTP ${resposta.status}).`);
  }

  const dados = await resposta.json();
  if (dados.erro) {
    // Para um CEP inexistente a ViaCEP responde { "erro": "true" }
    throw new Error('CEP não encontrado. Confira os números digitados.');
  }
  return { cep: dados.cep, logradouro: dados.logradouro, bairro: dados.bairro, cidade: dados.localidade, uf: dados.uf };
}

/* ==========================================================================
   4. INTERFACE — liga as classes à página (DOM)
   ========================================================================== */

const gerenciador = new GerenciadorLogistica();

// Elementos fixos da página
const formulario = document.querySelector('#form-encomenda');
const campos = {
  destinatario: document.querySelector('#destinatario'),
  peso: document.querySelector('#peso'),
  cep: document.querySelector('#cep'),
  logradouro: document.querySelector('#logradouro'),
  numero: document.querySelector('#numero'),
  bairro: document.querySelector('#bairro'),
  cidade: document.querySelector('#cidade'),
  uf: document.querySelector('#uf'),
};
const botaoBuscarCep = document.querySelector('#botao-buscar-cep');
const mensagemCep = document.querySelector('#mensagem-cep');
const previaFrete = document.querySelector('#previa-frete');
const previaPrazo = document.querySelector('#previa-prazo');
const listaEncomendas = document.querySelector('#lista-encomendas');
const estadoVazio = document.querySelector('#estado-vazio');
const areaAvisos = document.querySelector('#avisos');
const indicadores = {
  total: document.querySelector('#indicador-total'),
  pendentes: document.querySelector('#indicador-pendentes'),
  emTransito: document.querySelector('#indicador-transito'),
  entregues: document.querySelector('#indicador-entregues'),
  faturamento: document.querySelector('#indicador-faturamento'),
};

const MENSAGEM_CEP_INICIAL = mensagemCep.textContent;

/** Texto do botão para cada status que ainda pode avançar. */
const ROTULO_ACAO = { 'Pendente': 'Despachar', 'Em Trânsito': 'Entregar' };

let cepConfirmado = ''; // CEP cujo endereço foi preenchido pela ViaCEP

/* ---------- Funções auxiliares (arrow functions) ---------- */

const apenasNumeros = (texto) => texto.replace(/\D/g, '');

/** Cria um elemento com classe e texto. O texto entra por textContent, que não interpreta HTML. */
const criarElemento = (tag, classe = '', texto = '') => {
  const elemento = document.createElement(tag);
  elemento.className = classe;
  elemento.textContent = texto;
  return elemento;
};

/* ---------- Cards ---------- */

/**
 * Monta o card (<article>) da encomenda com createElement + append.
 * A classe card--{modalidade} define a cor do card no CSS.
 * @param {Encomenda} encomenda
 * @returns {HTMLElement}
 */
function criarCard(encomenda) {
  const { endereco } = encomenda;
  const { rotulo, prazo } = Encomenda.MODALIDADES[encomenda.modalidade];

  const card = criarElemento('article', `card card--${encomenda.modalidade}`);
  card.dataset.codigo = encomenda.codigo;

  const topo = criarElemento('header', 'card__topo');
  topo.append(criarElemento('span', 'card__modalidade', rotulo), criarElemento('span', 'card__codigo', encomenda.codigo));

  const linhaEndereco = criarElemento('p', 'card__endereco', `${endereco.logradouro}, ${endereco.numero} — ${endereco.bairro}, ${endereco.cidade}/${endereco.uf} · `);
  linhaEndereco.append(criarElemento('span', 'card__cep', `CEP ${endereco.cep}`));

  const dados = criarElemento('dl', 'card__dados');
  const itens = [
    ['Peso', `${encomenda.peso.toLocaleString('pt-BR')} kg`],
    ['Frete', Encomenda.formatarMoeda(encomenda.frete)],
    ['Prazo', prazo],
  ];
  itens.forEach(([termo, valor]) => {
    const item = criarElemento('div');
    item.append(criarElemento('dt', '', termo), criarElemento('dd', '', valor));
    dados.append(item);
  });

  // Linha do tempo com as três etapas; atualizarCard() marca a etapa atual
  const rastreio = criarElemento('ol', 'rastreio');
  Encomenda.FLUXO_STATUS.forEach((status) => rastreio.append(criarElemento('li', 'rastreio__etapa', status)));

  const acoes = criarElemento('footer', 'card__acoes');
  const botaoAvancar = criarElemento('button', 'botao botao--primario');
  botaoAvancar.type = 'button';
  botaoAvancar.dataset.acao = 'avancar';
  const botaoExcluir = criarElemento('button', 'botao botao--fantasma', 'Excluir');
  botaoExcluir.type = 'button';
  botaoExcluir.dataset.acao = 'excluir';
  acoes.append(criarElemento('span', 'card__carimbo', 'Entregue'), botaoAvancar, botaoExcluir);

  card.append(
    topo,
    criarElemento('h3', 'card__destinatario', encomenda.destinatario),
    linhaEndereco,
    dados,
    rastreio,
    acoes,
  );
  atualizarCard(card, encomenda);
  return card;
}

/**
 * Mostra no card o status atual: marca as etapas do rastreio e troca o botão
 * (Despachar → Entregar → o botão some quando a encomenda é entregue).
 * @param {HTMLElement} card
 * @param {Encomenda} encomenda
 */
function atualizarCard(card, encomenda) {
  card.classList.toggle('card--entregue', encomenda.foiEntregue);
  card.querySelectorAll('.rastreio__etapa').forEach((etapa, indice) => {
    etapa.classList.toggle('is-concluida', indice <= encomenda.etapa);
    etapa.classList.toggle('is-atual', indice === encomenda.etapa);
  });

  const botaoAvancar = card.querySelector('[data-acao="avancar"]');
  if (encomenda.foiEntregue) {
    botaoAvancar.remove();
  } else {
    botaoAvancar.textContent = ROTULO_ACAO[encomenda.status];
  }
}

/* ---------- Painel e avisos ---------- */

/** Atualiza contadores e faturamento. Chamada depois de toda ação (reatividade da tela). */
function atualizarPainel() {
  indicadores.total.textContent = gerenciador.quantidade;
  indicadores.pendentes.textContent = gerenciador.contarPorStatus('Pendente');
  indicadores.emTransito.textContent = gerenciador.contarPorStatus('Em Trânsito');
  indicadores.entregues.textContent = gerenciador.contarPorStatus('Entregue');
  indicadores.faturamento.textContent = Encomenda.formatarMoeda(gerenciador.faturamentoAcumulado);
  estadoVazio.hidden = gerenciador.quantidade > 0;
}

/**
 * Mostra um aviso temporário no canto da tela: o elemento é criado e removido do DOM.
 * @param {string} texto
 * @param {'sucesso'|'erro'} [tipo='sucesso']
 */
function mostrarAviso(texto, tipo = 'sucesso') {
  const aviso = criarElemento('p', `aviso aviso--${tipo}`, texto);
  areaAvisos.append(aviso);
  setTimeout(() => aviso.remove(), 4000);
}

/* ---------- Consulta de CEP ---------- */

/**
 * Atualiza a mensagem abaixo do CEP; o estado define cor e ícone no CSS.
 * @param {'ocioso'|'carregando'|'sucesso'|'erro'} estado
 * @param {string} texto
 */
function mostrarStatusCep(estado, texto) {
  mensagemCep.dataset.estado = estado;
  mensagemCep.textContent = texto;
}

/**
 * Busca o endereço do CEP digitado e preenche o formulário.
 * - antes do await: estado "carregando" e botão desabilitado;
 * - try: preenche os campos com a resposta da API;
 * - catch: limpa os campos e mostra o erro;
 * - finally: libera o botão, tanto no sucesso quanto no erro.
 */
async function consultarCep() {
  cepConfirmado = '';
  botaoBuscarCep.disabled = true;
  mostrarStatusCep('carregando', 'Consultando a ViaCEP…');

  try {
    const endereco = await buscarEndereco(campos.cep.value);
    campos.logradouro.value = endereco.logradouro;
    campos.bairro.value = endereco.bairro;
    campos.cidade.value = endereco.cidade;
    campos.uf.value = endereco.uf;
    cepConfirmado = endereco.cep;

    // CEP geral de município (cidade pequena) não traz rua nem bairro
    const semRua = !endereco.logradouro || !endereco.bairro;
    mostrarStatusCep('sucesso', semRua
      ? `CEP geral de ${endereco.cidade}/${endereco.uf}: preencha logradouro e bairro.`
      : `Endereço encontrado: ${endereco.cidade}/${endereco.uf}.`);
  } catch (erro) {
    ['logradouro', 'bairro', 'cidade', 'uf'].forEach((nome) => {
      campos[nome].value = '';
    });
    mostrarStatusCep('erro', erro.message);
  } finally {
    botaoBuscarCep.disabled = false;
  }
}

/* ---------- Formulário ---------- */

/** Mostra frete e prazo estimados enquanto o usuário preenche peso e modalidade. */
function atualizarPrevia() {
  const peso = campos.peso.valueAsNumber; // NaN se o campo estiver vazio
  const modalidade = formulario.elements.modalidade.value;
  const pesoValido = peso > 0 && peso <= Encomenda.PESO_MAXIMO;

  previaFrete.textContent = pesoValido ? Encomenda.formatarMoeda(Encomenda.calcularFrete(peso, modalidade)) : 'R$ —';
  previaPrazo.textContent = Encomenda.MODALIDADES[modalidade].prazo;
}

/**
 * Envio do formulário. A validação nativa do HTML já rodou; aqui impedimos o
 * recarregamento da página, criamos a Encomenda, cadastramos no gerenciador
 * e mostramos o card.
 * @param {SubmitEvent} evento
 */
function cadastrarEncomenda(evento) {
  evento.preventDefault();

  // O endereço precisa ser o do CEP que está no campo (ele pode ter mudado depois da busca)
  if (!cepConfirmado || apenasNumeros(campos.cep.value) !== apenasNumeros(cepConfirmado)) {
    mostrarStatusCep('erro', 'Clique em "Buscar" para confirmar o CEP antes de cadastrar.');
    campos.cep.focus();
    return;
  }

  try {
    const encomenda = new Encomenda({
      destinatario: campos.destinatario.value,
      peso: campos.peso.valueAsNumber,
      modalidade: formulario.elements.modalidade.value,
      endereco: {
        cep: cepConfirmado,
        logradouro: campos.logradouro.value,
        numero: campos.numero.value,
        bairro: campos.bairro.value,
        cidade: campos.cidade.value,
        uf: campos.uf.value,
      },
    });
    gerenciador.cadastrar(encomenda);
    listaEncomendas.prepend(criarCard(encomenda));
    atualizarPainel();
    mostrarAviso(`Encomenda ${encomenda.codigo} cadastrada.`);

    formulario.reset();
    cepConfirmado = '';
    mostrarStatusCep('ocioso', MENSAGEM_CEP_INICIAL);
    atualizarPrevia();
  } catch (erro) {
    mostrarAviso(erro.message, 'erro');
  }
}

/**
 * Botões dos cards com delegação de eventos: um único ouvinte na lista
 * atende todos os cards, inclusive os criados depois.
 * @param {MouseEvent} evento
 */
function tratarAcaoDoCard(evento) {
  const botao = evento.target.closest('button[data-acao]');
  if (!botao) return;

  const card = botao.closest('.card');
  const { codigo } = card.dataset;

  if (botao.dataset.acao === 'avancar') {
    atualizarCard(card, gerenciador.avancarStatus(codigo));
  } else if (window.confirm(`Excluir a encomenda ${codigo}?`)) {
    gerenciador.remover(codigo);
    card.remove();
  }
  atualizarPainel();
}

/* ---------- Eventos e estado inicial ---------- */

formulario.addEventListener('submit', cadastrarEncomenda);
formulario.addEventListener('input', atualizarPrevia);
botaoBuscarCep.addEventListener('click', consultarCep);
campos.cep.addEventListener('change', consultarCep); // também busca ao sair do campo
listaEncomendas.addEventListener('click', tratarAcaoDoCard);

atualizarPrevia();
atualizarPainel();
