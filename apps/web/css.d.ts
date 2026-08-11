// Declaração ambiental para importações de CSS global (ex.: `import "./globals.css"`
// no layout). O pacote `next` só declara `*.module.css` — o CSS puro funciona sem
// declaração porque o tsc não verifica imports de side-effect por padrão, mas quando
// `noUncheckedSideEffectImports` está habilitado (tsconfig/editor), o tsc acusa
// "Cannot find module './globals.css' or its corresponding type declarations".
// Este arquivo cobre esse caso sem depender dos types gerados do Next.
declare module "*.css";
