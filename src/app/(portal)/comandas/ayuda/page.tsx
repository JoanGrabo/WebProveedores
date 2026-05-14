import Link from "next/link";

export const dynamic = "force-dynamic";

export default function ComandasAyudaProveedorPage() {
  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <header className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm sm:p-8">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-sky-600">Ayuda</p>
        <h1 className="mt-2 text-2xl font-bold tracking-tight text-zinc-900">Cómo usar comandas</h1>
        <p className="mt-3 text-sm leading-relaxed text-zinc-600">
          Resumen para cuando entras como proveedor: pocos pasos y los mismos colores que en la pantalla principal.
        </p>
        <p className="mt-4 text-sm">
          <Link href="/comandas" className="font-medium text-sky-600 hover:text-sky-800">
            ← Volver a comandas
          </Link>
        </p>
      </header>

      <ol className="list-decimal space-y-6 rounded-2xl border border-zinc-200 bg-white p-6 pl-9 text-sm leading-relaxed text-zinc-700 shadow-sm sm:p-8 sm:pl-10">
        <li>
          En <strong className="text-zinc-900">Tus comandas</strong>, elige el <strong className="text-zinc-900">número de comanda</strong>. Se cargan las líneas arriba.
        </li>
        <li>
          Toca las tarjetas en <strong className="text-zinc-900">gris</strong> (pendientes) o <strong className="text-rose-800">rojo</strong> (declinadas por la empresa) y pulsa{" "}
          <strong className="text-orange-700">Enviar selección</strong>. Pasan a <strong className="text-orange-800">naranja</strong>: quedan a la espera de que administración las confirme.
        </li>
        <li>
          Si una línea está en naranja y <strong className="text-zinc-900">aún no</strong> la han confirmado, puedes seleccionarla y pulsar <strong className="text-zinc-900">Quitar envío</strong> para volver a pendiente y corregir.
        </li>
        <li>
          Cuando administración confirma recepción, la línea pasa a <strong className="text-emerald-800">verde</strong>. No hace falta que hagas nada más en esa línea.
        </li>
      </ol>

      <p className="text-center text-xs text-zinc-400">
        ¿Dudas con tu cuenta? Contacta con administración.
      </p>
    </div>
  );
}
