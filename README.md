# Dental Compare

Comparador de preços de produtos odontológicos entre Dental Borges, Dental Integra, Dental
Speed, Dental Cremer e Orto Jaspe (Surya Dental tem suporte experimental — veja abaixo).

## Como funciona

- `packages/scraper` — um adaptador por loja que busca produtos e preços. A maioria usa
  requisições HTTP simples; Dental Speed e Dental Cremer usam um navegador headless
  (Playwright) porque bloqueiam clientes HTTP comuns.
- `packages/db` — schema Prisma (Postgres) com as tabelas de lojas, produtos, preços e alertas.
- `apps/web` — app Next.js com busca e comparação de preços, além do cadastro de alertas.
- `.github/workflows/scrape.yml` — roda a coleta de preços e a verificação de alertas 6x/dia.

A coleta de preços roda em segundo plano (GitHub Actions), grava no banco, e o site apenas lê
esses dados — assim a busca do usuário é instantânea e nenhuma loja é sobrecarregada com
requisições em tempo real.

### Sobre a Surya Dental

A Surya Dental usa uma proteção anti-bot (Akamai) que bloqueia IPs de datacenter/nuvem — os
mesmos usados por GitHub Actions, Vercel, etc. Rodar de uma rede residencial contorna o
bloqueio por IP, mas a Akamai também parece detectar que o navegador é headless (retorna
"Access Denied" em vez do conteúdo mesmo com IP residencial). O adaptador
(`packages/scraper/src/stores/suryaDental.ts`) fica de fora da coleta automática por
padrão — veja `experimentalStoreAdapters` em `packages/scraper/src/index.ts` e o
comentário no próprio arquivo.

### Coleta e alertas auto-hospedados (runner próprio)

O job `scrape-surya` e o job `check-alerts` rodam num runner auto-hospedado do GitHub
Actions (não na nuvem), pensado pra uma máquina em casa (ex: Umbrel):

```bash
# gera um token de registro em Settings → Actions → Runners → New self-hosted runner,
# ou via API: gh api -X POST repos/<owner>/<repo>/actions/runners/registration-token
docker run -d --restart unless-stopped --name gh-runner-dental-compare \
  -e REPO_URL="https://github.com/<owner>/<repo>" \
  -e RUNNER_NAME="meu-runner" \
  -e RUNNER_TOKEN="<token>" \
  -e LABELS="self-hosted,umbrel,surya" \
  -e RUNNER_WORKDIR="/tmp/runner/work" \
  -v /tmp/runner/work:/tmp/runner/work \
  myoung34/github-runner:latest
```

`DATABASE_URL_SURYA` precisa incluir um override de endpoint do Neon
(`?options=endpoint=<endpoint-id>-pooler`, com o mesmo sufixo `-pooler` do hostname) —
sem isso o Neon rejeita a conexão vinda desse ambiente Docker específico. Ver
[CLAUDE.md](CLAUDE.md) para os detalhes da investigação.

## Setup

### 1. Banco de dados (gratuito)

Crie um banco Postgres gratuito em [Neon](https://neon.tech) ou [Supabase](https://supabase.com)
e copie a connection string.

```bash
cp packages/db/.env.example packages/db/.env
# edite packages/db/.env e cole seu DATABASE_URL
```

Rode a primeira migração (cria as tabelas):

```bash
npm install
cd packages/db && npx prisma migrate dev --name init && cd ../..
```

### 2. E-mail de alertas (gratuito, via Gmail)

Os e-mails de alerta são enviados pelo SMTP do Gmail a partir do runner auto-hospedado
(ver seção "Coleta auto-hospedada" abaixo) — não depende de nenhum serviço terceiro:

1. Ative a verificação em duas etapas na conta Google: https://myaccount.google.com/security
2. Gere uma "Senha de app" em https://myaccount.google.com/apppasswords
3. Guarde o e-mail da conta e a senha de app gerada (vai virar secret no GitHub)

### 3. Variáveis de ambiente

- `apps/web/.env.local`:
  ```
  DATABASE_URL="<sua connection string do Neon/Supabase>"
  ```
- Secrets do repositório no GitHub (Settings → Secrets and variables → Actions):
  - `DATABASE_URL`
  - `DATABASE_URL_SURYA` (ver seção do runner auto-hospedado)
  - `GMAIL_USER`
  - `GMAIL_APP_PASSWORD`

### 4. Rodar localmente

```bash
npm install
npx playwright install chromium   # necessário para Dental Speed/Cremer
npm run db:generate
npm run --workspace=packages/scraper ingest   # popula o banco com uma primeira coleta
npm run dev                                   # abre o site em http://localhost:3000
```

### 5. Deploy

- **Site**: deploy do `apps/web` na [Vercel](https://vercel.com) (plano gratuito), configurando
  `DATABASE_URL` nas variáveis de ambiente do projeto.
- **Coleta periódica**: o workflow `.github/workflows/scrape.yml` já roda 6x/dia automaticamente
  assim que os secrets estiverem configurados no GitHub. Também pode ser disparado manualmente
  pela aba Actions ("Run workflow"). Os jobs `scrape-surya` e `check-alerts` só rodam se o
  runner auto-hospedado estiver online.

## Limitações conhecidas (MVP)

- **Sem agrupamento automático entre lojas**: cada linha da tabela é o produto exatamente como
  aparece na loja. Nomes iguais/parecidos em lojas diferentes não são unificados automaticamente
  ainda — é preciso comparar visualmente.
- **Cobertura por termo de busca**: a coleta roda sobre uma lista de termos rastreados (que
  cresce conforme os usuários buscam), não o catálogo inteiro de cada loja.
- **Surya Dental**: ver seção acima.
- **Alertas dependem do runner auto-hospedado estar ligado**: se a máquina em casa estiver
  desligada, os e-mails de alerta simplesmente não são verificados naquele ciclo (não é uma
  falha silenciosa — o job fica visível como não executado na aba Actions).
