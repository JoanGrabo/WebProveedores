import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Comandas | Portal proveedores",
};

/**
 * Tema claro solo en esta sección: mejor contraste y menos fatiga visual.
 */
export default function ComandasLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-zinc-100 text-zinc-900 antialiased [--radius:0.75rem]">
      {children}
    </div>
  );
}
