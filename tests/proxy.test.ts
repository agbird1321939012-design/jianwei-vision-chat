import { it, expect } from "vitest";
import { isPublicAddress, validatePayload } from "../server/security";
it("blocks internal, loopback, mapped and special addresses but accepts public IPs", () => {
  for (const ip of [
    "127.0.0.1",
    "10.0.0.1",
    "172.16.0.5",
    "192.168.1.1",
    "169.254.169.254",
    "0.0.0.0",
    "100.64.0.1",
    "::1",
    "fc00::1",
    "fe80::1",
    "::ffff:127.0.0.1",
    "2001:db8::1",
  ])
    expect(isPublicAddress(ip), ip).toBe(false);
  for (const ip of ["1.1.1.1", "8.8.8.8", "2606:4700:4700::1111"])
    expect(isPublicAddress(ip), ip).toBe(true);
});
it("validates configuration, bounded history and multimodal image type", () => {
  const request = {
    baseUrl: "https://relay.example",
    apiKey: "abc",
    model: "vision",
    stream: true,
    messages: [
      {
        role: "user",
        content: [
          {
            type: "image_url",
            image_url: { url: "data:image/jpeg;base64,YQ==" },
          },
        ],
      },
    ],
  };
  expect(validatePayload(request).model).toBe("vision");
  expect(() =>
    validatePayload({
      ...request,
      messages: [
        {
          role: "user",
          content: [
            { type: "image_url", image_url: { url: "http://localhost/a" } },
          ],
        },
      ],
    }),
  ).toThrow();
  expect(() =>
    validatePayload({ ...request, apiKey: "x\r\nInjected:y" }),
  ).toThrow();
});

import express from "express";
import { createServer } from "node:http";
import { createApiRouter } from "../server/proxy";
it("fails closed for public deployment without a private password and rejects cross-origin calls", async () => {
  const app = express();
  app.use(express.json());
  app.use("/api", createApiRouter({ publicDeployment: true, password: "" }));
  const server = createServer(app);
  await new Promise<void>((r) => server.listen(0, "127.0.0.1", r));
  const port = (server.address() as any).port;
  try {
    const health = await fetch(`http://127.0.0.1:${port}/api/health`);
    expect(((await health.json()) as any).setupRequired).toBe(true);
    const missing = await fetch(`http://127.0.0.1:${port}/api/chat`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: "{}",
    });
    expect(missing.status).toBe(503);
  } finally {
    server.closeAllConnections();
    await new Promise<void>((r) => server.close(() => r()));
  }
  const secured = express();
  secured.use(express.json());
  secured.use(
    "/api",
    createApiRouter({ publicDeployment: true, password: "test-code" }),
  );
  const s = createServer(secured);
  await new Promise<void>((r) => s.listen(0, "127.0.0.1", r));
  const p = (s.address() as any).port;
  try {
    const bad = await fetch(`http://127.0.0.1:${p}/api/chat`, {
      method: "POST",
      headers: { "content-type": "application/json", "x-access-code": "wrong" },
      body: "{}",
    });
    expect(bad.status).toBe(401);
    const foreign = await fetch(`http://127.0.0.1:${p}/api/chat`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-access-code": "test-code",
        Origin: "https://evil.example",
      },
      body: "{}",
    });
    expect(foreign.status).toBe(403);
    const internal = await fetch(`http://127.0.0.1:${p}/api/chat`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-access-code": "test-code",
      },
      body: JSON.stringify({
        baseUrl: "https://127.0.0.1",
        apiKey: "fake",
        model: "test",
        messages: [{ role: "user", content: "hi" }],
      }),
    });
    expect(internal.status).toBe(400);
  } finally {
    s.closeAllConnections();
    await new Promise<void>((r) => s.close(() => r()));
  }
});

import { resolveDestination } from "../server/dns";
import { vi } from "vitest";
it("optionally resolves through trusted HTTPS DNS and still rejects any private destination", async () => {
  const original = globalThis.fetch;
  try {
    vi.stubGlobal("fetch", async (input: string) =>
      Response.json({
        Answer: input.includes("type=A&") ? [{ type: 1, data: "1.1.1.1" }] : [],
      }),
    );
    expect(
      (await resolveDestination("relay.example", "cloudflare"))[0].address,
    ).toBe("1.1.1.1");
    vi.stubGlobal("fetch", async () =>
      Response.json({ Answer: [{ type: 1, data: "127.0.0.1" }] }),
    );
    await expect(
      resolveDestination("relay.example", "cloudflare"),
    ).rejects.toThrow("公网");
    await expect(resolveDestination("127.0.0.1", "cloudflare")).rejects.toThrow(
      "公网",
    );
  } finally {
    globalThis.fetch = original;
  }
});
