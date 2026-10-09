# RotaExpress — Gestão de Encomendas e Frete

Projeto 01 · Aplicação Front-end Dinâmica · Desenvolvimento Web — CEUB, 2º/2026

- **Aplicação online:** https://marcoamarques2006-ui.github.io/rotaexpress/
- **Repositório:** https://github.com/marcoamarques2006-ui/rotaexpress

## Identificação

| Campo | Informação |
| --- | --- |
| Aluno | Marco Antônio Marques Monte |
| Matrícula (RA) | 22503865 |
| Curso | Ciência da Computação |
| Disciplina | Desenvolvimento Web |
| Professor | Maurízio |
| Tema escolhido | **Opção A — RotaExpress** (Sistema de Gestão de Encomendas e Frete) |

## Descrição

O RotaExpress é uma aplicação web para triagem, despacho e precificação de encomendas. O usuário cadastra o pacote (destinatário, peso e modalidade), informa o CEP e o endereço é completado pela API ViaCEP. Cada encomenda vira um card com frete, prazo e uma linha do tempo de status que avança de **Pendente → Em Trânsito → Entregue**. O painel no topo mostra os contadores por status e o faturamento acumulado, sempre atualizados.

Feito com HTML5 semântico, CSS3 puro (Flexbox + Grid) e JavaScript ES6+ orientado a objetos, sem nenhuma biblioteca ou framework.

## Guia rápido de execução

1. Descompacte o arquivo `.zip`.
2. Abra a pasta `rotaexpress` e dê dois cliques em `index.html` — ou, no VS Code, clique com o botão direito no arquivo e escolha **Open with Live Server**.
3. Mantenha a internet ligada: a busca de endereço consulta a ViaCEP.

Não há instalação nem dependências.

### Roteiro de teste sugerido

1. Preencha destinatário e peso, escolha uma modalidade e veja a **prévia do frete** mudar.
2. Digite um CEP e clique em **Buscar** (a busca também acontece ao sair do campo):

   | CEP | O que demonstra |
   | --- | --- |
   | `70790-075` | Endereço completo (CEUB, Asa Norte — Brasília/DF) |
   | `01310-100` | Endereço completo (Av. Paulista — São Paulo/SP) |
   | `73850-000` | CEP geral de município (Cristalina/GO): rua e bairro são digitados à mão |
   | `99999-999` | CEP inexistente: mensagem de erro e cadastro bloqueado |

3. Informe o número e clique em **Cadastrar encomenda**: o card aparece sem recarregar a página.
4. No card, clique em **Despachar** e depois em **Entregar**, e acompanhe a linha do tempo e os contadores.
5. Exclua um card e veja o faturamento ser recalculado.
6. Para ver o tratamento de falha, desligue a internet (ou ative o modo *Offline* no DevTools) e busque um CEP.

## Regras de negócio

**Frete** (`Encomenda.calcularFrete`):

```
frete = (R$ 9,90 de taxa fixa + R$ 3,50 × peso em kg) × fator da modalidade
```

| Modalidade | Fator | Prazo estimado |
| --- | --- | --- |
| Econômica | 1,0 | 7 a 10 dias úteis |
| Padrão | 1,4 | 3 a 5 dias úteis |
| Expressa | 2,0 | 1 a 2 dias úteis |

Exemplo: 2 kg na Expressa → (9,90 + 7,00) × 2,0 = **R$ 33,80**.

**Status:** toda encomenda nasce *Pendente* e avança uma etapa por vez até *Entregue*. Não existe setter: o status só muda pelo método `avancarStatus()`.

**Cadastro:** nome com pelo menos 3 letras, peso entre 0,1 e 30 kg, modalidade válida e endereço completo de um CEP confirmado na ViaCEP. As regras são conferidas no formulário (validação nativa) e de novo no construtor da classe.

**Faturamento acumulado:** soma dos fretes das encomendas cadastradas. Excluir uma encomenda retira o frete dela da soma.

## Organização do código (`js/script.js`)

| Parte | Responsabilidade |
| --- | --- |
| `class Encomenda` | Entidade. Campos privados `#codigo`, `#destinatario`, `#peso`, `#modalidade`, `#endereco` e `#status`; getters de leitura; método de negócio `avancarStatus()`; estáticos `calcularFrete()`, `modalidadeValida()`, `formatarMoeda()` e o privado `#gerarCodigo()`. |
| `class GerenciadorLogistica` | Gerenciador. Coleção privada `#encomendas`; `cadastrar()`, `buscar()`, `avancarStatus()`, `remover()`, `contarPorStatus()`; getters `quantidade` e `faturamentoAcumulado`; estático `somarFretes()`. |
| `async function buscarEndereco()` | Consulta a ViaCEP com `fetch` + `await` e transforma cada falha (CEP inválido, inexistente, sem conexão) em uma mensagem para a tela. |
| Interface | `consultarCep()` (carregando / sucesso / erro com `try/catch/finally`), `criarCard()` e `atualizarCard()` (`createElement`, `append`, `remove`), cadastro com `preventDefault()` e atualização do painel após cada ação. |

## Requisitos do edital × implementação

| Requisito | Onde está |
| --- | --- |
| HTML5 semântico | `header`, `main`, `section`, `article` (cards), `footer`, além de `fieldset`/`legend`, `dl` e `output` |
| Formulário rotulado e com validação nativa | `<label for>` em todos os campos; `required`, `type`, `placeholder`, `min`, `max`, `pattern` |
| CSS puro com Flexbox e Grid | áreas de grid no layout, grade de 6 colunas no formulário, flex nos cards, botões e cabeçalho |
| Media queries nas três faixas | até 480px, de 481px a 768px e a partir de 769px (seção 11 do CSS) |
| ES6+: `const`/`let`, arrow functions, template literals | todo o `script.js`, sem `var` |
| POO: duas classes com `constructor`, campos `#privados`, getters e `static` | `Encomenda` e `GerenciadorLogistica` |
| DOM dinâmico e `preventDefault()` | `criarCard()`, `atualizarCard()`, `tratarAcaoDoCard()`, `cadastrarEncomenda()` |
| Fetch com `async/await`, `try/catch/finally` e feedback visual | `buscarEndereco()` e `consultarCep()` |
| Comentários | JSDoc nas classes, nos métodos de negócio e nas funções assíncronas |

## Estrutura de pastas

```
rotaexpress/
├── index.html      → página principal (estrutura semântica)
├── README.md       → este documento
├── css/
│   └── style.css   → estilos autorais e responsivos
└── js/
    └── script.js   → classes POO, consumo da ViaCEP e manipulação do DOM
```

## Créditos

Endereços fornecidos pela API pública [ViaCEP](https://viacep.com.br/).
