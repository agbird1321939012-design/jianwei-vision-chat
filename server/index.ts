import express from 'express';
import { resolve } from 'node:path';
import { createApp } from './app.js';
const app = createApp();
if (process.argv.includes('--dev')) {
  const { createServer } = await import('vite');
  const vite = await createServer({server:{middlewareMode:true},appType:'spa'});
  app.use(vite.middlewares);
} else {
  app.use(express.static(resolve('dist'), { setHeaders(res,path){ if(path.endsWith('sw.js')||path.endsWith('index.html'))res.setHeader('Cache-Control','no-cache'); } }));
  app.get('/{*path}', (_req,res)=>res.sendFile(resolve('dist/index.html')));
}
const port = Number(process.env.PORT || 5173);
const host = process.env.HOST || '127.0.0.1';
app.listen(port,host,()=>console.log(`见微已启动：http://${host}:${port}`));
