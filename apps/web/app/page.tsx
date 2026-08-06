import { auth } from "@/auth";
import { SearchPage } from "@/components/SearchPage";

export default async function Home() {
  const session = await auth();
  return <SearchPage isLoggedIn={Boolean(session?.user)} />;
}
