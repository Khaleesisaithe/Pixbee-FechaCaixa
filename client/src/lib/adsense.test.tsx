// @vitest-environment jsdom
import React from "react";
import { describe, expect, it } from "vitest";
import { render } from "@testing-library/react";
import { AdSenseSlot } from "@/components/AdSenseSlot";
import { adsenseSettings, isAdSenseReady, isPublicAdRoute, isValidAdSenseClientId } from "./adsense";
import { buildAdsTxtContent } from "@shared/adsense";

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
      <AdSenseSlot publicRoute="/" slot="1234567890" label="Advertisement" />,
    );

    expect(container.querySelector(".adsense-slot")).toBeNull();
    expect(document.getElementById("pixbee-adsense-script")).toBeNull();
    expect(isPublicAdRoute("/abertura")).toBe(false);
    expect(isPublicAdRoute("/contagem")).toBe(false);
    expect(isPublicAdRoute("/validacao")).toBe(false);
    expect(isPublicAdRoute("/historico")).toBe(false);
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

  it("stays disabled by default until project variables are configured", () => {
    expect(adsenseSettings.enabled).toBe(false);
    expect(adsenseSettings.clientId).toBe("");
    expect(adsenseSettings.homeSlot).toBe("");
    expect(adsenseSettings.aboutSlot).toBe("");
    expect(adsenseSettings.privacySlot).toBe("");
  });
});
