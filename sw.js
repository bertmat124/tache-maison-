const CACHE_NAME = 'tache-maison-sw-v6';
const SCHEDULE_CACHE_KEY = 'https://tache-maison.local/schedule.json';
const ASSETS_TO_CACHE = ['./', './index.html', './manifest.webmanifest'];
self.addEventListener('install', (e) => { e.waitUntil(caches.open(CACHE_NAME).then((c) => c.addAll(ASSETS_TO_CACHE)).catch(() => {}).then(() => self.skipWaiting())); });
self.addEventListener('activate', (e) => { e.waitUntil(self.clients.claim()); });
self.addEventListener('message', (e) => {
  if (!e.data) return;
  if (e.data.type === 'SKIP_WAITING') { self.skipWaiting(); return; }
  if (e.data.type === 'SYNC_SCHEDULE') { e.waitUntil(caches.open(CACHE_NAME).then((c) => c.put(SCHEDULE_CACHE_KEY, new Response(JSON.stringify(e.data), { headers: { 'Content-Type': 'application/json' } }))).catch(() => {})); }
  if (e.data.type === 'SHOW_NOTIF') { e.waitUntil(showUniversalTaskNotification(e.data.title, e.data.body, e.data.taskId, e.data.tag, e.data.icon, e.data.badge)); }
});
async function showUniversalTaskNotification(title, body, taskId = null, tag = 'tache-maison-push', icon, badge) {
  const opts = { body, tag, renotify: true, requireInteraction: true, silent: false, vibrate: [500, 150, 500, 150, 700], actions: [{ action: 'complete', title: '✅ Marquer fait' }, { action: 'snooze', title: '⏰ +5 min' }, { action: 'open', title: '📋 Ouvrir' }], data: { taskId, url: './' } };
  if (icon) opts.icon = icon;
  if (badge) opts.badge = badge;
  try { await self.registration.showNotification(title, opts); }
  catch (err) { await self.registration.showNotification(title, { body, tag, renotify: true, data: { taskId, url: './' } }); }
}
self.addEventListener('push', (e) => {
  let p = { title: '⏰ Rappel Tâche Maison', body: 'C’est l’heure de votre tâche !', taskId: null, tag: 'tache-maison-push' };
  try { if (e.data) p = { ...p, ...e.data.json() }; } catch (err) { try { if (e.data) p.body = e.data.text(); } catch (e2) {} }
  e.waitUntil(showUniversalTaskNotification(p.title, p.body, p.taskId, p.tag));
});
self.addEventListener('notificationclick', (e) => {
  e.notification.close();
  const taskId = e.notification.data && e.notification.data.taskId;
  const action = e.action || '';
  e.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((list) => {
    for (const c of list) { if ('focus' in c) { c.focus(); if (taskId && (action === 'complete' || action === 'snooze')) c.postMessage({ type: 'NOTIF_ACTION', taskId, action }); return; } }
    if (self.clients.openWindow) return self.clients.openWindow('./');
  }));
});
self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;
  const u = new URL(e.request.url);
  if (u.origin !== self.location.origin || u.pathname.startsWith('/api/')) return;
  e.respondWith(fetch(e.request).then((r) => { const cl = r.clone(); caches.open(CACHE_NAME).then((c) => c.put(e.request, cl)).catch(() => {}); return r; }).catch(() => caches.match(e.request)));
});