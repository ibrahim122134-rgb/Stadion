// Cloudflare Pages Function: /api/seats
// Quraşdırma: Pages layihəsində Settings > Functions > KV namespace bindings bölməsində
// dəyişən adı SEATS olan bir KV namespace əlavə et. Bu fayl functions/api/seats.js yolunda dayanmalıdır.
// Qeyd: KV eyni anda yazmalarda ziddiyyəti tam həll etmir; çox yüklü istifadə üçün Durable Objects və ya D1 lazımdır.
// Qeyd: istifadəçi adının həqiqətən həmin şəxsə aid olduğunu yoxlamır.

const NAME = /^[a-z0-9._]{1,30}$/;
const MAX_SEAT = 60000;
const json = (o, s = 200) =>
  new Response(JSON.stringify(o), {
    status: s,
    headers: { 'content-type': 'application/json', 'cache-control': 'no-store' },
  });
const readAll = async (env) => (await env.SEATS.get('all', 'json')) || { fans: [] };

export async function onRequestGet({ env }) {
  return json(await readAll(env));
}

export async function onRequestPost({ request, env }) {
  let b;
  try { b = await request.json(); } catch { return json({ error: 'bad_json' }, 400); }
  const name = String(b.name || '').trim().replace(/^@+/, '').toLowerCase();
  const seat = b.seat;
  if (!NAME.test(name) || !Number.isInteger(seat) || seat < 0 || seat >= MAX_SEAT) {
    return json({ error: 'bad_input' }, 400);
  }
  const d = await readAll(env);
  const ex = d.fans.find((f) => f.name === name);
  if (ex) return json({ error: 'name_taken', seat: ex.seat }, 409);
  if (d.fans.some((f) => f.seat === seat)) return json({ error: 'seat_taken' }, 409);
  d.fans.push({ name, seat, t: Date.now() });
  await env.SEATS.put('all', JSON.stringify(d));
  return json({ ok: true, seat });
}
