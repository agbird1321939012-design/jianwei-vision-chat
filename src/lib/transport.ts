import type { Settings, ChatMessage } from "../types";
import { normalizeEndpoint } from "./endpoint";
import { assertRequestFits } from "./protocol";
export const usesProxy = (settings: Settings, localProxy: boolean) =>
  settings.connectionMode === "proxy" ||
  (settings.connectionMode === "auto" &&
    (localProxy || Boolean(settings.proxyUrl)));
export function createRequest(
  settings: Settings,
  messages: ChatMessage[],
  localProxy: boolean,
  maxTokens = settings.maxTokens,
) {
  const proxy = usesProxy(settings, localProxy);
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  const body: Record<string, unknown> = {
    model: settings.model,
    messages,
    stream: settings.stream,
    max_tokens: maxTokens,
  };
  let url = normalizeEndpoint(settings.baseUrl);
  if (proxy) {
    if (settings.proxyUrl.trim()) {
      const base = new URL(settings.proxyUrl.trim());
      if (
        base.protocol !== "https:" ||
        base.username ||
        base.password ||
        base.search ||
        base.hash
      )
        throw new Error("代理地址需要是不含查询参数的 HTTPS 网址");
      url = base.toString().replace(/\/+$/, "") + "/api/chat";
    } else if (localProxy) url = "/api/chat";
    else throw new Error("请填写代理服务网址，或选择浏览器直连");
    headers["X-Access-Code"] = settings.accessCode;
    delete body.max_tokens;
    Object.assign(body, {
      baseUrl: settings.baseUrl,
      apiKey: settings.apiKey,
      maxTokens,
    });
  } else headers.Authorization = `Bearer ${settings.apiKey}`;
  return { url, headers, body: JSON.stringify(body), proxy };
}
export async function openChat(
  settings: Settings,
  messages: ChatMessage[],
  options: {
    localProxy: boolean;
    signal?: AbortSignal;
    maxTokens?: number;
    requestLimit?: number;
  },
) {
  const request = createRequest(
    settings,
    messages,
    options.localProxy,
    options.maxTokens,
  );
  assertRequestFits(
    JSON.parse(request.body),
    options.requestLimit || 18_000_000,
  );
  try {
    return await fetch(request.url, {
      method: "POST",
      headers: request.headers,
      body: request.body,
      signal: options.signal,
    });
  } catch (error) {
    if (options.signal?.aborted) throw error;
    throw new Error(
      request.proxy
        ? "代理连接失败，请检查代理网址、访问口令和网络"
        : "无法直接连接中转站，请检查网络。若网页调用受限，请在设置中切换“使用代理”；不会自动重试。",
    );
  }
}
