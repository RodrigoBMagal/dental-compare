import Link from "next/link";
import { auth, signOut } from "@/auth";

export async function SiteHeader() {
  const session = await auth();

  return (
    <header className="site-header">
      <Link href="/" className="site-brand">
        Dental Compare
      </Link>

      <nav className="site-nav">
        {session?.user ? (
          <>
            <Link href="/lista" className="site-nav-link">
              Minha lista
            </Link>
            <span className="site-nav-email">{session.user.email}</span>
            <form
              action={async () => {
                "use server";
                await signOut({ redirectTo: "/" });
              }}
            >
              <button type="submit" className="link-btn">
                Sair
              </button>
            </form>
          </>
        ) : (
          <Link href="/login" className="site-nav-link">
            Entrar
          </Link>
        )}
      </nav>
    </header>
  );
}
