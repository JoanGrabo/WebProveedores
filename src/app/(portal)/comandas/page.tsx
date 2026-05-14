import { ComandasExplorer } from "./ComandasExplorer";

export const dynamic = "force-dynamic";

type ComandasPageProps = {
  searchParams: { proveedor?: string; comanda?: string };
};

export default function ComandasPage({ searchParams }: ComandasPageProps) {
  const proveedor = typeof searchParams.proveedor === "string" ? searchParams.proveedor : undefined;
  const comanda = typeof searchParams.comanda === "string" ? searchParams.comanda : undefined;

  return <ComandasExplorer initialProveedor={proveedor} initialComanda={comanda} />;
}
