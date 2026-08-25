// @vitest-environment jsdom
import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { ThemeProvider, useTheme } from "./ThemeContext";

function ThemeProbe() {
  const { theme, setTheme } = useTheme();
  return (
    <div>
      <span>{theme}</span>
      <button type="button" onClick={() => setTheme("midnight")}>
        Usar índigo
      </button>
      <button type="button" onClick={() => setTheme("daylight")}>
        Usar brisa clara
      </button>
    </div>
  );
}

afterEach(() => {
  window.localStorage.clear();
  delete document.documentElement.dataset.pixbeeTheme;
});

describe("temas do PixBee", () => {
  it("aplica e persiste a paleta escolhida no documento", () => {
    render(
      <ThemeProvider>
        <ThemeProbe />
      </ThemeProvider>
    );

    fireEvent.click(screen.getByRole("button", { name: "Usar índigo" }));
    expect(screen.getByText("midnight")).toBeTruthy();
    expect(document.documentElement.dataset.pixbeeTheme).toBe("midnight");
    expect(window.localStorage.getItem("pixbee-theme")).toBe("midnight");

    fireEvent.click(screen.getByRole("button", { name: "Usar brisa clara" }));
    expect(document.documentElement.dataset.pixbeeTheme).toBe("daylight");
  });
});
