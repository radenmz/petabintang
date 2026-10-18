/**
 * Operator dashboard for the semi-automatic WhatsApp follow-up (Opsi C).
 *
 * Served at GET /admin/wa-followup. The page itself contains no data — it asks
 * the operator for the shared ADMIN_SECRET, then calls the protected
 * /api/admin/* endpoints with it. The browser stores the secret in
 * sessionStorage only (cleared when the tab closes) and never sends it anywhere
 * except our own admin API.
 *
 * Kept as a string so it bundles into dist/server.mjs and needs no extra
 * static asset at deploy time.
 */
export const ADMIN_WA_FOLLOWUP_HTML = `<!doctype html>
<html lang="id">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<meta name="robots" content="noindex, nofollow" />
<title>Peta Bintang — Follow-up WA</title>
<style>
  :root { color-scheme: light; }
  * { box-sizing: border-box; }
  body { font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, sans-serif; margin: 0; background: #f5f1e8; color: #211d17; }
  header { background: #211d17; color: #f5f1e8; padding: 16px 20px; }
  header h1 { margin: 0; font-size: 18px; }
  header p { margin: 4px 0 0; font-size: 12px; opacity: .7; }
  main { max-width: 960px; margin: 0 auto; padding: 20px; }
  .bar { display: flex; gap: 8px; flex-wrap: wrap; align-items: center; margin-bottom: 16px; }
  input, select, button { font: inherit; padding: 8px 10px; border-radius: 8px; border: 1px solid #c9c0ad; background: #fff; }
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
  <h1>Follow-up WhatsApp — Peta Bintang</h1>
  <p>Pesanan pending untuk ditindaklanjuti: follow-up ≥ 24 jam (ber-WA), tanpa kontak, atau belum bayar (ada kontak). Tombol &ldquo;Bersihkan&rdquo; menghapus email/WA order pending &gt; 30 hari (UU PDP).</p>
</header>
<main>
  <div class="bar">
    <input id="secret" type="password" placeholder="ADMIN_SECRET" style="min-width:220px" />
    <label style="font-size:13px">Tampilkan
      <select id="mode">
        <option value="wa" selected>Perlu follow-up (ber-WA)</option>
        <option value="missing">Tanpa kontak</option>
        <option value="abandoned">Belum bayar (ada kontak)</option>
      </select>
    </label>
    <label style="font-size:13px">Batas mundur (jam)
      <select id="minHours">
        <option value="24" selected>24</option>
        <option value="12">12</option>
        <option value="48">48</option>
        <option value="72">72</option>
      </select>
    </label>
    <button id="load">Muat daftar</button>
    <button id="purge" class="ghost">Bersihkan kontak &gt; 30 hari</button>
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
    const minHours = $('minHours').value;
    const mode = $('mode').value;
    try {
      let url, dataKey;
      if (mode === 'abandoned') {
        // Abandoned checkout: order pending yang mengisi kontak tapi tidak bayar.
        // minHours di sini diterjemahkan ke ambang abandoned (default 2 jam).
        url = '/api/admin/abandoned-orders?minHours=' + Math.max(1, Math.round(parseInt(minHours, 10) / 12) || 2);
        dataKey = 'orders';
      } else {
        url = '/api/admin/pending-wa-reminders?minHours=' + minHours + '&contact=' + encodeURIComponent(mode);
        dataKey = 'reminders';
      }
      const res = await fetch(url, { headers: headers() });
      if (res.status === 404) { $('list').innerHTML = '<div class="empty">Tidak diizinkan (secret salah atau endpoint nonaktif).</div>'; return; }
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || ('HTTP ' + res.status));
      render(data[dataKey] || [], mode);
    } catch (e) {
      $('list').innerHTML = '';
      $('err').textContent = e.message || 'Gagal memuat.';
    }
  }

  function render(rows, mode) {
    $('count').textContent = rows.length + ' pesanan';
    if (!rows.length) {
      const msg = mode === 'missing'
        ? 'Semua pesanan pending punya kontak. 🎉'
        : mode === 'abandoned'
        ? 'Tidak ada pesanan abandoned. 🎉'
        : 'Tidak ada pengingat yang tertunda. 🎉';
      $('list').innerHTML = '<div class="empty">' + msg + '</div>';
      return;
    }
    $('list').innerHTML = rows.map(function (r) {
      const since = new Date(r.createdAt).toLocaleString('id-ID');
      let contact, actions;
      if (mode === 'missing') {
        contact = 'tanpa kontak';
        actions = '<button class="ghost" data-copy="' + escapeHtml(r.accessUrl) + '">Salin link akses</button>' +
          '<button class="ghost" data-token="' + r.token + '" data-status="skipped">Lewati</button>';
      } else if (mode === 'abandoned') {
        // Abandoned: ada kontak (email/WA) tapi belum bayar. Tampilkan link WA bila ada,
        // plus salin link akses. Tidak ada tombol "tandai terkirim" — ini bukan WA reminder.
        contact = escapeHtml(r.email || '') + (r.whatsappNumber ? ' · WA ' + escapeHtml(r.whatsappNumber) : '');
        actions = (r.waLink ? '<a class="wa-link" target="_blank" rel="noopener" href="' + r.waLink + '"><button class="wa">Buka WhatsApp</button></a>' : '') +
          '<button class="ghost" data-copy="' + escapeHtml(r.accessUrl) + '">Salin link</button>';
      } else {
        contact = escapeHtml(r.whatsappNumber || '') + (r.email ? ' · ' + escapeHtml(r.email) : '');
        actions = '<a class="wa-link" target="_blank" rel="noopener" href="' + r.waLink + '"><button class="wa">Buka WhatsApp</button></a>' +
          '<button class="ghost" data-copy="' + escapeHtml(r.accessUrl) + '">Salin link</button>' +
          '<button class="ghost" data-token="' + r.token + '" data-status="sent">Tandai terkirim</button>' +
          '<button class="ghost" data-token="' + r.token + '" data-status="skipped">Lewati</button>';
      }
      return '<div class="card">' +
        '<div class="meta"><b>' + escapeHtml(r.childName) + ' — ' + escapeHtml(r.archetype) + '</b>' +
        '<span>' + contact + ' · dibuat ' + since + '</span>' +
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

  async function purge() {
    const secret = secretInput.value.trim();
    if (!secret) { $('err').textContent = 'Masukkan ADMIN_SECRET dulu.'; return; }
    if (!confirm('Bersihkan email & WhatsApp pesanan pending yang lebih tua dari 30 hari? Baris order tetap ada untuk statistik.')) return;
    $('err').textContent = '';
    try {
      const res = await fetch('/api/admin/purge-stale-contacts', { method: 'POST', headers: headers(), body: JSON.stringify({ olderThanDays: 30 }) });
      if (res.status === 404) { $('err').textContent = 'Tidak diizinkan (secret salah).'; return; }
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Gagal');
      $('err').textContent = data.purged + ' kontak dibersihkan.';
      if ($('mode').value === 'abandoned') load();
    } catch (e) { $('err').textContent = e.message || 'Gagal membersihkan.'; }
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
      const res = await fetch('/api/admin/mark-wa-sent', { method: 'POST', headers: headers(), body: JSON.stringify({ token: token, status: status }) });
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
  $('mode').addEventListener('change', load);
  $('purge').addEventListener('click', purge);
  secretInput.addEventListener('keydown', function (e) { if (e.key === 'Enter') load(); });
</script>
</body>
</html>`;
