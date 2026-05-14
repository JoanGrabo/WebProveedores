"use client";

import Link from "next/link";
import { FormEvent, useCallback, useEffect, useState } from "react";

const inputClass =
  "mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-500 shadow-inner focus:border-violet-400 focus:outline-none focus:ring-1 focus:ring-violet-300";
const selectClass =
  "mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 shadow-inner focus:border-violet-400 focus:outline-none focus:ring-1 focus:ring-violet-300";

type Me = {
  id: string;
  email: string;
  usuario: string | null;
  nombre: string;
  rol: "ADMIN" | "PROVEEDOR";
  proveedor: string | null;
};

type UsuarioRow = {
  id: string;
  email: string;
  usuario: string | null;
  nombre: string;
  rol: "ADMIN" | "PROVEEDOR";
  proveedor: string | null;
  createdAt: string;
};

export default function AdminUsuariosPage() {
  const [me, setMe] = useState<Me | null>(null);
  const [ready, setReady] = useState(false);
  const [bootErr, setBootErr] = useState<string | null>(null);

  const [usuarios, setUsuarios] = useState<UsuarioRow[]>([]);
  const [loadingList, setLoadingList] = useState(true);
  const [listErr, setListErr] = useState<string | null>(null);

  const [nombre, setNombre] = useState("");
  const [usuarioAcceso, setUsuarioAcceso] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rol, setRol] = useState<"ADMIN" | "PROVEEDOR">("PROVEEDOR");
  const [proveedor, setProveedor] = useState("");
  const [creating, setCreating] = useState(false);
  const [formErr, setFormErr] = useState<string | null>(null);
  const [formOk, setFormOk] = useState<string | null>(null);

  const [edit, setEdit] = useState<UsuarioRow | null>(null);
  const [editNombre, setEditNombre] = useState("");
  const [editPassword, setEditPassword] = useState("");
  const [editRol, setEditRol] = useState<"ADMIN" | "PROVEEDOR">("PROVEEDOR");
  const [editProveedor, setEditProveedor] = useState("");
  const [editUsuario, setEditUsuario] = useState("");
  const [savingEdit, setSavingEdit] = useState(false);
  const [editErr, setEditErr] = useState<string | null>(null);

  const loadUsuarios = useCallback(async () => {
    setLoadingList(true);
    setListErr(null);
    try {
      const r = await fetch("/api/admin/usuarios");
      const j = await r.json();
      if (!r.ok) throw new Error(j.error ?? "Error al cargar usuarios");
      setUsuarios(Array.isArray(j.usuarios) ? j.usuarios : []);
    } catch (e) {
      setListErr(e instanceof Error ? e.message : "Error");
      setUsuarios([]);
    } finally {
      setLoadingList(false);
    }
  }, []);

  useEffect(() => {
    let cancel = false;
    (async () => {
      setBootErr(null);
      try {
        const r = await fetch("/api/auth/me");
        if (r.status === 401) {
          window.location.href = "/login?from=" + encodeURIComponent("/dashboard");
          return;
        }
        const u = (await r.json()) as Me;
        if (cancel) return;
        setMe(u);
        if (u.rol !== "ADMIN") {
          window.location.href = "/dashboard";
          return;
        }
        await loadUsuarios();
      } catch {
        if (!cancel) setBootErr("No se pudo cargar la sesión.");
      } finally {
        if (!cancel) setReady(true);
      }
    })();
    return () => {
      cancel = true;
    };
  }, [loadUsuarios]);

  function openEdit(u: UsuarioRow) {
    setEdit(u);
    setEditNombre(u.nombre);
    setEditUsuario(u.usuario ?? "");
    setEditPassword("");
    setEditRol(u.rol);
    setEditProveedor(u.proveedor ?? "");
    setEditErr(null);
  }

  async function onCreate(e: FormEvent) {
    e.preventDefault();
    setFormErr(null);
    setFormOk(null);
    setCreating(true);
    try {
      const r = await fetch("/api/admin/usuarios", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nombre: nombre.trim(),
          usuario: usuarioAcceso.trim(),
          email: email.trim(),
          password,
          rol,
          proveedor: rol === "PROVEEDOR" ? proveedor.trim() : null,
        }),
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error ?? "Error al crear");
      setFormOk(`Usuario creado: ${j.usuario?.usuario ?? usuarioAcceso} (${j.usuario?.email ?? email})`);
      setNombre("");
      setUsuarioAcceso("");
      setEmail("");
      setPassword("");
      setProveedor("");
      await loadUsuarios();
    } catch (e) {
      setFormErr(e instanceof Error ? e.message : "Error");
    } finally {
      setCreating(false);
    }
  }

  async function onSaveEdit(e: FormEvent) {
    e.preventDefault();
    if (!edit) return;
    setEditErr(null);
    setSavingEdit(true);
    try {
      const body: Record<string, unknown> = {
        nombre: editNombre.trim(),
        rol: editRol,
        proveedor: editRol === "PROVEEDOR" ? editProveedor.trim() : null,
      };
      if (editUsuario.trim().length > 0) body.usuario = editUsuario.trim();
      if (editPassword.trim().length > 0) body.password = editPassword;
      const r = await fetch(`/api/admin/usuarios/${edit.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error ?? "Error al guardar");
      setEdit(null);
      await loadUsuarios();
    } catch (e) {
      setEditErr(e instanceof Error ? e.message : "Error");
    } finally {
      setSavingEdit(false);
    }
  }

  if (!ready) {
    return (
      <div className="flex justify-center py-24 text-sm text-zinc-500">
        Cargando…
      </div>
    );
  }

  if (bootErr) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{bootErr}</div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl">
      <header className="mb-8">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-violet-600">Administración</p>
        <h1 className="mt-2 text-2xl font-bold tracking-tight text-zinc-900 sm:text-3xl">Usuarios del portal</h1>
        {me && (
          <p className="mt-2 text-xs text-zinc-500">
            Sesión: <span className="font-mono text-zinc-700">{me.usuario ? `${me.usuario} · ` : ""}{me.email}</span>
          </p>
        )}
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-zinc-600">
          Crea cuentas para cada proveedor (rol proveedor + nombre de proveedor igual que en comandes). Los administradores ven todas las comandas.
        </p>
        <p className="mt-4 text-sm">
          <Link href="/dashboard" className="font-medium text-sky-600 hover:text-sky-800">
            ← Volver al panel
          </Link>
        </p>
      </header>

      <section className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-zinc-600">Nuevo usuario</h2>
        <form className="mt-4 grid gap-4 sm:grid-cols-2" onSubmit={(e) => void onCreate(e)}>
          <div className="sm:col-span-2">
            <label className="text-xs font-medium text-zinc-700">Nombre visible</label>
            <input
              required
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              className={inputClass}
            />
          </div>
          <div>
            <label className="text-xs font-medium text-zinc-700">Usuario (para entrar)</label>
            <input
              required
              minLength={3}
              maxLength={64}
              pattern="[a-zA-Z0-9][a-zA-Z0-9_-]*"
              title="Letras y números; puede incluir _ y - tras el primer carácter"
              value={usuarioAcceso}
              onChange={(e) => setUsuarioAcceso(e.target.value)}
              placeholder="ej. proveedor_acme"
              className={inputClass}
            />
            <p className="mt-1 text-xs text-zinc-500">Se guarda en minúsculas. También se puede entrar con el email.</p>
          </div>
          <div>
            <label className="text-xs font-medium text-zinc-700">Email</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={inputClass}
            />
          </div>
          <div className="sm:col-span-2">
            <label className="text-xs font-medium text-zinc-700">Contraseña (mín. 8 caracteres)</label>
            <input
              type="password"
              required
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={inputClass}
            />
          </div>
          <div>
            <label className="text-xs font-medium text-zinc-700">Rol</label>
            <select
              value={rol}
              onChange={(e) => setRol(e.target.value as "ADMIN" | "PROVEEDOR")}
              className={selectClass}
            >
              <option value="PROVEEDOR">Proveedor</option>
              <option value="ADMIN">Administrador</option>
            </select>
          </div>
          {rol === "PROVEEDOR" && (
            <div>
              <label className="text-xs font-medium text-zinc-700">Nombre proveedor (como en BD comandes)</label>
              <input
                required
                value={proveedor}
                onChange={(e) => setProveedor(e.target.value)}
                placeholder="Ej. Proveedor ACME"
                className={inputClass}
              />
            </div>
          )}
          <div className="sm:col-span-2 flex flex-wrap gap-3">
            <button
              type="submit"
              disabled={creating}
              className="rounded-xl bg-violet-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-violet-700 disabled:opacity-50"
            >
              {creating ? "Creando…" : "Crear usuario"}
            </button>
            {formErr && <p className="text-sm text-red-600">{formErr}</p>}
            {formOk && <p className="text-sm text-emerald-700">{formOk}</p>}
          </div>
        </form>
      </section>

      <section className="mt-8 rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-zinc-600">Usuarios registrados</h2>
        {loadingList ? (
          <p className="mt-4 text-sm text-zinc-500">Cargando…</p>
        ) : listErr ? (
          <p className="mt-4 text-sm text-red-600">{listErr}</p>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="border-b border-zinc-200 text-xs font-semibold uppercase text-zinc-500">
                <tr>
                  <th className="py-2 pr-4">Usuario</th>
                  <th className="py-2 pr-4">Email</th>
                  <th className="py-2 pr-4">Nombre</th>
                  <th className="py-2 pr-4">Rol</th>
                  <th className="py-2 pr-4">Proveedor</th>
                  <th className="py-2 pr-4">Alta</th>
                  <th className="py-2" />
                </tr>
              </thead>
              <tbody>
                {usuarios.map((u) => (
                  <tr key={u.id} className="border-b border-zinc-100">
                    <td className="py-2 pr-4 font-mono text-xs text-zinc-800">{u.usuario ?? "—"}</td>
                    <td className="py-2 pr-4 font-mono text-xs text-zinc-800">{u.email}</td>
                    <td className="py-2 pr-4 text-zinc-800">{u.nombre}</td>
                    <td className="py-2 pr-4">
                      <span
                        className={
                          u.rol === "ADMIN"
                            ? "rounded bg-violet-100 px-2 py-0.5 text-xs font-medium text-violet-800"
                            : "rounded bg-zinc-100 px-2 py-0.5 text-xs font-medium text-zinc-700"
                        }
                      >
                        {u.rol}
                      </span>
                    </td>
                    <td className="py-2 pr-4 text-zinc-600">{u.proveedor ?? "—"}</td>
                    <td className="py-2 pr-4 text-xs text-zinc-500">
                      {new Date(u.createdAt).toLocaleDateString("es-ES")}
                    </td>
                    <td className="py-2">
                      <button
                        type="button"
                        onClick={() => openEdit(u)}
                        className="text-xs font-semibold text-sky-700 hover:underline"
                      >
                        Editar
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {edit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" role="dialog">
          <div className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-2xl border border-zinc-200 bg-white p-6 shadow-xl">
            <h3 className="text-lg font-bold text-zinc-900">Editar usuario</h3>
            <p className="mt-1 text-xs text-zinc-500">{edit.email}</p>
            <form className="mt-4 space-y-4" onSubmit={(e) => void onSaveEdit(e)}>
              <div>
                <label className="text-xs font-medium text-zinc-700">Usuario (para entrar)</label>
                <input
                  minLength={3}
                  maxLength={64}
                  pattern="[a-zA-Z0-9][a-zA-Z0-9_-]*"
                  title="Letras y números; puede incluir _ y - tras el primer carácter"
                  value={editUsuario}
                  onChange={(e) => setEditUsuario(e.target.value)}
                  placeholder="Opcional si aún no tiene"
                  className={inputClass}
                />
                <p className="mt-1 text-xs text-zinc-500">Déjalo vacío para no cambiar. Mínimo 3 caracteres si lo rellenas.</p>
              </div>
              <div>
                <label className="text-xs font-medium text-zinc-700">Nombre</label>
                <input
                  required
                  value={editNombre}
                  onChange={(e) => setEditNombre(e.target.value)}
                  className={inputClass}
                />
              </div>
              <div>
                <label className="text-xs font-medium text-zinc-700">Nueva contraseña (opcional)</label>
                <input
                  type="password"
                  minLength={8}
                  value={editPassword}
                  onChange={(e) => setEditPassword(e.target.value)}
                  placeholder="Dejar vacío para no cambiar"
                  className={inputClass}
                />
              </div>
              <div>
                <label className="text-xs font-medium text-zinc-700">Rol</label>
                <select
                  value={editRol}
                  onChange={(e) => setEditRol(e.target.value as "ADMIN" | "PROVEEDOR")}
                  className={selectClass}
                >
                  <option value="PROVEEDOR">Proveedor</option>
                  <option value="ADMIN">Administrador</option>
                </select>
              </div>
              {editRol === "PROVEEDOR" && (
                <div>
                  <label className="text-xs font-medium text-zinc-700">Proveedor</label>
                  <input
                    required
                    value={editProveedor}
                    onChange={(e) => setEditProveedor(e.target.value)}
                    className={inputClass}
                  />
                </div>
              )}
              {editErr && <p className="text-sm text-red-600">{editErr}</p>}
              <div className="flex gap-3 pt-2">
                <button
                  type="submit"
                  disabled={savingEdit}
                  className="rounded-xl bg-zinc-900 px-4 py-2 text-sm font-semibold text-white hover:bg-zinc-800 disabled:opacity-50"
                >
                  {savingEdit ? "Guardando…" : "Guardar"}
                </button>
                <button
                  type="button"
                  onClick={() => setEdit(null)}
                  className="rounded-xl border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
                >
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
