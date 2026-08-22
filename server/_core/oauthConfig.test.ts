import { describe, expect, it } from "vitest";
import { isOAuthConfigured } from "./oauthConfig";

describe("isOAuthConfigured", () => {
  it("keeps OAuth disabled when the application has no login configuration", () => {
    expect(isOAuthConfigured({})).toBe(false);
    expect(
      isOAuthConfigured({
        OAUTH_SERVER_URL: "https://oauth.example.com",
        VITE_APP_ID: "pixbee",
      })
    ).toBe(false);
  });

  it("enables OAuth only with the full redirect configuration", () => {
    expect(
      isOAuthConfigured({
        OAUTH_SERVER_URL: "https://oauth.example.com",
        VITE_APP_ID: "pixbee",
        VITE_OAUTH_PORTAL_URL: "https://login.example.com",
      })
    ).toBe(true);
  });
});
