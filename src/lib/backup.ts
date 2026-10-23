import type { Conversation, Prompt } from '../types';
export type Backup = { version: 1; exportedAt: string; conversations: Conversation[]; prompts: Prompt[] };
export function createBackup(data: { conversations: Conversation[]; prompts: Prompt[] }): Backup {
  return { version: 1, exportedAt: new Date().toISOString(), conversations: data.conversations, prompts: data.prompts };
}
const string = (v: unknown, max = 200_000): v is string => typeof v === 'string' && v.length <= max;
export function parseBackup(text: string): Backup {
  if (text.length > 50_000_000) throw new Error('备份超过 50 MB，请使用较小的备份');
  let data: any;
  try { data = JSON.parse(text); } catch { throw new Error('文件不是有效的 JSON 备份'); }
  const fail = () => { throw new Error('备份内容或版本不正确，未导入任何数据'); };
  if (data?.version !== 1 || !Array.isArray(data.conversations) || !Array.isArray(data.prompts) || data.conversations.length > 500 || data.prompts.length > 500) return fail();
  const ids = new Set<string>();
  for (const c of data.conversations) {
    if (!string(c.id, 100) || !c.id || ids.has(c.id) || !string(c.title, 200) || !Number.isFinite(c.createdAt) || !Number.isFinite(c.updatedAt) || !Array.isArray(c.messages) || c.messages.length > 2000) return fail();
    ids.add(c.id);
    const messageIds = new Set<string>();
    for (const m of c.messages) {
      if (!string(m.id, 100) || messageIds.has(m.id) || !['user','assistant'].includes(m.role) || !string(m.text) || !Number.isFinite(m.createdAt) || (m.reasoning != null && !string(m.reasoning)) || (m.status != null && !['done','stopped','error','generating'].includes(m.status)) || (m.error != null && !string(m.error,2000)) || (m.finishReason != null && !string(m.finishReason,100))) return fail();
      messageIds.add(m.id);
      if (m.status === 'generating') m.status = 'stopped';
      if (m.images !== undefined) {
        if (!Array.isArray(m.images) || m.images.length > 6) return fail();
        for (const image of m.images) if (!string(image.id, 100) || !string(image.name, 300) || !string(image.dataUrl, 5_000_000) || !/^data:image\/(?:jpeg|png|webp);base64,[a-zA-Z0-9+/]+=*$/.test(image.dataUrl) || !Number.isFinite(image.width) || !Number.isFinite(image.height) || image.width <= 0 || image.height <= 0 || image.width > 20000 || image.height > 20000) return fail();
      }
    }
  }
  const promptIds = new Set<string>();
  for (const p of data.prompts) { if (!string(p.id,100) || !p.id || promptIds.has(p.id) || !string(p.title,100) || !p.title.trim() || !string(p.content,30_000) || !p.content.trim()) return fail(); promptIds.add(p.id); }
  return { version: 1, exportedAt: typeof data.exportedAt === 'string' ? data.exportedAt : '', conversations: data.conversations, prompts: data.prompts };
}
