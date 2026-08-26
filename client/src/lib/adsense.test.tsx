// @vitest-environment jsdom
import React from "react";
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render } from "@testing-library/react";
import { AdSenseSlot } from "@/components/AdSenseSlot";
import { adsenseSettings, isAdSenseReady, isPublicAdRoute, isValidAdSenseClientId } from "./adsense";
import { buildAdsTxtContent } from "@shared/adsense";

afterEach(() => {
  cleanup();
  document.getElementById("pixbee-adsense-script")?.remove();
  delete (window as Window & { adsbygoogle?: unknown[] }).adsbygoogle;
});

describe("AdSense configuration", () => {
  it("accepts only publisher IDs in the ca-pub format", () => {
    expect(isValidAdSenseClientId("ca-pub-1234567890123456")).toBe(true);
    expect(isValidAdSenseClientId("pub-1234567890123456")).toBe(false);
    expect(isValidAdSenseClientId("ca-pub-example")).toBe(false);
  });

  it("requires explicit enablement, a valid publisher ID, and a numeric slot", () => {
    const base = {
      clientId: "ca-pub-1234567890123456",
      slot: "1234567890",
    };

    expect(isAdSenseReady({ ...base, enabled: false })).toBe(false);
    expect(isAdSenseReady({ ...base, enabled: true })).toBe(true);
    expect(isAdSenseReady({ ...base, enabled: true, slot: "" })).toBe(false);
    expect(isAdSenseReady({ ...base, enabled: true, clientId: "" })).toBe(false);
  });

  it("generates an authorized ads.txt line only for an enabled valid publisher", () => {
    expect(buildAdsTxtContent(false, "ca-pub-1234567890123456")).toContain("Publisher ID not configured");
    expect(buildAdsTxtContent(true, "ca-pub-1234567890123456")).toBe(
      "google.com, pub-1234567890123456, DIRECT, f08c47fec0942fa0\n",
    );
    expect(buildAdsTxtContent(true, "ca-pub-invalid")).toContain("Publisher ID not configured");
  });

  it("does not render a slot or inject a script while opt-in is disabled", () => {
    const { container } = render(
      <AdSenseSlot
        publicRoute="/"
        slot="1234567890"
        label="Advertisement"
        settings={{
          enabled: false,
          clientId: "ca-pub-1234567890123456",
          homeSlot: "1234567890",
          aboutSlot: "1234567890",
          privacySlot: "1234567890",
        }}
      />,
    );

    expect(container.querySelector(".adsense-slot")).toBeNull();
    expect(document.getElementById("pixbee-adsense-script")).toBeNull();
    expect(isPublicAdRoute("/abertura")).toBe(false);
    expect(isPublicAdRoute("/contagem")).toBe(false);
    expect(isPublicAdRoute("/validacao")).toBe(false);
    expect(isPublicAdRoute("/historico")).toBe(true);
  });

  it("keeps a public slot hidden when opt-in is false even with a valid publisher", () => {
    const { container } = render(
      <AdSenseSlot
        publicRoute="/sobre"
        slot="1234567890"
        settings={{
          enabled: false,
          clientId: "ca-pub-1234567890123456",
          homeSlot: "1234567890",
          aboutSlot: "1234567890",
          privacySlot: "1234567890",
        }}
      />,
    );

    expect(container.querySelector(".adsense-slot")).toBeNull();
    expect(document.getElementById("pixbee-adsense-script")).toBeNull();
  });

  it("keeps a public slot hidden when opt-in is true but the publisher is missing", () => {
    const { container } = render(
      <AdSenseSlot
        publicRoute="/sobre"
        slot="1234567890"
        settings={{
          enabled: true,
          clientId: "",
          homeSlot: "1234567890",
          aboutSlot: "1234567890",
          privacySlot: "1234567890",
        }}
      />,
    );

    expect(container.querySelector(".adsense-slot")).toBeNull();
    expect(document.getElementById("pixbee-adsense-script")).toBeNull();
  });

  it("accepts a valid enabled publisher and public slot configuration", () => {
    const configuredSettings = {
      enabled: true,
      clientId: "ca-pub-1234567890123456",
      homeSlot: "1234567890",
      aboutSlot: "1234567890",
      privacySlot: "1234567890",
    };

    expect(isAdSenseReady({
      enabled: configuredSettings.enabled,
      clientId: configuredSettings.clientId,
      slot: configuredSettings.homeSlot,
    })).toBe(true);

    const { container } = render(
      <AdSenseSlot
        publicRoute="/historico"
        slot={configuredSettings.homeSlot}
        label="Publicidade"
        variant="compact"
        settings={configuredSettings}
      />,
    );

    expect(container.querySelector(".adsense-slot")).not.toBeNull();
    expect(container.querySelector(".adsense-slot--compact")).not.toBeNull();
    expect(container.querySelector("ins.adsbygoogle")?.getAttribute("data-ad-client")).toBe(configuredSettings.clientId);
    expect(container.querySelector("ins.adsbygoogle")?.getAttribute("data-ad-slot")).toBe(configuredSettings.homeSlot);
    expect(document.getElementById("pixbee-adsense-script")?.getAttribute("src")).toContain(configuredSettings.clientId);
  });
});
