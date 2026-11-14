# Enquete Política

Plataforma de gestão de campanha política: cadastro e segmentação de eleitores,
enquetes com resposta por link público ou por conversa no WhatsApp, captação de
eleitores por QR Code de coordenador, disparo de mensagens em massa, painéis de
resultado em tempo real e relatórios de desempenho por coordenador.

O sistema é multi-inquilino: cada **político** é uma unidade isolada de dados, e
um parceiro que adquire o sistema recebe acesso restrito ao político vinculado a
ele. Detalhes em `docs/07-rls-e-policies.md`.

---

## 1. Stack

| Camada | Tecnologia |
|---|---|
| Framework | TanStack Start v1 (React 19, SSR + server functions) |
| Roteamento | TanStack Router (roteamento por arquivo em `src/routes`) |
| Build | Vite 7 |
| Estilo | Tailwind CSS v4 (tokens em `src/styles.css`) + shadcn/ui |
| Dados no cliente | TanStack Query v5 |
| Banco | PostgreSQL gerenciado (Supabase), com Row Level Security |
| Execução em produção | Worker de borda (Cloudflare) |
| WhatsApp | Z-API (REST) |
| IA | Gateway de modelos compatível com OpenAI |

A lista completa de dependências, versão por versão e com o local de uso de
cada uma, está em `docs/23-configuracoes.md`.

## 2. Pré-requisitos

| Item | Versão recomendada | Observação |
|---|---|---|
| Node.js | 22 LTS (validado em 22.x) | Mínimo 20.19. Vite 7 não suporta Node 18. |
| Bun | 1.1 ou superior | Gerenciador usado no projeto (`bun.lock`). npm funciona. |
| Projeto PostgreSQL | Supabase (ou Postgres 15+ com PostgREST) | Extensões `pgcrypto` e `unaccent` |
| Conta Z-API | instância conectada | Opcional para rodar local sem WhatsApp |

## 3. Instalação

```bash
git clone <url-do-repositorio>
cd <pasta-do-projeto>

bun install          # ou: npm install
cp .env.example .env # preencha os valores do seu backend
```

Cada variável de `.env.example` está explicada em
`docs/24-variaveis-de-ambiente.md`. O arquivo `.env` **nunca** deve ser
versionado.

## 4. Banco de dados

O schema não é criado por script de seed: ele é a soma das migrations em
`supabase/migrations/`, aplicadas em ordem cronológica de nome.

```bash
# com a CLI oficial, apontando para o seu projeto
supabase link --project-ref <ref-do-seu-projeto>
supabase db push
```

Aplicar as 39 migrations em um banco vazio reconstrói tabelas, tipos,
funções, triggers, policies, GRANTs e índices — schema idêntico ao de produção.
O procedimento completo, incluindo bucket de mídia, configuração de
autenticação e checklist de validação, está em
`docs/30-migracao-infra-propria.md`.

## 5. Execução

| Comando | O que faz |
|---|---|
| `bun run dev` | Servidor de desenvolvimento com HMR (porta 8080) |
| `bun run build` | Build de produção (SSR + cliente, alvo worker de borda) |
| `bun run build:dev` | Build em modo desenvolvimento, útil para diagnóstico |
| `bun run preview` | Serve localmente o resultado do build |
| `bun run lint` | ESLint em todo o repositório |
| `bun run format` | Prettier com escrita |

```bash
bun run dev   # http://localhost:8080
```

O **primeiro usuário cadastrado** na instância recebe automaticamente o papel de
administrador (trigger `handle_new_user`). Os seguintes entram como
visualizador até que um administrador altere o papel.

## 6. Estrutura do repositório

```text
src/
  routes/                 rotas (o nome do arquivo define a URL)
    __root.tsx            layout raiz
    _authenticated/       painel protegido por sessão
    api/public/           endpoints HTTP públicos (webhook, telemetria)
  components/             componentes de domínio
    ui/                   design system shadcn/ui
    wizards/              assistentes de cadastro
  lib/                    server functions, helpers, máscaras, tema, exportação
  integrations/supabase/  clientes e tipos do banco (gerados — não editar)
  styles.css              tokens de design e temas claro/escuro
supabase/migrations/      histórico SQL: fonte de verdade do schema
scripts/                  geradores da documentação
docs/                     documentação técnica completa
```

Mapa detalhado em `docs/02-mapa-do-projeto.md`; inventário arquivo por arquivo
em `docs/03-inventario-de-arquivos.md`.

## 7. Convenções que importam

- `*.functions.ts` — exporta server functions; pode ser importado por componentes.
- `*.server.ts` — código exclusivo de servidor; o build proíbe que chegue ao navegador.
- Segredos são lidos **dentro** do handler, nunca no escopo do módulo.
- Cores sempre por token semântico. Nunca `text-white`, `bg-black` ou hex fixo:
  isso quebra o tema claro.
- Toda tabela nova precisa de `GRANT` + RLS + policies na **mesma** migration.
- Papel de usuário mora em `user_roles`, nunca em `profiles`.

## 8. Documentação

Comece por `docs/00-INDICE.md`. Destaques:

| Documento | Conteúdo |
|---|---|
| `01-visao-geral.md` | O que é, para quem, arquitetura |
| `05-paginas-e-rotas.md` | Todas as rotas e permissões |
| `06-banco-de-dados.md` | Tabelas campo a campo e diagrama ER |
| `07-rls-e-policies.md` | Isolamento multi-inquilino |
| `10-autenticacao-autorizacao.md` | Login, papéis, provisionamento de parceiro |
| `21-regras-de-negocio.md` | Catálogo numerado de regras |
| `22-fluxos-completos.md` | Fluxos ponta a ponta |
| `27-guia-novo-desenvolvedor.md` | Do zero ao ambiente rodando |
| `30-migracao-infra-propria.md` | Runbook de migração de infraestrutura |
| `apendice/` | Código-fonte integral, gerado por script |

Os documentos de banco, mapa, inventário e migrations são **gerados**:

```bash
node scripts/gerar-inventario.mjs
node scripts/gerar-docs-migrations.mjs
node scripts/gerar-apendice-codigo.mjs
python3 scripts/gerar-docs-banco.py   # requer acesso de leitura ao banco
```

## 9. Aviso legal e privacidade

O sistema processa dados pessoais de eleitores (nome, telefone, CPF/RG,
endereço, dados eleitorais). O consentimento LGPD é obrigatório em todo ponto de
coleta pública e fica registrado no banco. Antes de operar em produção, revise
`docs/20-seguranca.md` e a política de privacidade exibida ao eleitor.