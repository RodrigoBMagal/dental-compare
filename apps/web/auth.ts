import NextAuth from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import Nodemailer from "next-auth/providers/nodemailer";
import nodemailer from "nodemailer";
import { prisma } from "@/lib/db";

// Magic-link only: no passwords to store, reset or leak, and it reuses the same
// Gmail SMTP relay the price alerts already send through.
//
// Route protection is done per-page with `auth()` in server components rather
// than in middleware — middleware runs on the edge runtime, where the Prisma
// adapter can't open a database connection.
export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  // Vercel enables this automatically, but setting it explicitly means a local
  // production build (`next start`) behaves the same instead of failing with
  // UntrustedHost. Safe here because the app is only ever served from hosts we
  // control.
  trustHost: true,
  providers: [
    Nodemailer({
      server: {
        service: "gmail",
        auth: {
          user: process.env.GMAIL_USER,
          pass: process.env.GMAIL_APP_PASSWORD,
        },
      },
      from: `Dental Compare <${process.env.GMAIL_USER}>`,
      // Overriding the default implementation on purpose. Auth.js imports
      // nodemailer internally in a way webpack's CJS interop mangles, leaving
      // `createTransport` undefined once deployed. Importing it ourselves at the
      // top of this module resolves correctly — and lets the email be written in
      // Portuguese instead of the English default.
      async sendVerificationRequest({ identifier, url, provider }) {
        const transport = nodemailer.createTransport(provider.server);
        await transport.sendMail({
          to: identifier,
          from: provider.from,
          subject: "Seu link de acesso — Dental Compare",
          text: `Entre no Dental Compare com este link (válido por 24h):\n${url}\n\nSe você não pediu este acesso, ignore este e-mail.`,
          html: `
            <div style="font-family:system-ui,-apple-system,'Segoe UI',Roboto,sans-serif;max-width:480px;margin:0 auto;padding:24px;color:#3a3733">
              <h2 style="color:#2f4a44;font-size:20px;margin:0 0 8px">Entrar no Dental Compare</h2>
              <p style="color:#8a8580;margin:0 0 24px">Clique no botão abaixo para acessar sua conta. O link vale por 24 horas.</p>
              <p style="margin:0 0 24px">
                <a href="${url}" style="display:inline-block;background:#6d9c8f;color:#fff;text-decoration:none;font-weight:600;padding:12px 24px;border-radius:14px">Entrar</a>
              </p>
              <p style="color:#8a8580;font-size:13px;margin:0">Se você não pediu este acesso, é só ignorar este e-mail.</p>
            </div>
          `,
        });
      },
    }),
  ],
  pages: {
    signIn: "/login",
    verifyRequest: "/login?enviado=1",
  },
  callbacks: {
    session({ session, user }) {
      session.user.id = user.id;
      return session;
    },
  },
});
