import React, { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "./components/ui/card";
import { Button } from "./components/ui/button";
import { Input } from "./components/ui/input";
import "./style.css";
type Row = Record<string, string | number | boolean | null>;
async function api(path: string, body?: unknown) {
  const response = await fetch("/api/admin/" + path, {
    credentials: "same-origin",
    ...(body
      ? {
          method: "POST",
          headers: { "content-type": "application/json", "x-csrf": "1" },
          body: JSON.stringify(body),
        }
      : {}),
  });
  if (response.status === 401) {
    location.assign("/entrar?next=/admin/");
    throw new Error("Inicia sesión.");
  }
  if (response.status === 403)
    throw new Error("Tu cuenta no tiene permisos de administración.");
  if (!response.ok) {
    const errorJson = (await response.json().catch(() => null)) as
      | { detail?: string }
      | null;
    throw new Error(
      errorJson?.detail ||
        "No se pudo completar la operación. Inténtalo de nuevo.",
    );
  }
  return response.json();
}
function App() {
  const [section, setSection] = useState("users");
  const [stats, setStats] = useState<Row>({});
  const [items, setItems] = useState<Row[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(true);
  const [term, setTerm] = useState("");
  const [query, setQuery] = useState("");
  const [notice, setNotice] = useState("");
  const [me, setMe] = useState<Row | null>(null);
  useEffect(() => {
    fetch("/api/auth/me", { credentials: "same-origin" })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => setMe(data as Row))
      .catch(() => null);
  }, []);
  async function load(next?: string) {
    setBusy(true);
    setError("");
    try {
      const [s, list] = await Promise.all([
        api("stats"),
        api(
          section +
            "?" +
            new URLSearchParams({
              ...(query ? { q: query } : {}),
              ...(next ? { cursor: next } : {}),
            }),
        ),
      ]);
      setStats(s);
      setItems((previous) =>
        next ? [...previous, ...list.items] : list.items,
      );
      setCursor(list.nextCursor);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  useEffect(() => {
    void load();
  }, [section, query]);
  async function change(
    user: Row,
    action: "suspension" | "subscription",
    data: object,
  ) {
    setBusy(true);
    setNotice("");
    try {
      await api("users/" + user.id + "/" + action, data);
      setNotice("Cambio guardado.");
      await load();
    } catch (e) {
      setError((e as Error).message);
      setBusy(false);
    }
  }
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border bg-card">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 p-5">
          <a href="/" className="font-bold text-primary">
            OfertasAlDía
          </a>
          <h1 className="text-xl font-bold">Administración</h1>
          <div className="flex items-center gap-4">
            {me ? (
              <span className="text-xs text-muted-foreground">
                Conectado como{" "}
                <strong className="text-foreground">{String(me.email)}</strong>
              </span>
            ) : null}
            <a href="/panel" className="text-sm font-medium hover:underline">
              Mi cuenta
            </a>
          </div>
        </div>
      </header>
      <main className="mx-auto flex max-w-6xl flex-col gap-6 p-5">
        <section aria-label="Resumen" className="grid gap-4 sm:grid-cols-3">
          {[
            ["users", "Usuarios"],
            ["products", "Productos"],
            ["subscribers", "Planes activos"],
          ].map(([key, label]) => (
            <Card key={key}>
              <CardHeader>
                <CardTitle>{label}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold">{stats[key] ?? "—"}</p>
              </CardContent>
            </Card>
          ))}
        </section>
        <nav
          aria-label="Secciones de administración"
          className="flex flex-wrap gap-2"
        >
          {[
            ["users", "Usuarios"],
            ["products", "Productos"],
            ["audit", "Auditoría"],
          ].map(([id, label]) => (
            <Button
              key={id}
              variant={section === id ? "default" : "outline"}
              aria-pressed={section === id}
              onClick={() => {
                setSection(id);
                setTerm("");
                setQuery("");
              }}
            >
              {label}
            </Button>
          ))}
        </nav>
        <Card>
          <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle>
                {section === "users"
                  ? "Usuarios y planes"
                  : section === "products"
                    ? "Catálogo publicado"
                    : "Acciones administrativas"}
              </CardTitle>
              <CardDescription>
                Información de la base de datos. Las activaciones de plan son
                manuales y quedan auditadas.
              </CardDescription>
            </div>
            {section === "audit" ? (
              <Button
                size="sm"
                variant="outline"
                disabled={busy}
                onClick={async () => {
                  setBusy(true);
                  setNotice("");
                  try {
                    const res = await api("maintenance/purge", {});
                    setNotice(
                      `Purga completada: ${res.purged.authAttempts} intentos, ${res.purged.passwordTokens} tokens, ${res.purged.sessions} sesiones y ${res.purged.oauthFlows} flujos oauth eliminados.`,
                    );
                    await load();
                  } catch (e) {
                    setError((e as Error).message);
                    setBusy(false);
                  }
                }}
              >
                Purgar registros vencidos
              </Button>
            ) : null}
          </CardHeader>
          <CardContent>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                setQuery(term);
              }}
              className="mb-5 flex flex-wrap gap-3"
            >
              <label htmlFor="admin-search" className="sr-only">
                Buscar
              </label>
              <Input
                id="admin-search"
                type="search"
                maxLength={100}
                value={term}
                onChange={(e) => setTerm(e.target.value)}
                placeholder="Buscar"
                className="max-w-sm"
              />
              <Button type="submit" disabled={busy}>
                Buscar
              </Button>
            </form>
            {error ? <p role="alert">{error}</p> : null}
            {notice ? <p role="status">{notice}</p> : null}
            <div aria-busy={busy} className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <caption className="sr-only">{section}</caption>
                <thead>
                  <tr>
                    {(section === "users"
                      ? ["Nombre", "Correo", "Estado", "Plan", "Acciones"]
                      : section === "products"
                        ? ["Producto", "Plataforma", "Categoría", "Origen"]
                        : ["Fecha", "Administrador", "Acción", "Recurso"]
                    ).map((label) => (
                      <th
                        key={label}
                        scope="col"
                        className="border-b border-border p-3"
                      >
                        {label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {items.map((row) => {
                    const isSelf = Boolean(me?.id && me.id === row.id);
                    return (
                      <tr key={String(row.id)}>
                        {section === "users" ? (
                          <>
                            <td className="p-3">
                              <span>{row.name}</span>
                              {isSelf ? (
                                <span className="ml-2 inline-flex items-center rounded-md bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary">
                                  Tu cuenta
                                </span>
                              ) : null}
                            </td>
                            <td className="p-3">{row.email}</td>
                            <td className="p-3">
                              {row.suspendedAt ? "Suspendido" : "Activo"}
                            </td>
                            <td className="p-3">
                              {row.planExpiresAt
                                ? new Date(
                                    String(row.planExpiresAt),
                                  ).toLocaleDateString("es-MX")
                                : "Sin plan activo"}
                            </td>
                            <td className="flex flex-wrap gap-2 p-3">
                              <Button
                                size="sm"
                                variant="outline"
                                disabled={busy || isSelf}
                                title={
                                  isSelf
                                    ? "No puedes suspender tu propia cuenta"
                                    : undefined
                                }
                                onClick={() =>
                                  void change(row, "suspension", {
                                    suspended: !row.suspendedAt,
                                  })
                                }
                              >
                                {row.suspendedAt ? "Reactivar" : "Suspender"}
                              </Button>
                            <form
                              className="flex gap-2"
                              onSubmit={(e) => {
                                e.preventDefault();
                                const data = new FormData(e.currentTarget);
                                void change(row, "subscription", {
                                  expiresAt: new Date(
                                    String(data.get("expires")) + "T23:59:59Z",
                                  ).toISOString(),
                                });
                              }}
                            >
                              <label
                                className="sr-only"
                                htmlFor={"expiry-" + row.id}
                              >
                                Vencimiento de plan para {row.name}
                              </label>
                              <Input
                                id={"expiry-" + row.id}
                                name="expires"
                                type="date"
                                required
                                min={new Date().toISOString().slice(0, 10)}
                              />
                              <Button size="sm" disabled={busy}>
                                Activar plan
                              </Button>
                            </form>
                          </td>
                        </>
                      ) : section === "products" ? (
                        <>
                          <td className="p-3">{row.title}</td>
                          <td className="p-3">{row.platform}</td>
                          <td className="p-3">{row.categoryId}</td>
                          <td className="p-3">
                            {row.isDemo ? "Demostración" : "Publicado"}
                          </td>
                        </>
                      ) : (
                        <>
                          <td className="p-3">{row.createdAt}</td>
                          <td className="p-3">{row.actorEmail}</td>
                          <td className="p-3">{row.action}</td>
                          <td className="p-3">{row.targetId}</td>
                        </>
                      )}
                    </tr>
                  );
                })}
              </tbody>
              </table>
              {!items.length && !busy && !error ? (
                <p className="p-4">No hay resultados.</p>
              ) : null}
              {busy ? <p role="status">Cargando…</p> : null}
            </div>
            {cursor ? (
              <Button
                variant="outline"
                disabled={busy}
                onClick={() => void load(cursor!)}
              >
                Cargar más
              </Button>
            ) : null}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
createRoot(document.getElementById("root")!).render(<App />);
