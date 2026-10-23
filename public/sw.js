/* Cache only public same-origin app files. Never intercept or cache API calls. */
const SCOPE=new URL('./',self.location.href).pathname;
const PREFIX='jianwei-shell:'+SCOPE+':';
const CACHE=PREFIX+'v2';
const CORE=[SCOPE,SCOPE+'index.html',SCOPE+'manifest.webmanifest',SCOPE+'icons/icon-192.png',SCOPE+'icons/apple-touch-icon.png'];
self.addEventListener('install',event=>{event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(CORE)));});
self.addEventListener('activate',event=>{event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(key=>key.startsWith(PREFIX)&&key!==CACHE).map(key=>caches.delete(key)))).then(()=>self.clients.claim()));});
self.addEventListener('fetch',event=>{
 const request=event.request;const url=new URL(request.url);
 if(request.method!=='GET'||url.origin!==self.location.origin||!url.pathname.startsWith(SCOPE)||url.pathname.startsWith(SCOPE+'api/'))return;
 if(request.mode==='navigate'){
  event.respondWith(fetch(request).then(response=>{if(response.ok){const copy=response.clone();event.waitUntil(caches.open(CACHE).then(cache=>cache.put(SCOPE+'index.html',copy)));}return response;}).catch(()=>caches.match(SCOPE+'index.html')));return;
 }
 if(['assets/','icons/','manifest.webmanifest'].some(path=>url.pathname.startsWith(SCOPE+path)))event.respondWith(caches.match(request).then(cached=>cached||fetch(request).then(response=>{if(response.ok){const copy=response.clone();event.waitUntil(caches.open(CACHE).then(cache=>cache.put(request,copy)));}return response;})));
});
