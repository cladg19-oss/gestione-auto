const CACHE='mia-auto-v9-5-1-build-00052';
const ASSETS=['./','./index.html','./style.css','./js/storage.js','./js/utils.js','./js/events.js','./js/ocr/documentClassifier.js?v=00052','./js/ocr/parsers/librettoParser.js?v=00052','./js/ocr/parsers/certificatoProprietaParser.js?v=00052','./js/ocr/parsers/assicurazioneParser.js?v=00052','./js/documents.js?v=00052','./app.js','./manifest.json'];
self.addEventListener('install',event=>{
  self.skipWaiting();
  event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(ASSETS)));
});
self.addEventListener('activate',event=>{
  event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(key=>key!==CACHE).map(key=>caches.delete(key)))).then(()=>self.clients.claim()));
});
self.addEventListener('fetch',event=>{
  if(event.request.method!=='GET')return;
  event.respondWith(fetch(event.request).then(response=>{
    const copy=response.clone();
    caches.open(CACHE).then(cache=>cache.put(event.request,copy));
    return response;
  }).catch(()=>caches.match(event.request)));
});
