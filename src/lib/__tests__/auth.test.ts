import os from "node:os";
import path from "node:path";
import fs from "node:fs";
import { beforeAll, describe, expect, it, vi } from "vitest";

const dir = fs.mkdtempSync(path.join(os.tmpdir(), "gp-auth-"));
process.env.PGLITE_DIR = path.join(dir, "db");

const jar = new Map<string, string>();
vi.mock("next/headers", () => ({
  cookies: async () => ({ get: (k: string) => (jar.has(k) ? { value: jar.get(k) } : undefined), set: (k: string, v: string) => jar.set(k, v), delete: (k: string) => jar.delete(k) }),
  headers: async () => new Headers(),
}));

describe("login do painel", () => {
  let auth: typeof import("../auth");
  beforeAll(async () => {
    auth = await import("../auth");
  });

  it("hash de senha confere e recusa senha errada", async () => {
    const h = await auth.gerarHashSenha("uma-senha-boa-123");
    expect(await auth.conferirSenha("uma-senha-boa-123", h)).toBe(true);
    expect(await auth.conferirSenha("outra", h)).toBe(false);
  });

  it("entra com o usuario de teste e cria sessao", async () => {
    const r = await auth.entrar("admin@demo.local", "demo-teste-2026", "ip1");
    expect(r).toEqual({ ok: true });
    expect(jar.get("gp_sessao")).toBeTruthy();
    const u = await auth.usuarioAtual();
    expect(u?.papel).toBe("admin");
  });

  it("bloqueia depois de muitas senhas erradas", async () => {
    for (let i = 0; i < 6; i++) expect((await auth.entrar("admin@demo.local", "errada-" + i, "ip2")).ok).toBe(false);
    const r = await auth.entrar("admin@demo.local", "demo-teste-2026", "ip2");
    expect(r.ok).toBe(false);
  });

  it("senha fraca e recusada", () => {
    expect(auth.senhaFraca("123")).toBeTruthy();
    expect(auth.senhaFraca("aaaaaaaaaaaa")).toBeTruthy();
    expect(auth.senhaFraca("cavalo-azul-praia")).toBeNull();
  });
});
