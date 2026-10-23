import { it, expect, vi, afterEach } from "vitest";
import { createRequest, openChat } from "../src/lib/transport";
import { DEFAULT_SETTINGS } from "../src/types";
afterEach(() => vi.unstubAllGlobals());
it("uses direct HTTPS API in static hosting without sending the private access code to the relay", () => {
  const request = createRequest(
    {
      ...DEFAULT_SETTINGS,
      baseUrl: "https://relay.example",
      apiKey: "my-key",
      model: "vision",
      accessCode: "site-password",
      connectionMode: "direct",
    },
    [{ role: "user", content: "hi" }],
    true,
  );
  expect(request.url).toBe("https://relay.example/v1/chat/completions");
  expect(request.headers.Authorization).toBe("Bearer my-key");
  expect(request.headers["X-Access-Code"]).toBeUndefined();
  expect(request.body).not.toContain("my-key");
});
it("supports a separate same-protocol proxy and keeps relay key out of request headers", () => {
  const request = createRequest(
    {
      ...DEFAULT_SETTINGS,
      baseUrl: "https://relay.example",
      apiKey: "my-key",
      model: "vision",
      accessCode: "site-password",
      connectionMode: "proxy",
      proxyUrl: "https://private.example/",
    },
    [{ role: "user", content: "hi" }],
    false,
  );
  expect(request.url).toBe("https://private.example/api/chat");
  expect(request.headers.Authorization).toBeUndefined();
  expect(request.headers["X-Access-Code"]).toBe("site-password");
});
it("never retries a failing or cross-origin direct call and provides an actionable message", async () => {
  const fetcher = vi.fn().mockRejectedValue(new TypeError("Failed to fetch"));
  vi.stubGlobal("fetch", fetcher);
  await expect(
    openChat(
      {
        ...DEFAULT_SETTINGS,
        baseUrl: "https://relay.example",
        apiKey: "key",
        model: "v",
        connectionMode: "direct",
      },
      [{ role: "user", content: "hi" }],
      { localProxy: false },
    ),
  ).rejects.toThrow("代理");
  expect(fetcher).toHaveBeenCalledTimes(1);
});
