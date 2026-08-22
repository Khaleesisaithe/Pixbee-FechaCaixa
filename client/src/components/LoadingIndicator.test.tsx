import { renderToStaticMarkup } from "react-dom/server";
import React from "react";
import { describe, expect, it } from "vitest";
import { LoadingIndicator } from "./LoadingIndicator";

describe("LoadingIndicator", () => {
  it("anuncia o estado de carregamento para tecnologias assistivas", () => {
    const markup = renderToStaticMarkup(
      <LoadingIndicator label="Gerando PDF..." />
    );

    expect(markup).toContain('role="status"');
    expect(markup).toContain('aria-live="polite"');
    expect(markup).toContain("Gerando PDF...");
  });

  it("usa a variação compacta dentro de botões", () => {
    const markup = renderToStaticMarkup(
      <LoadingIndicator compact label="Enviando relato..." />
    );

    expect(markup).toContain("pixbee-loading-indicator compact");
  });
});
