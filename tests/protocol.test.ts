import { describe, it, expect } from "vitest";
import { normalizeEndpoint } from "../src/lib/endpoint";
import { consumeResponse, buildMessages } from "../src/lib/protocol";

describe("endpoint normalization", () => {
  it("accepts root, version, custom path and full endpoints without duplicating v1", () => {
    expect(normalizeEndpoint("https://relay.example")).toBe(
      "https://relay.example/v1/chat/completions",
    );
    expect(normalizeEndpoint("https://relay.example/v1/")).toBe(
      "https://relay.example/v1/chat/completions",
    );
    expect(normalizeEndpoint("https://relay.example/openai/v2")).toBe(
      "https://relay.example/openai/v2/chat/completions",
    );
    expect(normalizeEndpoint("https://relay.example/v1/chat/completions")).toBe(
      "https://relay.example/v1/chat/completions",
    );
  });
  it("rejects URL credentials, fragments and insecure protocols", () => {
    for (const url of [
      "http://example.com",
      "https://key@example.com",
      "https://example.com/#token",
      "file:///etc/passwd",
    ])
      expect(() => normalizeEndpoint(url)).toThrow();
  });
});

describe("multimodal protocol", () => {
  it("preserves image and text context but excludes failed assistant messages", () => {
    const messages = buildMessages(
      [
        {
          id: "1",
          role: "user",
          text: "解释",
          images: [
            {
              id: "i",
              name: "图",
              dataUrl: "data:image/png;base64,YQ==",
              width: 1,
              height: 1,
            },
          ],
          createdAt: 1,
        },
        { id: "2", role: "assistant", text: "", status: "error", createdAt: 2 },
      ],
      "系统",
    );
    expect(messages).toEqual([
      { role: "system", content: "系统" },
      {
        role: "user",
        content: [
          { type: "text", text: "解释" },
          {
            type: "image_url",
            image_url: { url: "data:image/png;base64,YQ==" },
          },
        ],
      },
    ]);
  });
  it("decodes UTF-8 and SSE split across arbitrary byte boundaries, including reasoning", async () => {
    const data =
      'data: {"choices":[{"delta":{"reasoning_content":"想一想"}}]}\r\n\r\ndata: {"choices":[{"delta":{"content":"你好🌸"}}]}\n\ndata: {"choices":[{"delta":{},"finish_reason":"length"}]}\n\ndata: [DONE]\n\n';
    const bytes = new TextEncoder().encode(data);
    const stream = new ReadableStream({
      start(controller) {
        for (let i = 0; i < bytes.length; i += 3)
          controller.enqueue(bytes.slice(i, i + 3));
        controller.close();
      },
    });
    const events: any[] = [];
    await consumeResponse(
      new Response(stream, {
        headers: { "Content-Type": "text/event-stream" },
      }),
      (e) => events.push(e),
    );
    expect(
      events
        .filter((e) => e.type === "text")
        .map((e) => e.value)
        .join(""),
    ).toBe("你好🌸");
    expect(events).toContainEqual({ type: "reasoning", value: "想一想" });
    expect(events).toContainEqual({ type: "finish", value: "length" });
  });
  it("accepts a non-streaming relay response and surfaces upstream errors", async () => {
    const events: any[] = [];
    await consumeResponse(
      Response.json({
        choices: [{ message: { content: "回答" }, finish_reason: "stop" }],
      }),
      (e) => events.push(e),
    );
    expect(events).toContainEqual({ type: "text", value: "回答" });
    await expect(
      consumeResponse(
        Response.json(
          { error: { message: "模型不支持图片" } },
          { status: 400 },
        ),
        () => {},
      ),
    ).rejects.toThrow("模型不支持图片");
  });
  it("reports a disconnected stream after partial text so it is never silently treated as complete", async () => {
    const events: any[] = [];
    const response = new Response(
      'data: {"choices":[{"delta":{"content":"部分"}}]}\n\n',
      { headers: { "Content-Type": "text/event-stream" } },
    );
    await expect(
      consumeResponse(response, (e) => events.push(e)),
    ).rejects.toThrow("中断");
    expect(events).toContainEqual({ type: "text", value: "部分" });
  });
});

import { assertRequestFits } from "../src/lib/protocol";
it("checks encoded request bytes against hosting limits before sending any billable call", () => {
  expect(() => assertRequestFits({ text: "你好" }, 100)).not.toThrow();
  expect(() => assertRequestFits({ text: "图片".repeat(100) }, 100)).toThrow(
    "容量",
  );
});
