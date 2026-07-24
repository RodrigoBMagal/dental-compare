# Dental Compare — contexto do projeto

Comparador de preços de produtos odontológicos. Ver [README.md](README.md) para setup
passo a passo. Este arquivo é sobre **decisões e estado que não são óbvios só lendo o código**.

## Infraestrutura já provisionada

- **GitHub**: [RodrigoBMagal/dental-compare](https://github.com/RodrigoBMagal/dental-compare) (privado)
- **Vercel**: projeto `team8teen/dental-compare` → https://dental-compare-fawn.vercel.app
- **Neon** (Postgres): projeto na conta pessoal do Rodrigo, região `sa-east-1`, endpoint
  `ep-rough-breeze-acus6cc1`
- **Resend**: e-mail de alertas configurado, mas **plano gratuito sem domínio verificado**
  — só envia para o e-mail da conta Resend (rodrigo.bento2010@gmail.com), qualquer outro
  destinatário falha silenciosamente
- **GitHub Secrets configurados**: `DATABASE_URL`, `DATABASE_URL_SURYA`, `RESEND_API_KEY`,
  `ALERTS_FROM_EMAIL`
- **Runner auto-hospedado**: container Docker `gh-runner-dental-compare` rodando no notebook
  Umbrel do Rodrigo (labels `self-hosted, umbrel, surya`), só usado pelo job `scrape-surya`

## Coleta automática

Workflow `.github/workflows/scrape.yml` roda 6x/dia (8h-23h horário de Brasília, a cada 3h).
Dois jobs independentes:
- `scrape`: as 5 lojas confiáveis, roda em runner do GitHub (nuvem)
- `scrape-surya`: só a Surya Dental, precisa do runner auto-hospedado

## Gotchas resolvidos (não repetir a investigação)

1. **Build do Next.js falhava no Windows** (`EPERM` escaneando `USERPROFILE`) — corrigido em
   `apps/web/next.config.mjs` redirecionando `USERPROFILE` pra uma pasta vazia durante o build.
2. **Prisma Client gerado pra plataforma errada na Vercel** — resolvido usando o local padrão
   do Prisma (`node_modules/@prisma/client`) em vez de um `output` customizado; `packages/db`
   agora só reexporta `@prisma/client` (ver `packages/db/index.js`).
3. **Neon rejeita conexão quando SNI e `?options=endpoint=` não batem** ("Inconsistent project
   name inferred from SNI") — se for usar esse parâmetro de novo, o valor tem que incluir o
   sufixo `-pooler` exatamente igual ao hostname usado.
4. **Motor do Prisma falha especificamente no runner do Umbrel** mesmo com a connection string
   correta (raiz não totalmente identificada — TCP/TLS/psql funcionam, só o engine do Prisma
   não). Contornado: `packages/scraper/src/ingestSurya.ts` usa `pg` (node-postgres) direto em
   vez de `@dental-compare/db`/Prisma.
5. **Surya Dental bloqueia por detecção de headless browser**, não só por IP — mesmo rodando
   do runner residencial (Umbrel), a Akamai retorna "Access Denied" pro Playwright headless.
   Precisaria de anti-detecção (Chromium não-headless com display virtual, patch de
   fingerprint) pra resolver — não tentado ainda. Ver comentário em
   `packages/scraper/src/stores/suryaDental.ts`.

## Convenções

- Scrapers HTTP simples em `packages/scraper/src/stores/*.ts` implementam `StoreAdapter`
  (ver `types.ts`). Lojas que bloqueiam requisição simples usam `fetchHtmlViaBrowser`
  (Playwright) em vez de `fetchHtml`.
- `experimentalStoreAdapters` (hoje só Surya) fica fora do `storeAdapters` padrão — não
  entra na coleta/ingest normal, só no `ingest:surya` dedicado.
