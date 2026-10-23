export function normalizeEndpoint(input: string): string {
  let url: URL;
  try { url = new URL(input.trim()); } catch { throw new Error('请输入完整的 HTTPS 接口地址'); }
  if (url.protocol !== 'https:') throw new Error('接口地址需要使用 HTTPS');
  if (url.username || url.password || url.hash || url.search) throw new Error('接口地址不能包含账号、密码、查询参数或锚点');
  let path = url.pathname.replace(/\/+$/, '');
  if (!path) path = '/v1';
  if (!path.endsWith('/chat/completions')) path += '/chat/completions';
  url.pathname = path;
  return url.toString();
}
