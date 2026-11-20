import { after, before, describe, test } from 'node:test';
import assert from 'node:assert/strict';

process.env.DB_FILE = ':memory:';
process.env.DEMO_MODE = 'true';

const { one } = await import('../src/db/index.js');
const { seed, DEMO_PASSWORD } = await import('../src/db/seed.js');
const { buildSlots } = await import('../src/lib/slots.js');
const { addDays, isoDate } = await import('../src/lib/time.js');
const bookings = await import('../src/services/bookings.js');
const { createApp } = await import('../src/app.js');

await seed();

const user = (email) => one('SELECT * FROM users WHERE email = ?', email);
const in3days = addDays(isoDate(), 3);

/** First resource + start time at a venue that is free for `count` consecutive slots. */
function freeSlot(venueSlug, count = 1) {
  const resources = one(`SELECT group_concat(r.id) AS ids FROM resources r JOIN venues v ON v.id = r.venue_id WHERE v.slug = ?`, venueSlug)
    .ids.split(',').map(Number);
  for (const id of resources) {
    const { slots } = bookings.slotsFor(id, in3days);
    for (let i = 0; i + count <= slots.length; i++) {
      if (slots.slice(i, i + count).every((s) => s.state === 'open')) return { resourceId: id, start: slots[i].start, slots };
    }
  }
  throw new Error('no free slot in seed data');
}

describe('slot layout', () => {
  const resource = { slot_minutes: 60, price_per_slot: 200, peak_price: 300 };
  const venue = { opens_at: '10:00', closes_at: '14:00' };

  test('splits opening hours into slots and marks overlaps', () => {
    const slots = buildSlots({
      resource,
      venue,
      date: '2030-01-07', // a Monday
      bookings: [{ id: 9, start_time: '11:00', end_time: '12:00' }],
      blocks: [{ start_time: '13:30', end_time: '14:00', reason: 'Repair' }],
      now: new Date(2030, 0, 1),
    });
    assert.deepEqual(slots.map((s) => s.state), ['open', 'booked', 'open', 'blocked']);
    assert.equal(slots[1].bookingId, 9);
  });

  test('charges peak price on weekends', () => {
    const slots = buildSlots({ resource, venue, date: '2030-01-05', now: new Date(2030, 0, 1) });
    assert.ok(slots.every((s) => s.price === 300 && s.peak));
  });

  test('marks slots that already started as past', () => {
    const slots = buildSlots({ resource, venue, date: '2030-01-07', now: new Date(2030, 0, 7, 11, 30) });
    assert.deepEqual(slots.map((s) => s.state), ['past', 'past', 'open', 'open']);
  });
});

describe('booking rules', () => {
  test('a slot cannot be booked twice', () => {
    const player = user('player@gamio.local');
    const { resourceId, start } = freeSlot('navrangpura-club');
    const input = { resourceId, date: in3days, start, players: 2, paymentMethod: 'venue' };

    const first = bookings.createBooking(player, input);
    assert.equal(first.status, 'confirmed');
    assert.equal(first.paymentStatus, 'unpaid');
    assert.match(first.code, /^GA-[2-9A-HJ-NP-Z]{6}$/);

    assert.throws(() => bookings.createBooking(user('diya@example.com'), input), { status: 409 });
  });

  test('wallet payment debits now and refunds on cancel', () => {
    const before = user('player@gamio.local');
    const { resourceId, start } = freeSlot('sindhu-bhavan-hall', 2);

    const booking = bookings.createBooking(before, {
      resourceId, date: in3days, start, slotCount: 2, players: 2, paymentMethod: 'wallet',
    });
    assert.equal(booking.paymentStatus, 'paid');
    assert.equal(user('player@gamio.local').wallet_balance, before.wallet_balance - booking.amount);

    const cancelled = bookings.cancelBooking(user('player@gamio.local'), booking.id);
    assert.equal(cancelled.status, 'cancelled');
    assert.equal(cancelled.paymentStatus, 'refunded');
    assert.equal(user('player@gamio.local').wallet_balance, before.wallet_balance);
  });

  test('rejects more players than the table holds', () => {
    const { resourceId, start } = freeSlot('alkapuri-lanes');
    const capacity = one('SELECT capacity FROM resources WHERE id = ?', resourceId).capacity;
    assert.throws(
      () => bookings.createBooking(user('player@gamio.local'), { resourceId, date: in3days, start, players: capacity + 1 }),
      { status: 400 },
    );
  });

  test('players cannot cancel inside the cancellation window', () => {
    const player = user('player@gamio.local');
    const { resourceId, start } = freeSlot('vesu-yard');
    const booking = bookings.createBooking(player, { resourceId, date: in3days, start });
    const [h, m] = start.split(':').map(Number);
    const [y, mo, d] = in3days.split('-').map(Number);
    const anHourBefore = new Date(y, mo - 1, d, h - 1, m);

    assert.throws(() => bookings.cancelBooking(player, booking.id, null, anHourBefore), { status: 409 });
  });

  test('desk staff only see their own venue', () => {
    const desk = user('desk@gamio.local'); // Sindhu Bhavan
    const { resourceId, start } = freeSlot('alkapuri-lanes');
    const booking = bookings.createBooking(user('player@gamio.local'), { resourceId, date: in3days, start });

    assert.throws(() => bookings.updateBooking(desk, booking.id, { status: 'checked_in' }), { status: 403 });
    const meera = user('meera@gamio.local'); // Alkapuri
    assert.equal(bookings.updateBooking(meera, booking.id, { status: 'checked_in' }).status, 'checked_in');
  });

  test('walk-ins need a name and pay at the counter', () => {
    const desk = user('desk@gamio.local');
    const { resourceId, start } = freeSlot('sindhu-bhavan-hall');
    const base = { resourceId, date: in3days, start };

    assert.throws(() => bookings.createBooking(desk, base), { status: 400 });
    assert.throws(() => bookings.createBooking(desk, { ...base, guestName: 'Ravi', paymentMethod: 'wallet' }), { status: 400 });

    const walkIn = bookings.createBooking(desk, { ...base, guestName: 'Ravi', markPaid: true });
    assert.equal(walkIn.customer.guest, true);
    assert.equal(walkIn.paymentStatus, 'paid');
  });
});

describe('http api', () => {
  let server;
  let base;

  before(async () => {
    server = createApp().listen(0);
    await new Promise((r) => server.once('listening', r));
    base = `http://127.0.0.1:${server.address().port}/api`;
  });
  after(() => server.close());

  const call = async (path, { token, ...init } = {}) => {
    const res = await fetch(base + path, {
      ...init,
      headers: { 'content-type': 'application/json', ...(token && { authorization: `Bearer ${token}` }) },
    });
    return { status: res.status, body: await res.json() };
  };
  const login = async (email) =>
    (await call('/auth/login', { method: 'POST', body: JSON.stringify({ email, password: DEMO_PASSWORD }) })).body.token;

  test('public catalog is open', async () => {
    const { status, body } = await call('/venues?activity=bowling');
    assert.equal(status, 200);
    assert.deepEqual(body.map((v) => v.slug), ['alkapuri-lanes']);
  });

  test('wrong password is rejected', async () => {
    const res = await call('/auth/login', { method: 'POST', body: JSON.stringify({ email: 'admin@gamio.local', password: 'nope' }) });
    assert.equal(res.status, 401);
  });

  test('console is closed to players and open to staff', async () => {
    assert.equal((await call('/console/overview')).status, 401);
    assert.equal((await call('/console/overview', { token: await login('player@gamio.local') })).status, 403);
    assert.equal((await call('/console/overview', { token: await login('desk@gamio.local') })).status, 200);
  });

  test('only admins manage users', async () => {
    assert.equal((await call('/console/users', { token: await login('manager@gamio.local') })).status, 403);
    const res = await call('/console/users', { token: await login('admin@gamio.local') });
    assert.equal(res.status, 200);
    assert.ok(res.body.length >= 17);
  });

  test('managers only see the venues they run', async () => {
    const res = await call('/console/venues', { token: await login('isha@gamio.local') });
    assert.deepEqual(res.body.map((v) => v.slug).sort(), ['alkapuri-lanes', 'vesu-yard']);
  });

  test('validation errors name the field', async () => {
    const res = await call('/auth/register', { method: 'POST', body: JSON.stringify({ name: 'A', email: 'bad', password: '1' }) });
    assert.equal(res.status, 400);
    assert.ok(res.body.fields.email && res.body.fields.password && res.body.fields.name);
  });
});
