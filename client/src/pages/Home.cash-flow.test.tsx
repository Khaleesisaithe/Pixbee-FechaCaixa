// @vitest-environment jsdom
import React from "react";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  CashSessionProvider,
  createEmptyQuantities,
  createNewSession,
  useCashSession,
} from "../contexts/CashSessionContext";
import { LanguageProvider } from "../contexts/LanguageContext";
import { ThemeProvider } from "../contexts/ThemeContext";
import { AdjustmentWorkspace, CashEntryWorkspace, DenominationRow, OpeningFloatDialog, OpeningPage } from "./Home";

afterEach(() => {
  cleanup();
  window.localStorage.clear();
});

function SessionProbe() {
  const { session } = useCashSession();
  return <output data-testid="physical-quantities">{JSON.stringify(session.quantities)}</output>;
}

describe("interface de abertura e entradas em espécie", () => {
  it("confirma o fundo de caixa contado por cédulas e moedas", async () => {
    const user = userEvent.setup();
    const onConfirm = vi.fn();

    render(
      <LanguageProvider>
        <OpeningFloatDialog
          open
          initialQuantities={{}}
          onOpenChange={() => undefined}
          onConfirm={onConfirm}
        />
      </LanguageProvider>
    );

    await user.click(
      screen.getByRole("button", { name: "Aumentar R$ 10" })
    );
    await user.click(
      screen.getByRole("button", { name: /Confirmar fundo de caixa/i })
    );

    expect(onConfirm).toHaveBeenCalledWith(
      expect.objectContaining({ n10: 1 }),
      10
    );
  });

  it("registra a entrada líquida depois de confirmar o troco em dinheiro", async () => {
    const user = userEvent.setup();
    const openingQuantities = { ...createEmptyQuantities(), m100: 2 };
    window.localStorage.setItem(
      "pixbee-fecha-caixa-session-v2",
      JSON.stringify({
        ...createNewSession(),
        openingQuantities,
        quantities: openingQuantities,
        openingFloat: 2,
      })
    );

    render(
      <LanguageProvider>
        <CashSessionProvider>
          <CashEntryWorkspace />
          <SessionProbe />
        </CashSessionProvider>
      </LanguageProvider>
    );

    await user.type(screen.getByRole("spinbutton"), "20");
    await user.click(
      screen.getByRole("button", { name: /Adicionar entrada/i })
    );
    await user.click(
      screen.getByRole("button", { name: /Sim, informar troco/i })
    );
    await user.click(
      screen.getByRole("button", { name: "Aumentar R$ 20" })
    );
    await user.click(
      screen.getByRole("button", { name: /Confirmar dinheiro recebido/i })
    );
    await user.click(
      screen.getByRole("button", { name: "Aumentar R$ 1,00" })
    );
    await user.click(
      screen.getByRole("button", { name: "Aumentar R$ 1,00" })
    );
    expect(
      (screen.getByRole("button", { name: "Aumentar R$ 1,00" }) as HTMLButtonElement).disabled
    ).toBe(true);
    await user.click(
      screen.getByRole("button", { name: /Confirmar entrada líquida/i })
    );

    expect(await screen.findByText(/Recebido.*20,00.*troco.*2,00/i)).toBeTruthy();
    expect(screen.getByText(/\+\s*R\$\s*18,00/i)).toBeTruthy();
    const quantities = JSON.parse(screen.getByTestId("physical-quantities").textContent ?? "{}");
    expect(quantities.n20).toBe(1);
    expect(quantities.m100).toBe(0);
    expect(quantities.n2).toBe(0);
    expect(quantities.m100).toBe(0);

    await user.click(
      screen.getByRole("button", { name: /Corrigir troco desta entrada/i })
    );
    expect(screen.getByRole("button", { name: /Salvar correção/i })).toBeTruthy();
    await user.click(
      screen.getByRole("button", { name: "Diminuir R$ 1,00" })
    );
    await user.click(
      screen.getByRole("button", { name: /Salvar correção/i })
    );

    expect(await screen.findByText(/Recebido.*20,00.*troco.*1,00/i)).toBeTruthy();
    expect(screen.getByText(/\+\s*R\$\s*19,00/i)).toBeTruthy();
    const correctedQuantities = JSON.parse(
      screen.getByTestId("physical-quantities").textContent ?? "{}"
    );
    expect(correctedQuantities.n20).toBe(1);
    expect(correctedQuantities.m100).toBe(1);
  });

  it("importa a composição física ao confirmar Sim na abertura", async () => {
    const user = userEvent.setup();
    const inheritedQuantities = { ...createEmptyQuantities(), n20: 2, m100: 3 };
    window.localStorage.setItem(
      "pixbee-fecha-caixa-session-v2",
      JSON.stringify({
        ...createNewSession(),
        openingQuantities: inheritedQuantities,
        quantities: inheritedQuantities,
        openingFloat: 43,
      })
    );

    render(
      <ThemeProvider>
        <LanguageProvider>
          <CashSessionProvider>
            <OpeningPage />
            <SessionProbe />
          </CashSessionProvider>
        </LanguageProvider>
      </ThemeProvider>
    );

    await user.type(screen.getByPlaceholderText("Digite seu nome"), "Novo operador");
    await user.type(screen.getByPlaceholderText("Digite a empresa"), "Nova empresa");
    await user.type(screen.getByPlaceholderText(/Manhã/), "Manhã");
    await user.click(screen.getByRole("button", { name: "Sim, importar" }));
    await user.click(screen.getByRole("button", { name: /Começar contagem/i }));

    await waitFor(() => {
      const quantities = JSON.parse(screen.getByTestId("physical-quantities").textContent ?? "{}");
      expect(quantities.n20).toBe(2);
      expect(quantities.m100).toBe(3);
    });
  });

  it("abre o fundo manual quando Não é escolhido na abertura", async () => {
    const user = userEvent.setup();
    const inheritedQuantities = { ...createEmptyQuantities(), n20: 2 };
    window.localStorage.setItem(
      "pixbee-fecha-caixa-session-v2",
      JSON.stringify({
        ...createNewSession(),
        openingQuantities: inheritedQuantities,
        quantities: inheritedQuantities,
        openingFloat: 40,
      })
    );

    render(
      <ThemeProvider>
        <LanguageProvider>
          <CashSessionProvider>
            <OpeningPage />
            <SessionProbe />
          </CashSessionProvider>
        </LanguageProvider>
      </ThemeProvider>
    );

    await user.type(screen.getByPlaceholderText("Digite seu nome"), "Novo operador");
    await user.type(screen.getByPlaceholderText("Digite a empresa"), "Nova empresa");
    await user.type(screen.getByPlaceholderText(/Manhã/), "Manhã");
    await user.click(screen.getByRole("button", { name: "Não, preencher manualmente" }));
    await user.click(screen.getByRole("button", { name: /Começar contagem/i }));

    expect(await screen.findByRole("dialog")).toBeTruthy();
    expect(screen.getByRole("button", { name: /Confirmar fundo de caixa/i })).toBeTruthy();
  });

  it("bloqueia a edição direta das denominações depois que o fundo é confirmado", () => {
    const openingQuantities = { ...createEmptyQuantities(), n10: 2 };
    window.localStorage.setItem(
      "pixbee-fecha-caixa-session-v2",
      JSON.stringify({
        ...createNewSession(),
        openingQuantities,
        quantities: openingQuantities,
        openingFloat: 20,
      })
    );

    render(
      <LanguageProvider>
        <CashSessionProvider>
          <DenominationRow item={{ key: "n10", label: "R$ 10", value: 10 }} />
        </CashSessionProvider>
      </LanguageProvider>
    );

    expect(screen.getByRole("button", { name: "Diminuir R$ 10" }).hasAttribute("disabled")).toBe(true);
    expect(screen.getByRole("button", { name: "Aumentar R$ 10" }).hasAttribute("disabled")).toBe(true);
    expect((screen.getByRole("spinbutton", { name: "Quantidade protegida de R$ 10" }) as HTMLInputElement).readOnly).toBe(true);
    expect(screen.getByText("Fundo confirmado: 2")).toBeTruthy();
  });

  it("permite sangria acima da última entrada quando o caixa físico tem R$ 190 disponíveis", async () => {
    const user = userEvent.setup();
    const openingQuantities = { ...createEmptyQuantities(), n20: 1 };
    const quantities = { ...openingQuantities, n100: 1, n50: 1, n20: 2 };
    window.localStorage.setItem(
      "pixbee-fecha-caixa-session-v2",
      JSON.stringify({
        ...createNewSession(),
        openingQuantities,
        quantities,
        openingFloat: 20,
      })
    );

    render(
      <LanguageProvider>
        <CashSessionProvider>
          <AdjustmentWorkspace type="withdrawal" />
          <SessionProbe />
        </CashSessionProvider>
      </LanguageProvider>
    );

    await user.type(screen.getByRole("spinbutton"), "100");
    await user.click(screen.getByRole("button", { name: "Registrar" }));
    await user.click(screen.getByRole("button", { name: "Aumentar R$ 100" }));
    await user.click(screen.getByRole("button", { name: /Confirmar composição/i }));

    await waitFor(() => {
      const updatedQuantities = JSON.parse(
        screen.getByTestId("physical-quantities").textContent ?? "{}"
      );
      expect(updatedQuantities.n100).toBe(0);
      expect(updatedQuantities.n50).toBe(1);
      expect(updatedQuantities.n20).toBe(2);
    });
  });

  it("recusa uma sangria cuja composição excede as unidades fisicamente disponíveis", async () => {
    const user = userEvent.setup();
    const quantities = { ...createEmptyQuantities(), n100: 1 };
    window.localStorage.setItem(
      "pixbee-fecha-caixa-session-v2",
      JSON.stringify({
        ...createNewSession(),
        openingQuantities: createEmptyQuantities(),
        quantities,
        openingFloat: 0,
      })
    );

    render(
      <LanguageProvider>
        <CashSessionProvider>
          <AdjustmentWorkspace type="withdrawal" />
          <SessionProbe />
        </CashSessionProvider>
      </LanguageProvider>
    );

    await user.type(screen.getByRole("spinbutton"), "200");
    await user.click(screen.getByRole("button", { name: "Registrar" }));
    await user.click(screen.getByRole("button", { name: "Aumentar R$ 100" }));
    await user.click(screen.getByRole("button", { name: "Aumentar R$ 100" }));
    await user.click(screen.getByRole("button", { name: /Confirmar composição/i }));

    const unchangedQuantities = JSON.parse(
      screen.getByTestId("physical-quantities").textContent ?? "{}"
    );
    expect(unchangedQuantities.n100).toBe(1);
    expect(screen.getByRole("dialog")).toBeTruthy();
    expect(screen.getByText("Nenhum lançamento neste turno.")).toBeTruthy();
  });
});
