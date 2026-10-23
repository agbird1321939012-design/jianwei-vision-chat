import express from 'express';
import { createApiRouter } from './proxy.js';
export function createApp() {
  const app = express();
  app.disable('x-powered-by');
  app.use((_req,res,next)=>{res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('Referrer-Policy','no-referrer');res.setHeader('X-Frame-Options','DENY');next();});
  app.use('/api', express.json({limit:'20mb'}), createApiRouter());
  app.use('/api', (_req,res)=>{res.status(404).json({error:{message:'API 路由不存在'}});});
  app.use((err: any,_req: any,res: any,next: any)=>{ if (!err) return next();res.status(err.type==='entity.too.large'?413:400).json({error:{message:err.type==='entity.too.large'?'图片或对话过大，请减少图片':'请求 JSON 无效'}}); });
  return app;
}
