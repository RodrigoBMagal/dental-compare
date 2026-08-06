import NextAuth from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import Nodemailer from "next-auth/providers/nodemailer";
import { prisma } from "@/lib/db";

// Magic-link only: no passwords to store, reset or leak, and it reuses the same
// Gmail SMTP relay the price alerts already send through.
//
// Route protection is done per-page with `auth()` in server components rather
// than in middleware — middleware runs on the edge runtime, where the Prisma
// adapter can't open a database connection.
export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
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
