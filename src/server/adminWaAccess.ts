/**
 * Operator dashboard for WA delivery of the e-book access link to PAID orders.
 *
 * Served at GET /admin/wa-access. Sibling to /admin/wa-followup (which handles
 * UNPAID reminders). This page lists paid orders that have a WhatsApp number
 * but have not yet been sent the access link via WA — the manual fallback when
 * the post-payment email (Resend) missed the inbox (spam/typo).
 *
 * Same pattern: page contains no data, prompts for ADMIN_SECRET, calls the
 * protected /api/admin/paid-wa-pending + /api/admin/mark-wa-access-sent.
 * Secret stored in sessionStorage only.
 */
export const ADMIN_WA_ACCESS_HTML = `<!doctype html>
<html lang="id">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<meta name="robots" content="noindex, nofollow" />
<title>Peta Bintang — Kirim Akses via WA</title>
<style>
  :root { color-scheme: light; }
  * { box-sizing: border-box; }
  body { font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, sans-serif; margin: 0; background: #f5f1e8; color: #211d17; }
  header { background: #211d17; color: #f5f1e8; padding: 16px 20px; }
  header h1 { margin: 0; font-size: 18px; }
  header p { margin: 4px 0 0; font-size: 12px; opacity: .7; }
  main { max-width: 960px; margin: 0 auto; padding: 20px; }
  .bar { display: flex; gap: 8px; flex-wrap: wrap; align-items: center; margin-bottom: 16px; }
  input, button { font: inherit; padding: 8px 10px; border-radius: 8px; border: 1px solid #c9c0ad; background: #fff; }
  button { cursor: pointer; border: 0; background: #2c6a5f; color: #fff; font-weight: 600; }
  button:disabled { opacity: .5; cursor: default; }
  button.ghost { background: transparent; color: #2c6a5f; border: 1px solid #2c6a5f; }
  button.wa { background: #25d366; color: #073b1a; }
  .card { background: #fff; border: 1px solid #e0d9c8; border-radius: 12px; padding: 14px 16px; margin-bottom: 10px; display: flex; gap: 12px; align-items: center; justify-content: space-between; flex-wrap: wrap; }
  .meta { font-size: 13px; }
  .meta b { display: block; font-size: 15px; }
  .meta span { color: #6b6455; }
  .meta .tok { display: block; font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 11px; color: #9a9280; margin-top: 2px; }
  .actions { display: flex; gap: 8px; }
  .empty { padding: 40px; text-align: center; color: #6b6455; }
  .err { color: #b3261e; font-size: 13px; }
  .count { font-size: 13px; color: #6b6455; margin-left: auto; }
  a.wa-link { text-decoration: none; }
</style>
</head>
<body>
<header>
  <h1>Kirim Akses via WhatsApp — Peta Bintang</h1>
  <p>Pesanan sudah dibayar tapi belum dikirimi tautan e-book via WA. Cadangan bila email masuk spam / salah ketik. Kirim dari WhatsApp Anda, lalu tandai terkirim.</p>
</header>
<main>
  <div class="bar">
    <input id="secret" type="password" placeholder="ADMIN_SECRET" style="min-width:220px" />
    <button id="load">Muat daftar</button>
    <span id="count" class="count"></span>
  </div>
  <div id="err" class="err"></div>
  <div id="list"></div>
</main>
<script>
  const $ = (id) => document.getElementById(id);
  const secretInput = $('secret');
  secretInput.value = sessionStorage.getItem('pb_admin_secret') || '';

  function headers() {
    return { 'Content-Type': 'application/json', 'x-admin-secret': secretInput.value.trim() };
  }

  async function load() {
    const secret = secretInput.value.trim();
    if (!secret) { $('err').textContent = 'Masukkan ADMIN_SECRET dulu.'; return; }
    sessionStorage.setItem('pb_admin_secret', secret);
    $('err').textContent = '';
    $('count').textContent = '';
    $('list').innerHTML = '<div class="empty">Memuat…</div>';
    try {
      const res = await fetch('/api/admin/paid-wa-pending', { headers: headers() });
      if (res.status === 404) { $('list').innerHTML = '<div class="empty">Tidak diizinkan (secret salah atau endpoint nonaktif).</div>'; return; }
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || ('HTTP ' + res.status));
      render(data.orders || []);
    } catch (e) {
      $('list').innerHTML = '';
      $('err').textContent = e.message || 'Gagal memuat.';
    }
  }

  function render(rows) {
    $('count').textContent = rows.length + ' pesanan';
    if (!rows.length) {
      $('list').innerHTML = '<div class="empty">Semua pesanan berbayar sudah dikirimi WA. 🎉</div>';
      return;
    }
    $('list').innerHTML = rows.map(function (r) {
      const paid = r.paidAt ? new Date(r.paidAt).toLocaleString('id-ID') : '?';
      const contact = escapeHtml(r.whatsappNumber || '') + (r.email ? ' · ' + escapeHtml(r.email) : '');
      const actions = '<a class="wa-link" target="_blank" rel="noopener" href="' + r.waLink + '"><button class="wa">Buka WhatsApp</button></a>' +
        '<button class="ghost" data-copy="' + escapeHtml(r.accessUrl) + '">Salin link</button>' +
        '<button class="ghost" data-token="' + r.token + '" data-status="sent">Tandai terkirim</button>' +
        '<button class="ghost" data-token="' + r.token + '" data-status="skipped">Lewati</button>';
      return '<div class="card">' +
        '<div class="meta"><b>' + escapeHtml(r.childName) + ' — ' + escapeHtml(r.archetype) + '</b>' +
        '<span>' + contact + ' · dibayar ' + paid + '</span>' +
        '<span class="tok">' + escapeHtml(r.token) + '</span></div>' +
        '<div class="actions">' + actions + '</div></div>';
    }).join('');
    $('list').querySelectorAll('button[data-token]').forEach(function (btn) {
      btn.addEventListener('click', function () { mark(btn.getAttribute('data-token'), btn.getAttribute('data-status')); });
    });
    $('list').querySelectorAll('button[data-copy]').forEach(function (btn) {
      btn.addEventListener('click', function () { copyLink(btn.getAttribute('data-copy'), btn); });
    });
  }

  async function copyLink(url, btn) {
    try {
      await navigator.clipboard.writeText(url);
      const prev = btn.textContent; btn.textContent = 'Tersalin ✓';
      setTimeout(function () { btn.textContent = prev; }, 1500);
    } catch (e) {
      window.prompt('Salin link akses:', url);
    }
  }

  async function mark(token, status) {
    try {
      const res = await fetch('/api/admin/mark-wa-access-sent', { method: 'POST', headers: headers(), body: JSON.stringify({ token: token, status: status }) });
      if (!res.ok) { const d = await res.json().catch(function(){ return {}; }); throw new Error(d.error || 'Gagal'); }
      load();
    } catch (e) { $('err').textContent = e.message || 'Gagal menandai.'; }
  }

  function escapeHtml(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  $('load').addEventListener('click', load);
  secretInput.addEventListener('keydown', function (e) { if (e.key === 'Enter') load(); });
</script>
</body>
</html>`;
