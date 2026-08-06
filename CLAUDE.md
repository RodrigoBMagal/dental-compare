# Dental Compare — contexto do projeto

Comparador de preços de produtos odontológicos. Ver [README.md](README.md) para setup
passo a passo. Este arquivo é sobre **decisões e estado que não são óbvios só lendo o código**.

## Infraestrutura já provisionada

- **GitHub**: [RodrigoBMagal/dental-compare](https://github.com/RodrigoBMagal/dental-compare) (privado)
- **Vercel**: projeto `team8teen/dental-compare` → https://dental-compare-fawn.vercel.app
- **Neon** (Postgres): projeto na conta pessoal do Rodrigo, região `sa-east-1`, endpoint
  `ep-rough-breeze-acus6cc1`
- **E-mail de alertas**: enviado via SMTP do Gmail (`nodemailer`, conta rodrigo.bento2010@gmail.com
  com senha de app) a partir do runner auto-hospedado — não usa mais Resend (trocado porque o
  objetivo era rodar no servidor caseiro; Resend exigiria domínio verificado pra sair do limite
  de "só envia pra si mesmo" e não resolveria isso de qualquer forma)
- **GitHub Secrets configurados**: `DATABASE_URL`, `DATABASE_URL_SURYA`, `GMAIL_USER`,
  `GMAIL_APP_PASSWORD`
- **Vercel env vars**: `DATABASE_URL`, `AUTH_SECRET`, `GMAIL_USER`, `GMAIL_APP_PASSWORD`
  (as duas últimas são para o link mágico de login, que sai do site e não do runner)
- **Contas de usuário**: Auth.js v5 com link mágico por e-mail (sem senha). Cadastro é
  **aberto** — qualquer pessoa com o link pode criar conta. Se precisar restringir, dá pra
  filtrar por lista de e-mails permitidos no callback `signIn`.
- **Runner auto-hospedado**: container Docker `gh-runner-dental-compare` rodando no notebook
  Umbrel do Rodrigo (labels `self-hosted, umbrel, surya`), usado pelos jobs `scrape-surya` e
  `check-alerts`

## Coleta automática

Workflow `.github/workflows/scrape.yml` roda 6x/dia (8h-23h horário de Brasília, a cada 3h).
Três jobs:
- `scrape`: as 5 lojas confiáveis, roda em runner do GitHub (nuvem)
- `scrape-surya`: só a Surya Dental, precisa do runner auto-hospedado (best-effort, não
  bloqueia os outros jobs se falhar/estiver offline)
- `check-alerts`: verifica alertas de preço e manda e-mail via Gmail SMTP; roda depois de
  `scrape` (pra checar contra preços frescos), também no runner auto-hospedado

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
   não). Contornado: `ingestSurya.ts` e `checkAlerts.ts` usam `pg` (node-postgres) direto em
   vez de `@dental-compare/db`/Prisma — qualquer script novo que rode nesse runner deve
   seguir o mesmo padrão.
5. **E-mail direto de IP residencial não é confiável** (Gmail/Outlook filtram/rejeitam) — por
   isso `checkAlerts.ts` usa o SMTP do Gmail como relay em vez de tentar mandar diretamente.
6. **Provider Nodemailer do Auth.js quebra no build** — ele resolve o `nodemailer` por um
   import interno que a interop CJS do webpack embaralha, deixando `createTransport`
   indefinido em produção (`serverExternalPackages` e `outputFileTracingIncludes` sozinhos
   não resolvem). Corrigido passando um `sendVerificationRequest` próprio em `auth.ts`, que
   importa o nodemailer no topo do módulo. Bônus: o e-mail fica em português.
7. **Surya Dental bloqueia por detecção de headless browser**, não só por IP — mesmo rodando
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
- Rotas protegidas checam a sessão com `auth()` direto no server component (ver
  `app/lista/page.tsx`), **não** em middleware — middleware roda no edge runtime, onde o
  adapter do Prisma não consegue abrir conexão com o banco.
- A lista de compras guarda `priceAtAdd` em cada item pra conseguir mostrar a variação; o
  preço atual sempre vem do `PriceSnapshot` mais recente. O total é soma simples entre
  lojas — comparar "tudo na loja A vs loja B" exigiria casar produtos equivalentes entre
  lojas, que é a limitação de agrupamento ainda em aberto.
