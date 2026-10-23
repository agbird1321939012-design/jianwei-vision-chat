import { Router, type Request, type Response } from 'express';
import { Agent, request } from 'undici';
import { lookup } from 'node:dns/promises';
import { isIP } from 'node:net';
import { createHash, timingSafeEqual } from 'node:crypto';
import { isPublicAddress, validatePayload } from './security.js';
type Options = { password?: string; publicDeployment?: boolean };
export function createApiRouter(options: Options = {}) {
  const router = Router();
  const password = options.password ?? process.env.ACCESS_PASSWORD ?? '';
  const publicDeployment = options.publicDeployment ?? Boolean(process.env.VERCEL || process.env.APP_PUBLIC === '1' || process.env.HOST === '0.0.0.0');
  const buckets = new Map<string, { count: number; start: number }>();
  router.use((req,res,next)=>{const origin=req.get('origin');if(origin&&origin===process.env.PUBLIC_ORIGIN){res.setHeader('Access-Control-Allow-Origin',origin);res.setHeader('Vary','Origin');res.setHeader('Access-Control-Allow-Methods','GET, POST, OPTIONS');res.setHeader('Access-Control-Allow-Headers','Content-Type, X-Access-Code');if(req.method==='OPTIONS'){res.sendStatus(204);return;}}if(req.method==='OPTIONS'){res.sendStatus(403);return;}next();});
  router.get('/health', (_req, res) => { res.setHeader('Cache-Control', 'no-store'); res.json({ ok: true, passwordRequired: Boolean(password), setupRequired: publicDeployment && !password, maxRequestBytes: process.env.VERCEL ? 3_900_000 : 18_000_000 }); });
  router.post('/chat', async (req: Request, res: Response) => {
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    if (publicDeployment && !password) { res.status(503).json({error:{message:'服务尚未设置私人访问口令，请在部署环境中配置 ACCESS_PASSWORD'}}); return; }
    const ip = req.socket.remoteAddress || 'unknown';
    const now = Date.now();
    for (const [key,value] of buckets) if (now - value.start > 60_000) buckets.delete(key);
    const bucket = buckets.get(ip) || { count: 0, start: now };
    bucket.count++; buckets.set(ip,bucket);
    if (bucket.count > 40) { res.status(429).json({error:{message:'请求过于频繁，请一分钟后再试'}}); return; }
    if (password) {
      const supplied = req.get('x-access-code') || '';
      if (supplied.length > 2000 || !timingSafeEqual(createHash('sha256').update(password).digest(), createHash('sha256').update(supplied).digest())) { res.status(401).json({error:{message:'私人访问口令不正确，请在 API 设置中填写'}}); return; }
    } else if (!['127.0.0.1','::1','::ffff:127.0.0.1'].includes(ip)) { res.status(403).json({error:{message:'外部访问需要配置私人访问口令'}}); return; }
    const origin = req.get('origin');
    if (origin) {
      try { if (new URL(origin).host !== req.get('host') && origin !== process.env.PUBLIC_ORIGIN) throw new Error(); }
      catch { res.status(403).json({error:{message:'不允许跨站调用'}}); return; }
    }
    if (!req.is('application/json')) { res.status(415).json({error:{message:'请求需要使用 JSON 格式'}}); return; }
    let agent: Agent | undefined;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 180_000);
    res.on('close', () => { if (!res.writableEnded) controller.abort(); });
    try {
      const payload = validatePayload(req.body);
      const url = new URL(payload.endpoint);
      const hostname = url.hostname.replace(/^\[|\]$/g, '');
      const addresses = isIP(hostname) ? [{ address: hostname, family: isIP(hostname) }] : await lookup(hostname, { all: true });
      if (!addresses.length || addresses.some(record => !isPublicAddress(record.address))) throw new Error('接口地址必须指向公网服务，不支持本机或内网地址');
      const pinned = addresses[0];
      agent = new Agent({ connect: { timeout: 15_000, lookup: ((_hostname: string, lookupOptions: any, callback: any) => {
        if (lookupOptions.all) callback(null, [{ address: pinned.address, family: pinned.family }]);
        else callback(null, pinned.address, pinned.family);
      }) as any } });
      const upstream = await request(payload.endpoint, {
        dispatcher: agent, method: 'POST', // undici.request does not follow redirects without a redirect interceptor.
        headers: { 'Authorization': `Bearer ${payload.apiKey}`, 'Content-Type': 'application/json', 'Accept': payload.stream ? 'text/event-stream, application/json' : 'application/json' },
        body: JSON.stringify({ model: payload.model, messages: payload.messages, stream: payload.stream, max_tokens: payload.maxTokens }),
        signal: controller.signal, headersTimeout: 60_000, bodyTimeout: 90_000,
      });
      if (upstream.statusCode >= 300) {
        let content = ''; let size = 0;
        for await (const chunk of upstream.body) { size += chunk.length; if (size > 64_000) { upstream.body.destroy(); break; } content += chunk.toString(); }
        let message = `中转站请求失败（${upstream.statusCode}），请检查密钥、模型和接口地址`;
        try { const parsed = JSON.parse(content); const detail = parsed.error?.message || parsed.message || parsed.error; if (typeof detail === 'string') message = detail.slice(0,1000); } catch { /* Never forward HTML pages or raw secrets. */ }
        if (upstream.statusCode >= 300 && upstream.statusCode < 400) message = '接口返回重定向，请填写最终的 HTTPS 聊天接口地址';
        res.status(upstream.statusCode >= 400 ? upstream.statusCode : 400).json({error:{message}}); return;
      }
      const contentType = String(upstream.headers['content-type'] || 'application/json');
      res.status(200).set({ 'Content-Type': contentType.includes('text/event-stream') ? 'text/event-stream; charset=utf-8' : 'application/json; charset=utf-8', 'X-Accel-Buffering': 'no' });
      res.flushHeaders();
      let received = 0;
      for await (const chunk of upstream.body) {
        received += chunk.length;
        if (received > 8_000_000) throw new Error('接口回复超过大小限制，已保留部分内容');
        if (!res.write(chunk)) await new Promise<void>((resolve,reject) => { const cleanup=()=>{res.off('drain',drain);res.off('close',close);}; const drain=()=>{cleanup();resolve();};const close=()=>{cleanup();reject(new Error('closed'));};res.once('drain',drain);res.once('close',close); });
      }
      res.end();
    } catch (error: any) {
      if (!res.headersSent) {
        const timeout = controller.signal.aborted || /TIMEOUT|ABORT/.test(error.code || '');
        const known = !error.code && typeof error.message === 'string' && /接口|图片|消息|填写|请求|输出|流式/.test(error.message);
        res.status(timeout ? 504 : known ? 400 : 502).json({error:{message: timeout ? '接口响应超时，请保持页面在前台并稍后重试' : known ? error.message : '无法连接到中转站，请检查 URL、网络或证书'}});
      } else if (!res.writableEnded) res.destroy();
    } finally { clearTimeout(timer); if (agent) await agent.close().catch(()=>{}); }
  });
  return router;
}
