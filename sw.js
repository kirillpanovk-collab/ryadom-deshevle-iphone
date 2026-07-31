const VERSION="ryadom-pages-v5-smart-stores-7";
const BASE=new URL("./",self.location).pathname;
const SHELL=[BASE,`${BASE}index.html`,`${BASE}styles.css`,`${BASE}app.js`,`${BASE}manifest.webmanifest`,`${BASE}icon-192.png`,`${BASE}icon-512.png`,`${BASE}apple-touch-icon.png`];
self.addEventListener("install",event=>event.waitUntil(caches.open(VERSION).then(cache=>cache.addAll(SHELL.map(url=>new Request(url,{cache:"reload"})))).then(()=>self.skipWaiting())));
self.addEventListener("activate",event=>event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(key=>key!==VERSION).map(key=>caches.delete(key)))).then(()=>self.clients.claim())));
self.addEventListener("message",event=>{if(event.data?.type==="SKIP_WAITING")self.skipWaiting()});
self.addEventListener("fetch",event=>{
  if(event.request.method!=="GET")return;
  const url=new URL(event.request.url);
  if(url.origin!==self.location.origin)return;
  if(event.request.mode==="navigate"){
    event.respondWith(fetch(event.request).then(response=>{caches.open(VERSION).then(cache=>cache.put(BASE,response.clone()));return response}).catch(()=>caches.match(BASE)));
    return;
  }
  event.respondWith(caches.match(event.request).then(cached=>cached||fetch(event.request).then(response=>{if(response.ok)caches.open(VERSION).then(cache=>cache.put(event.request,response.clone()));return response})));
});
