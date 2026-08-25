// @vitest-environment jsdom
import React from "react";
import { cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

type TestAdSenseSettings = {
  enabled: boolean;
  clientId: string;
  homeSlot: string;
  aboutSlot: string;
  privacySlot: string;
};

const validSettings: TestAdSenseSettings = {
  enabled: true,
  clientId: "ca-pub-1234567890123456",
  homeSlot: "1234567890",
  aboutSlot: "1234567890",
  privacySlot: "1234567890",
};

async function renderAppAt(route: string, settings: TestAdSenseSettings) {
  vi.resetModules();
  vi.doMock("@/lib/adsense", async () => {
    const actual = await vi.importActual<typeof import("@/lib/adsense")>("@/lib/adsense");
    return { ...actual, adsenseSettings: settings };
  });
  window.history.replaceState({}, "", route);
  const { default: App } = await import("./App");
  return render(<App />);
}

afterEach(() => {
  cleanup();
  vi.doUnmock("@/lib/adsense");
  window.history.replaceState({}, "", "/");
  document.head.querySelectorAll("#pixbee-adsense-script").forEach(node => node.remove());
});

describe("AdSense route integration", () => {
  it("keeps the real operational routes free from slots and scripts", async () => {
    for (const route of ["/abertura", "/contagem", "/validacao", "/historico"]) {
      const { unmount } = await renderAppAt(route, validSettings);

      expect(document.querySelector(".adsense-slot")).toBeNull();
      expect(document.getElementById("pixbee-adsense-script")).toBeNull();
      unmount();
    }
  });

  it("keeps a real public route hidden when opt-in is false with a valid publisher", async () => {
    const { unmount } = await renderAppAt("/sobre", { ...validSettings, enabled: false });

    expect(document.querySelector(".adsense-slot")).toBeNull();
    expect(document.getElementById("pixbee-adsense-script")).toBeNull();
    unmount();
  });

  it("keeps a real public route hidden when opt-in is true without a publisher", async () => {
    const { unmount } = await renderAppAt("/sobre", { ...validSettings, clientId: "" });

    expect(document.querySelector(".adsense-slot")).toBeNull();
    expect(document.getElementById("pixbee-adsense-script")).toBeNull();
    unmount();
  });
});
