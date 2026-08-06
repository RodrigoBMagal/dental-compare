import { redirect } from "next/navigation";
import { auth, signIn } from "@/auth";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ enviado?: string; error?: string }>;
}) {
  const session = await auth();
  if (session?.user) redirect("/lista");

  const params = await searchParams;

  return (
    <main>
      <h1>Entrar</h1>
      <p className="subtitle">
        Digite seu e-mail e enviamos um link de acesso — sem senha para criar ou lembrar.
      </p>

      {params.enviado === "1" && (
        <div className="notice">
          Link enviado! Confira sua caixa de entrada (e o spam) e clique no link para entrar.
        </div>
      )}

      {params.error && (
        <div className="notice">
          Não foi possível enviar o link. Confira o e-mail digitado e tente novamente.
        </div>
      )}

      <form
        className="search-form"
        action={async (formData: FormData) => {
          "use server";
          const email = String(formData.get("email") ?? "").trim();
          await signIn("nodemailer", { email, redirectTo: "/lista" });
        }}
      >
        <input type="email" name="email" placeholder="seu@email.com" required autoFocus />
        <button type="submit">Enviar link</button>
      </form>
    </main>
  );
}
