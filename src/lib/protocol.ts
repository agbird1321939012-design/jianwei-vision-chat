import type { ChatMessage, Message } from "../types";
export type ResponseEvent = {
  type: "text" | "reasoning" | "finish";
  value: string;
};
export function buildMessages(
  messages: Message[],
  systemPrompt: string,
): ChatMessage[] {
  const result: ChatMessage[] = systemPrompt.trim()
    ? [{ role: "system", content: systemPrompt.trim() }]
    : [];
  for (const message of messages) {
    if (
      message.role === "assistant" &&
      (!message.text.trim() || message.status === "error")
    )
      continue;
    if (message.images?.length) {
      result.push({
        role: message.role,
        content: [
          ...(message.text
            ? [{ type: "text" as const, text: message.text }]
            : []),
          ...message.images.map((image) => ({
            type: "image_url" as const,
            image_url: { url: image.dataUrl },
          })),
        ],
      });
    } else result.push({ role: message.role, content: message.text });
  }
  return result;
}
function errorText(body: unknown, status: number): string {
  const defaults: Record<number, string> = {
    401: "密钥或访问口令不正确，请检查设置",
    402: "余额不足，请检查中转站账户",
    403: "接口拒绝访问，请检查权限与模型",
    404: "模型或接口不存在，请检查 URL 和模型名称",
    413: "图片或对话过大，请减少图片或新建对话",
    429: "请求过于频繁或配额不足，请稍后再试",
    504: "接口响应超时，请稍后重试",
  };
  const obj = body as any;
  const detail =
    typeof obj?.error === "string"
      ? obj.error
      : obj?.error?.message || obj?.message;
  return typeof detail === "string"
    ? detail.slice(0, 1000)
    : defaults[status] || `请求失败（${status}），请检查接口配置`;
}
export async function consumeResponse(
  response: Response,
  onEvent: (event: ResponseEvent) => void,
): Promise<void> {
  if (!response.ok) {
    let body: unknown;
    try {
      body = await response.json();
    } catch {
      body = null;
    }
    throw new Error(errorText(body, response.status));
  }
  let finished = false;
  let hasContent = false;
  function handle(payload: any) {
    if (payload.error) throw new Error(errorText(payload, 400));
    const choice = payload.choices?.[0];
    if (!choice) return;
    const value = choice.delta || choice.message;
    if (typeof value?.reasoning_content === "string")
      onEvent({ type: "reasoning", value: value.reasoning_content });
    if (typeof value?.content === "string" && value.content) {
      hasContent = true;
      onEvent({ type: "text", value: value.content });
    }
    if (typeof value?.refusal === "string" && value.refusal) {
      hasContent = true;
      onEvent({ type: "text", value: value.refusal });
    }
    if (choice.finish_reason) {
      finished = true;
      onEvent({ type: "finish", value: choice.finish_reason });
    }
  }
  if (
    !(response.headers.get("content-type") || "").includes("text/event-stream")
  ) {
    let data: unknown;
    try {
      data = await response.json();
    } catch {
      throw new Error("接口返回的不是聊天 JSON，请检查接口地址");
    }
    handle(data);
    if (!hasContent)
      throw new Error("接口未返回可显示的文字，请检查模型是否兼容");
    return;
  }
  if (!response.body) throw new Error("接口返回了空响应");
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  function dispatch(block: string) {
    const data = block
      .split("\n")
      .filter((line) => line.startsWith("data:"))
      .map((line) => line.slice(5).replace(/^ /, ""))
      .join("\n")
      .trim();
    if (!data) return;
    if (data === "[DONE]") {
      finished = true;
      return;
    }
    let payload: unknown;
    try {
      payload = JSON.parse(data);
    } catch {
      throw new Error("接口流式数据格式异常；可尝试在设置中关闭流式回复");
    }
    handle(payload);
  }
  try {
    while (true) {
      const { value, done } = await reader.read();
      buffer += decoder.decode(value, { stream: !done });
      buffer = buffer.replace(/\r\n/g, "\n");
      let boundary: number;
      while ((boundary = buffer.indexOf("\n\n")) >= 0) {
        dispatch(buffer.slice(0, boundary));
        buffer = buffer.slice(boundary + 2);
      }
      if (buffer.length > 2_000_000) throw new Error("接口流式数据过大");
      if (done) break;
    }
    if (buffer.trim()) dispatch(buffer);
    if (!finished)
      throw new Error("回复连接中断，已保留收到的内容，可手动重新生成");
    if (!hasContent)
      throw new Error("模型未返回正文；可检查输出长度、模型名称或关闭流式回复");
  } finally {
    await reader.cancel().catch(() => {});
    reader.releaseLock();
  }
}

export function assertRequestFits(payload: unknown, limit: number): void {
  if (new TextEncoder().encode(JSON.stringify(payload)).length > limit)
    throw new Error(
      "图片和历史消息超过当前服务的请求容量，请降低图片尺寸、减少图片或新建对话",
    );
}
