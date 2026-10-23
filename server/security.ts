import ipaddr from 'ipaddr.js';
import { normalizeEndpoint } from '../src/lib/endpoint.js';
import type { ChatMessage } from '../src/types';
export function isPublicAddress(address: string): boolean {
  try {
    let parsed = ipaddr.parse(address);
    if (parsed.kind() === 'ipv6' && (parsed as ipaddr.IPv6).isIPv4MappedAddress()) parsed = (parsed as ipaddr.IPv6).toIPv4Address();
    return parsed.range() === 'unicast';
  } catch { return false; }
}
export type ProxyPayload = { endpoint: string; apiKey: string; model: string; stream: boolean; maxTokens: number; messages: ChatMessage[] };
export function validatePayload(body: any): ProxyPayload {
  if (!body || typeof body !== 'object') throw new Error('请求内容不正确');
  const endpoint = normalizeEndpoint(body.baseUrl || '');
  const url = new URL(endpoint);
  if (url.port && url.port !== '443') throw new Error('接口仅支持 HTTPS 443 端口');
  if (typeof body.apiKey !== 'string' || !body.apiKey.trim() || body.apiKey.length > 2000 || /[\r\n]/.test(body.apiKey)) throw new Error('请填写有效的 API 密钥');
  if (typeof body.model !== 'string' || !body.model.trim() || body.model.length > 200) throw new Error('请填写模型名称');
  if (body.stream !== undefined && typeof body.stream !== 'boolean') throw new Error('流式参数不正确');
  if (!Array.isArray(body.messages) || !body.messages.length || body.messages.length > 200) throw new Error('每次请求最多包含 200 条消息，请新建对话');
  let chars = 0;
  for (const message of body.messages) {
    if (!message || !['system','user','assistant'].includes(message.role)) throw new Error('消息角色不正确');
    if (typeof message.content === 'string') chars += message.content.length;
    else if (Array.isArray(message.content) && message.content.length <= 8) {
      for (const part of message.content) {
        if (part?.type === 'text' && typeof part.text === 'string') chars += part.text.length;
        else if (part?.type === 'image_url' && typeof part.image_url?.url === 'string' && /^data:image\/(jpeg|png|webp);base64,[a-zA-Z0-9+/]+=*$/.test(part.image_url.url) && part.image_url.url.length <= 5_000_000) chars += part.image_url.url.length;
        else throw new Error('图片格式不支持，仅接受 JPEG、PNG、WebP 数据');
      }
    } else throw new Error('消息内容不正确');
  }
  if (chars > 18_000_000) throw new Error('图片和历史消息过大，请减少图片或新建对话');
  const maxTokens = body.maxTokens ?? 4096;
  if (!Number.isInteger(maxTokens) || maxTokens < 256 || maxTokens > 32768) throw new Error('输出长度应为 256–32768');
  return { endpoint, apiKey: body.apiKey.trim(), model: body.model.trim(), stream: body.stream !== false, messages: body.messages, maxTokens };
}
