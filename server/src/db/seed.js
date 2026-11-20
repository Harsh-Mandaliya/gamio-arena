// Demo data: four venues, twelve game types, a handful of staff and players,
// and about three weeks of booking history so the dashboards have something to show.
//
//   npm run seed          wipe and reseed
//   (first server start seeds automatically when the database is empty)

import bcrypt from 'bcryptjs';
import { fileURLToPath } from 'node:url';
import { db, run, transaction } from './index.js';
import { bookingCode } from '../lib/codes.js';
import { buildSlots } from '../lib/slots.js';
import { addDays, isoDate, isWeekend, minutesNow, toMinutes } from '../lib/time.js';

export const DEMO_PASSWORD = 'gamio123';

const ACTIVITIES = [
  ['Pool', 'pool', '#1f7a5a', 'Eight-ball and nine-ball on 8ft tables with fresh cloth.'],
  ['Snooker', 'snooker', '#b23a2e', 'Full-size tables for long frames and slow breaks.'],
  ['Table Tennis', 'table-tennis', '#e2572b', 'Competition tables, bats and balls on the house.'],
  ['Badminton', 'badminton', '#2f6fde', 'Wooden-floor courts with proper lighting. Shuttles extra.'],
  ['Foosball', 'foosball', '#7a4bd1', 'Four-a-side tables with fast rods. Spinning is allowed.'],
  ['Air Hockey', 'air-hockey', '#11a3b5', 'Ten-minute rallies that turn into an hour.'],
  ['Carrom', 'carrom', '#c98a2b', 'Tournament boards, fresh powder, quiet corner.'],
  ['Chess', 'chess', '#3d3d3d', 'Boards and clocks for blitz or a long classical game.'],
  ['Bowling', 'bowling', '#d6336c', 'Ten-pin lanes with auto scoring and bumpers on request.'],
  ['Darts', 'darts', '#8a9a1b', 'Steel-tip boards, chalk scoring and a good oche.'],
  ['Box Cricket', 'box-cricket', '#2e8b3d', 'Netted turf under floodlights, for six to twelve players.'],
  ['Console Gaming', 'console', '#5146e0', 'PS5 bays with big screens, four controllers each.'],
];

const STAFF = [
  ['Ananya Rao', 'admin@gamio.local', 'admin', null, '98250 10001'],
  ['Kabir Mehta', 'manager@gamio.local', 'manager', null, '98250 10002'],
  ['Isha Desai', 'isha@gamio.local', 'manager', null, '98250 10003'],
  ['Rohan Patel', 'desk@gamio.local', 'staff', 'sindhu-bhavan-hall', '98250 10004'],
  ['Meera Joshi', 'meera@gamio.local', 'staff', 'alkapuri-lanes', '98250 10005'],
];

const PLAYERS = [
  ['Aarav Shah', 'player@gamio.local'],
  ['Diya Kapoor', 'diya@example.com'],
  ['Vihaan Trivedi', 'vihaan@example.com'],
  ['Sara Qureshi', 'sara@example.com'],
  ['Nikhil Bhatt', 'nikhil@example.com'],
  ['Tanvi Iyer', 'tanvi@example.com'],
  ['Arjun Nair', 'arjun@example.com'],
  ['Zoya Khan', 'zoya@example.com'],
  ['Dev Parmar', 'dev@example.com'],
  ['Kavya Menon', 'kavya@example.com'],
  ['Yash Solanki', 'yash@example.com'],
  ['Pooja Rana', 'pooja@example.com'],
];

// Regulars beyond the named ones, so bookings spread across a realistic crowd.
const FIRST = ['Riya', 'Kunal', 'Meher', 'Ishan', 'Anika', 'Rehan', 'Nisha', 'Parth', 'Aditi', 'Kabir', 'Mira', 'Harsh', 'Sana', 'Rohit', 'Jiya', 'Om', 'Tara', 'Neel', 'Avni', 'Farhan'];
const LAST = ['Patel', 'Mehta', 'Joshi', 'Desai', 'Shah', 'Pandya', 'Vyas', 'Chauhan', 'Dave', 'Thakkar', 'Modi', 'Rathod'];
for (let i = 0; PLAYERS.length < 80; i++) {
  const first = FIRST[i % FIRST.length];
  const last = LAST[(i * 7) % LAST.length];
  const email = `${first}.${last}${i >= FIRST.length ? i : ''}@example.com`.toLowerCase();
  PLAYERS.push([`${first} ${last}`, email]);
}

// [name, slug, city, tagline, address, accent, opens, closes, manager email, resources]
// resources: [activity, name, capacity, slotMinutes, price, peakPrice]
const VENUES = [
  [
    'Sindhu Bhavan Hall', 'sindhu-bhavan-hall', 'Ahmedabad',
    'Cue sports and console bays above the café strip',
    '2nd floor, Sindhu Bhavan Road, Bodakdev', '#12684f', '10:00', '23:00', 'manager@gamio.local',
    [
      ['pool', 'Pool Table 1', 4, 60, 240, 300],
      ['pool', 'Pool Table 2', 4, 60, 240, 300],
      ['pool', 'Pool Table 3', 4, 60, 240, 300],
      ['snooker', 'Snooker Table', 2, 60, 320, 400],
      ['table-tennis', 'TT Table 1', 4, 60, 180, 220],
      ['table-tennis', 'TT Table 2', 4, 60, 180, 220],
      ['foosball', 'Foosball Table', 4, 30, 90, null],
      ['air-hockey', 'Air Hockey Table', 2, 30, 80, null],
      ['console', 'PS5 Bay A', 4, 60, 200, 260],
      ['console', 'PS5 Bay B', 4, 60, 200, 260],
    ],
  ],
  [
    'Navrangpura Club', 'navrangpura-club', 'Ahmedabad',
    'Courts at dawn, tables till late, and a quiet chess corner',
    'Near Swastik Cross Roads, Navrangpura', '#2f6fde', '07:00', '22:00', 'manager@gamio.local',
    [
      ['badminton', 'Court A', 4, 60, 400, 500],
      ['badminton', 'Court B', 4, 60, 400, 500],
      ['table-tennis', 'TT Table 1', 4, 60, 160, 200],
      ['table-tennis', 'TT Table 2', 4, 60, 160, 200],
      ['table-tennis', 'TT Table 3', 4, 60, 160, 200],
      ['carrom', 'Carrom Board 1', 4, 60, 100, null],
      ['carrom', 'Carrom Board 2', 4, 60, 100, null],
      ['chess', 'Chess Corner', 2, 60, 60, null],
    ],
  ],
  [
    'Alkapuri Lanes', 'alkapuri-lanes', 'Vadodara',
    'Bowling nights, steel-tip darts and a couple of pool tables',
    'R.C. Dutt Road, Alkapuri', '#d6336c', '11:00', '23:00', 'isha@gamio.local',
    [
      ['bowling', 'Lane 1', 6, 60, 450, 550],
      ['bowling', 'Lane 2', 6, 60, 450, 550],
      ['bowling', 'Lane 3', 6, 60, 450, 550],
      ['bowling', 'Lane 4', 6, 60, 450, 550],
      ['darts', 'Oche 1', 4, 30, 120, 150],
      ['darts', 'Oche 2', 4, 30, 120, 150],
      ['pool', 'Pool Table 1', 4, 60, 220, 280],
      ['pool', 'Pool Table 2', 4, 60, 220, 280],
      ['air-hockey', 'Air Hockey Table', 2, 30, 80, null],
    ],
  ],
  [
    'Vesu Yard', 'vesu-yard', 'Surat',
    'Floodlit box cricket and an indoor games hall',
    'VIP Road, Vesu', '#e2572b', '06:00', '23:00', 'isha@gamio.local',
    [
      ['box-cricket', 'Turf 1', 12, 60, 1200, 1500],
      ['box-cricket', 'Turf 2', 12, 60, 1200, 1500],
      ['badminton', 'Court A', 4, 60, 350, 450],
      ['foosball', 'Foosball Table 1', 4, 30, 90, null],
      ['foosball', 'Foosball Table 2', 4, 30, 90, null],
      ['console', 'PS5 Bay', 4, 60, 180, 240],
      ['carrom', 'Carrom Board', 4, 60, 90, null],
    ],
  ],
];

const DESCRIPTIONS = {
  'sindhu-bhavan-hall':
    'Three pool tables, a full-size snooker table and two PS5 bays under one warm, low-lit roof. Busy after 7pm and on weekends, so book ahead if you are coming with a group.',
  'navrangpura-club':
    'Our oldest hall. Two wooden badminton courts open from 7am, three table tennis tables, carrom boards and a chess corner where regulars play long games over chai.',
  'alkapuri-lanes':
    'Four ten-pin lanes with automatic scoring, two steel-tip dartboards and a pair of pool tables. Shoe hire is included with every lane booking.',
  'vesu-yard':
    'Two netted box-cricket turfs under floodlights, plus an indoor hall with a badminton court, foosball, carrom and a PS5 bay for the ones waiting to bat.',
};

/** Small seeded PRNG so every reseed produces the same story. */
function random(seed) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function wipe() {
  db.exec(`
    PRAGMA foreign_keys = OFF;
    DELETE FROM audit_log; DELETE FROM enquiries; DELETE FROM wallet_transactions;
    DELETE FROM blocks; DELETE FROM bookings; DELETE FROM resources;
    DELETE FROM activities; DELETE FROM venues; DELETE FROM users;
    PRAGMA foreign_keys = ON;
  `);
}

export async function seed({ reset = false, now = new Date() } = {}) {
  const hash = await bcrypt.hash(DEMO_PASSWORD, 10);
  const rand = random(20251128);
  const pick = (list) => list[Math.floor(rand() * list.length)];

  transaction(() => {
    if (reset) wipe();

    const activityId = {};
    ACTIVITIES.forEach(([name, slug, color, blurb], i) => {
      activityId[slug] = Number(
        run('INSERT INTO activities (name, slug, icon, color, blurb, sort_order) VALUES (?, ?, ?, ?, ?, ?)',
          name, slug, slug, color, blurb, i * 10).lastInsertRowid,
      );
    });

    const userId = {};
    for (const [name, email, role, , phone] of STAFF) {
      userId[email] = Number(
        run('INSERT INTO users (name, email, phone, role, password_hash) VALUES (?, ?, ?, ?, ?)',
          name, email, phone, role, hash).lastInsertRowid,
      );
    }
    const players = PLAYERS.map(([name, email], i) => {
      const id = Number(
        run("INSERT INTO users (name, email, phone, role, password_hash) VALUES (?, ?, ?, 'player', ?)",
          name, email, `98980 ${String(20001 + i)}`, hash).lastInsertRowid,
      );
      return { id, balance: 0 };
    });

    const resources = [];
    const venueId = {};
    for (const [name, slug, city, tagline, address, accent, opens, closes, manager, list] of VENUES) {
      const vid = Number(
        run(`INSERT INTO venues (name, slug, tagline, description, address, city, phone, opens_at, closes_at, accent, manager_id)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          name, slug, tagline, DESCRIPTIONS[slug], address, city, `079 4000 ${1000 + Object.keys(venueId).length}`,
          opens, closes, accent, userId[manager]).lastInsertRowid,
      );
      venueId[slug] = vid;
      for (const [activity, rname, capacity, slotMinutes, price, peak] of list) {
        const rid = Number(
          run(`INSERT INTO resources (venue_id, activity_id, name, capacity, slot_minutes, price_per_slot, peak_price)
               VALUES (?, ?, ?, ?, ?, ?, ?)`,
            vid, activityId[activity], rname, capacity, slotMinutes, price, peak).lastInsertRowid,
        );
        resources.push({ id: rid, venue_id: vid, capacity, slot_minutes: slotMinutes, price_per_slot: price, peak_price: peak, opens_at: opens, closes_at: closes });
      }
    }

    for (const [, email, , venueSlug] of STAFF) {
      if (venueSlug) run('UPDATE users SET venue_id = ? WHERE email = ?', venueId[venueSlug], email);
    }

    // Everyone starts with a counter top-up so wallet payments have something to draw on.
    const startDate = addDays(isoDate(now), -46);
    for (const p of players) {
      const amount = 1000 + Math.floor(rand() * 5) * 500;
      p.balance = amount;
      run(`INSERT INTO wallet_transactions (user_id, amount, kind, balance_after, note, created_by, created_at)
           VALUES (?, ?, 'topup', ?, 'Counter top-up', ?, ?)`,
        p.id, amount, amount, userId['desk@gamio.local'], `${startDate} 12:00:00`);
    }

    const today = isoDate(now);
    const nowMin = minutesNow(now);
    const usedCodes = new Set();
    const newCode = () => {
      let c;
      do c = bookingCode();
      while (usedCodes.has(c));
      usedCodes.add(c);
      return c;
    };

    // A maintenance window tomorrow so the block feature shows up on the board.
    const cloth = resources.find((r) => r.venue_id === venueId['sindhu-bhavan-hall']);
    const clothDay = addDays(today, 1);
    const inClothWindow = (r, date, from, to) =>
      r === cloth && date === clothDay && from < toMinutes('13:00') && toMinutes('11:00') < to;

    const regulars = players.slice(1);
    const busy = new Map();
    const busyKey = (p, date) => `${p.id}|${date}`;
    const isFree = (p, date, from, to) => !(busy.get(busyKey(p, date)) ?? []).some(([a, b]) => from < b && a < to);
    const markBusy = (p, date, from, to) => {
      const key = busyKey(p, date);
      busy.set(key, [...(busy.get(key) ?? []), [from, to]]);
    };

    for (let offset = -45; offset <= 6; offset++) {
      const date = addDays(today, offset);
      const weekend = isWeekend(date);

      for (const r of resources) {
        const slots = buildSlots({ resource: r, venue: r, date, now: new Date(0) });
        for (let i = 0; i < slots.length; i++) {
          const s = slots[i];
          const start = toMinutes(s.start);
          let chance = start >= 18 * 60 ? 0.48 : start >= 15 * 60 ? 0.3 : 0.16;
          if (weekend) chance += 0.15;
          if (offset > 0) chance *= Math.max(0.25, 0.75 - offset * 0.1); // the future is emptier
          if (rand() > chance) continue;

          const length = rand() < 0.22 && i + 1 < slots.length ? 2 : 1;
          const chosen = slots.slice(i, i + length);
          i += length - 1;

          const end = chosen.at(-1).end;
          if (inClothWindow(r, date, start, toMinutes(end))) continue;
          const amount = chosen.reduce((sum, x) => sum + x.price, 0);
          const isPast = date < today || (date === today && toMinutes(end) <= nowMin);
          const isLive = date === today && start <= nowMin && nowMin < toMinutes(end);

          // Nobody plays in two places at once. The demo player gets a small share
          // so their pages look lived-in without being absurd.
          const endMin = toMinutes(end);
          const candidates = rand() < 0.15 ? [] : rand() < 0.012 ? [players[0]] : [pick(regulars), pick(regulars), pick(regulars)];
          const player = candidates.find((p) => isFree(p, date, start, endMin)) ?? null;
          if (player) markBusy(player, date, start, endMin);
          const guest = !player;

          let status = 'confirmed';
          const roll = rand();
          if (isPast) status = roll < 0.86 ? 'completed' : roll < 0.9 ? 'no_show' : 'cancelled';
          else if (isLive) status = 'checked_in';
          else if (roll < 0.07) status = 'cancelled';

          const useWallet = player && player.balance >= amount && rand() < 0.4;
          const method = useWallet ? 'wallet' : 'venue';
          let payment = 'unpaid';
          if (useWallet) payment = status === 'cancelled' ? 'refunded' : 'paid';
          else if (status === 'completed' || status === 'checked_in') payment = 'paid';

          const createdAt = `${addDays(date, -1 - Math.floor(rand() * 3))} ${String(9 + Math.floor(rand() * 12)).padStart(2, '0')}:${String(Math.floor(rand() * 60)).padStart(2, '0')}:00`;
          const guestName = guest ? pick(['Walk-in', 'Rahul (walk-in)', 'Office group', 'Neha + 3', 'Birthday group']) : null;

          const bookingId = Number(
            run(`INSERT INTO bookings (code, user_id, guest_name, guest_phone, resource_id, date, start_time, end_time, players,
                                       amount, payment_method, payment_status, status, cancel_reason, created_by, created_at, updated_at)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
              newCode(), player?.id ?? null, guestName, guest ? '90000 00000' : null, r.id, date, s.start, end,
              1 + Math.floor(rand() * r.capacity), amount, method, payment, status,
              status === 'cancelled' ? 'Plans changed' : null,
              player?.id ?? userId['desk@gamio.local'], createdAt, createdAt).lastInsertRowid,
          );

          if (useWallet) {
            player.balance -= amount;
            run(`INSERT INTO wallet_transactions (user_id, amount, kind, booking_id, balance_after, note, created_by, created_at)
                 VALUES (?, ?, 'booking', ?, ?, ?, ?, ?)`,
              player.id, -amount, bookingId, player.balance, `Booking on ${date}`, player.id, createdAt);
            if (status === 'cancelled') {
              player.balance += amount;
              run(`INSERT INTO wallet_transactions (user_id, amount, kind, booking_id, balance_after, note, created_by, created_at)
                   VALUES (?, ?, 'refund', ?, ?, 'Refund on cancellation', ?, ?)`,
                player.id, amount, bookingId, player.balance, player.id, createdAt);
            }
          }
        }
      }
    }

    // A recent top-up so nobody is sitting at zero when you sign in.
    for (const p of players) {
      if (p.balance < 1000) {
        const amount = 1500 - p.balance - (p.balance % 50);
        p.balance += amount;
        run(`INSERT INTO wallet_transactions (user_id, amount, kind, balance_after, note, created_by, created_at)
             VALUES (?, ?, 'topup', ?, 'Counter top-up', ?, ?)`,
          p.id, amount, p.balance, userId['desk@gamio.local'], `${addDays(today, -1)} 18:30:00`);
      }
      run('UPDATE users SET wallet_balance = ? WHERE id = ?', p.balance, p.id);
    }

    run(`INSERT INTO blocks (resource_id, date, start_time, end_time, reason, created_by) VALUES (?, ?, '11:00', '13:00', 'Cloth change', ?)`,
      cloth.id, clothDay, userId['manager@gamio.local']);

    const enquiries = [
      ['Priya Sharma', 'priya@example.com', 'events', 'We are planning an office offsite for about 25 people next month. Can we take over the pool and TT tables at Sindhu Bhavan for an evening?', 'new'],
      ['Harshil Vora', 'harshil@example.com', 'booking', 'I booked Court B but my friend could not make it. Can I move the booking to Saturday morning instead?', 'new'],
      ['Snehal Gupta', 'snehal@example.com', 'partnership', 'I coach a junior table tennis group and would like a regular weekday slot for 8 kids. Do you offer monthly rates?', 'in_progress'],
      ['Om Pandya', 'om@example.com', 'general', 'Do you allow outside food at Vesu Yard? We have a birthday on the turf next week.', 'closed'],
    ];
    for (const [name, email, topic, message, status] of enquiries) {
      run('INSERT INTO enquiries (name, email, topic, message, status, created_at) VALUES (?, ?, ?, ?, ?, ?)',
        name, email, topic, message, status, `${addDays(today, -Math.floor(rand() * 5))} 1${Math.floor(rand() * 9)}:20:00`);
    }
  });
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  await seed({ reset: process.argv.includes('--reset') });
  const count = db.prepare('SELECT COUNT(*) AS n FROM bookings').get().n;
  console.log(`Seeded. ${count} bookings. Every demo account uses the password "${DEMO_PASSWORD}".`);
}
