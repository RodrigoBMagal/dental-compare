# Dental Compare

Comparador de preços de produtos odontológicos entre Dental Borges, Dental Integra, Dental
Speed, Dental Cremer e Orto Jaspe (Surya Dental tem suporte experimental — veja abaixo).

## Como funciona

- `packages/scraper` — um adaptador por loja que busca produtos e preços. A maioria usa
  requisições HTTP simples; Dental Speed e Dental Cremer usam um navegador headless
  (Playwright) porque bloqueiam clientes HTTP comuns.
- `packages/db` — schema Prisma (Postgres) com as tabelas de lojas, produtos, preços e alertas.
- `apps/web` — app Next.js com busca e comparação de preços, além do cadastro de alertas.
- `.github/workflows/scrape.yml` — roda a coleta de preços e a verificação de alertas 2x/dia.

A coleta de preços roda em segundo plano (GitHub Actions), grava no banco, e o site apenas lê
esses dados — assim a busca do usuário é instantânea e nenhuma loja é sobrecarregada com
requisições em tempo real.

### Sobre a Surya Dental

A Surya Dental usa uma proteção anti-bot (Akamai) que bloqueia IPs de datacenter/nuvem — os
mesmos usados por GitHub Actions, Vercel, etc. O adaptador (`packages/scraper/src/stores/suryaDental.ts`)
está pronto e funciona rodando de uma rede residencial (ex: sua casa), mas fica de fora da
coleta automática por padrão. Veja `experimentalStoreAdapters` em `packages/scraper/src/index.ts`.

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

### 2. E-mail de alertas (gratuito)

Crie uma conta grátis em [Resend](https://resend.com) e gere uma API key.

### 3. Variáveis de ambiente

- `apps/web/.env.local`:
  ```
  DATABASE_URL="<sua connection string do Neon/Supabase>"
  ```
- Secrets do repositório no GitHub (Settings → Secrets and variables → Actions):
  - `DATABASE_URL`
  - `RESEND_API_KEY`
  - `ALERTS_FROM_EMAIL` (opcional, ex: `Dental Compare <alertas@seudominio.com>`)

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
- **Coleta periódica**: o workflow `.github/workflows/scrape.yml` já roda 2x/dia automaticamente
  assim que os secrets estiverem configurados no GitHub. Também pode ser disparado manualmente
  pela aba Actions ("Run workflow").

## Limitações conhecidas (MVP)

- **Sem agrupamento automático entre lojas**: cada linha da tabela é o produto exatamente como
  aparece na loja. Nomes iguais/parecidos em lojas diferentes não são unificados automaticamente
  ainda — é preciso comparar visualmente.
- **Cobertura por termo de busca**: a coleta roda sobre uma lista de termos rastreados (que
  cresce conforme os usuários buscam), não o catálogo inteiro de cada loja.
- **Surya Dental**: ver seção acima.
- **Envio de e-mail (Resend)**: enquanto nenhum domínio próprio for verificado no Resend, o
  plano gratuito só permite enviar alertas para o e-mail usado no cadastro da conta Resend —
  qualquer outro destinatário falha silenciosamente no envio. Para liberar alertas para
  qualquer e-mail de cliente, verifique um domínio em resend.com/domains e atualize
  `ALERTS_FROM_EMAIL` para usar esse domínio.
