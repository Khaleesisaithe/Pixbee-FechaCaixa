// @vitest-environment jsdom
import React from "react";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it } from "vitest";
import { LanguageProvider, useLanguage } from "./LanguageContext";

function Probe() {
  const { locale, setLocale, t } = useLanguage();
  return (
    <div>
      <span data-testid="locale">{locale}</span>
      <span>{t("welcome.start")}</span>
      <button type="button" onClick={() => setLocale("en")}>EN</button>
      <button type="button" onClick={() => setLocale("es")}>ES</button>
    </div>
  );
}

afterEach(() => {
  cleanup();
  window.localStorage.clear();
});

describe("preferência de idioma", () => {
  it("alterna para inglês e persiste a escolha no navegador", async () => {
    const user = userEvent.setup();
    render(
      <LanguageProvider>
        <Probe />
      </LanguageProvider>
    );

    expect(screen.getByText("Iniciar contagem")).toBeTruthy();
    await user.click(screen.getByRole("button", { name: "EN" }));
    expect(screen.getByTestId("locale").textContent).toBe("en");
    expect(screen.getByText("Start count")).toBeTruthy();
    expect(window.localStorage.getItem("pixbee-locale")).toBe("en");
  });

  it("alterna para espanhol e persiste a escolha no navegador", async () => {
    const user = userEvent.setup();
    render(
      <LanguageProvider>
        <Probe />
      </LanguageProvider>
    );

    await user.click(screen.getByRole("button", { name: "ES" }));
    expect(screen.getByTestId("locale").textContent).toBe("es");
    expect(screen.getByText("Iniciar conteo")).toBeTruthy();
    expect(window.localStorage.getItem("pixbee-locale")).toBe("es");
  });
});
