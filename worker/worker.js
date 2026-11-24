// Cloudflare Worker — nagho-hold ng Facebook token at nagpo-post sa Page
const MAX_BYTES = 5 * 1024 * 1024;
const TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
const BANNED = ['badword1', 'badword2']; // dagdagan mo

export default {
  async fetch(req, env) {
    const cors = {
      'Access-Control-Allow-Origin': env.ALLOWED_ORIGIN || '*',
      'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    };
    const json = (o, s = 200) => new Response(JSON.stringify(o),
      { status: s, headers: { ...cors, 'Content-Type': 'application/json' } });
    if (req.method === 'OPTIONS') return new Response(null, { headers: cors });

    const url = new URL(req.url);
    const G = 'https://graph.facebook.com/v21.0/' + env.FB_PAGE_ID;

    // WALL = laman ng Facebook Page mismo
    if (req.method === 'GET' && url.pathname === '/posts') {
      const r = await fetch(`${G}/posts?fields=message,full_picture,created_time&limit=50&access_token=${env.FB_PAGE_TOKEN}`,
        { cf: { cacheTtl: 30 } });
      const d = await r.json();
      if (!r.ok) return json({ error: 'Hindi ma-load ang wall.' }, 502);
      return json(d.data.map(p => ({
        id: p.id,
        message: (p.message || '').replace(/^#FreedomWall\s*/i, ''),
        image: p.full_picture || null,
        time: p.created_time,
      })));
    }

    if (req.method === 'POST' && url.pathname === '/post') {
      const form = await req.formData();
      if (form.get('website')) return json({ error: 'Spam detected' }, 400); // honeypot
      const msg = String(form.get('message') || '').trim().slice(0, 1000);
      const img = form.get('image');
      const hasImg = img && typeof img === 'object' && img.size > 0;

      if (!msg && !hasImg) return json({ error: 'Mag-type o mag-upload muna ng picture.' }, 400);
      if (BANNED.some(w => w && msg.toLowerCase().includes(w))) return json({ error: 'May bawal na salita sa post mo.' }, 400);
      if (hasImg && img.size > MAX_BYTES) return json({ error: 'Masyadong malaki ang picture (max 5MB).' }, 400);
      if (hasImg && !TYPES.includes(img.type)) return json({ error: 'JPG, PNG, GIF, WEBP lang ang pwede.' }, 400);

      // cooldown 60s per IP (hash lang, nabubura after 60s)
      const ip = req.headers.get('CF-Connecting-IP') || '';
      const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(ip + (env.SALT || 'fw')));
      const key = [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, '0')).join('');
      if (await env.RATE.get(key)) return json({ error: 'Sandali lang! Maghintay ng 1 minuto bago mag-post ulit.' }, 429);

      const caption = msg ? `#FreedomWall\n\n${msg}` : '#FreedomWall';
      const fd = new FormData();
      fd.append('access_token', env.FB_PAGE_TOKEN);
      let ep = 'feed';
      if (hasImg) { ep = 'photos'; fd.append('caption', caption); fd.append('source', img, 'image'); }
      else fd.append('message', caption);

      const r = await fetch(`${G}/${ep}`, { method: 'POST', body: fd });
      if (!r.ok) return json({ error: 'Hindi na-post sa Facebook. Subukan ulit mamaya.' }, 502);
      await env.RATE.put(key, '1', { expirationTtl: 60 });
      return json({ ok: true });
    }
    return json({ error: 'Not found' }, 404);
  },
};
