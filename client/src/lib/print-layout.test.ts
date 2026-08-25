import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const css = readFileSync(new URL("../index.css", import.meta.url), "utf8");
const printCss = css.slice(css.indexOf("@media print"));

describe("layout de impressão térmica", () => {
  it("centraliza o recibo de fechamento dentro da página de 80 mm", () => {
    expect(printCss).toContain("size: 80mm auto");
    expect(printCss).toContain("width: 100% !important");
    expect(printCss).toMatch(
      /\.thermal-receipt\s*\{[\s\S]*?width:\s*80mm;[\s\S]*?max-width:\s*100%;[\s\S]*?margin:\s*0 auto;[\s\S]*?box-sizing:\s*border-box;/
    );
  });

  it("aplica a mesma centralização ao relatório térmico do histórico", () => {
    expect(printCss).toMatch(
      /\.thermal-history-report\s*\{[\s\S]*?width:\s*80mm;[\s\S]*?max-width:\s*100%;[\s\S]*?margin:\s*0 auto;[\s\S]*?box-sizing:\s*border-box;/
    );
  });
});
