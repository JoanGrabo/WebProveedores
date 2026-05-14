import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

/** La raíz la gestiona el middleware (sin sesión → login; con sesión → dashboard). */
export default function Home() {
  redirect("/login");
}
