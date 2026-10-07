import { describe, expect, it } from "vitest";
import { lerReais, linkWhatsapp, parcela, reais, slugificar } from "../comum";

describe("utilitarios", () => {
  it("le valores em reais do jeito que as pessoas digitam", () => {
    expect(lerReais("4.899,90")).toBe(489990);
    expect(lerReais("R$ 2.499")).toBe(249900);
    expect(lerReais("350")).toBe(35000);
    expect(lerReais("12.5")).toBe(1250);
    expect(lerReais("")).toBeNull();
    expect(lerReais("abc")).toBeNull();
    expect(lerReais("-5")).toBeNull();
  });
  it("parcela nunca fica abaixo do preco", () => {
    expect(parcela(989000, 12) * 12).toBeGreaterThanOrEqual(989000);
  });
  it("formata reais", () => {
    expect(reais(489900).replace(/\s/g, " ")).toBe("R$ 4.899");
    expect(reais(116667, true).replace(/\s/g, " ")).toBe("R$ 1.166,67");
  });
  it("slug e link do WhatsApp", () => {
    expect(slugificar("iPhone 15 Pro 128 GB Titânio")).toBe("iphone-15-pro-128-gb-titanio");
    expect(linkWhatsapp("(51) 99999-0000", "oi")).toBe("https://wa.me/5551999990000?text=oi");
  });
});
