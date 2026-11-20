# Gamio Arena

Book pool tables, table tennis, badminton courts, bowling lanes, box cricket turfs and more across every Gamio hall, from one account and one wallet. Front-desk staff, venue managers and admins run the floor from a console in the same app.

Everything runs on your machine. There are no cloud services, payment gateways or email providers to configure. The database is a single SQLite file that creates and seeds itself on first start.

## Quick start

You need **Node.js 22.13 or newer** (it uses Node's built-in SQLite).

```bash
npm install
npm run dev
```

- Player site: http://localhost:5173
- API: http://localhost:4000/api

The first start creates `server/data/gamio.db` with four venues, 34 tables and courts, about 80 players and seven weeks of booking history so the dashboards have something to show.

### Demo accounts

Every account uses the password **`gamio123`**. The sign-in page lists them and fills them in for you.

| Role | Email | Can do |
| --- | --- | --- |
| Player | `player@gamio.local` | Book, pay from wallet or at the counter, cancel, see tickets and wallet history |
| Front desk | `desk@gamio.local` | Live board for Sindhu Bhavan Hall, walk-ins, check-in by code, mark cash paid, wallet top-ups |
| Manager | `manager@gamio.local` | Everything the desk can do, for the two halls they manage, plus tables, prices and blocked time |
| Admin | `admin@gamio.local` | Everything, every venue, plus people and roles, game types, inbox and activity log |

### Other commands

```bash
npm test          # API and booking-rule tests (node:test, in-memory database)
npm run seed      # wipe and reload the demo data
npm run build     # build the client into client/dist
npm start         # serve API + built client together on :4000
```

## How it works

### Booking rules

- Slots are generated from each venue's opening hours and each table's slot length, so nothing goes stale when hours change.
- A booking covers one to four back-to-back slots. Evenings after 6pm and weekends use the peak price when a table has one.
- Double-booking is impossible: the availability check and the insert happen inside one write transaction.
- **Pay at the counter**: the booking is confirmed and marked unpaid until the desk takes cash or UPI.
- **Wallet**: paid immediately. Wallets are loaded at the desk; no real money moves through the app.
- Players can cancel up to 2 hours before start (configurable). Anything paid goes back to their wallet.
- Managers can block a table for maintenance or events; it's refused if a booking already sits in that window.

### Roles

Access is checked on the server for every request, not just hidden in the UI.

- **Player**: their own bookings and wallet.
- **Staff**: the one venue they're assigned to.
- **Manager**: the venues they're set as manager of.
- **Admin**: everything.

## Project layout

```
client/                      React 19 + Vite
  src/
    api/                     fetch wrapper with auth token handling
    auth/                    session context and role guard
    components/              shared UI (icons, venue art, ticket, modal…)
      console/               booking panel, walk-in form, charts
      showcase/              home page game carousel and figurines
    layouts/                 site header/footer, console shell
    pages/
      site/                  home, explore, venue booking, sign in/up, contact
      account/               my bookings, ticket, wallet, profile
      console/               overview, front desk, bookings, wallets, venues, admin pages
    styles/                  design tokens, base, components, site, console
server/                      Express 5 + node:sqlite
  src/
    db/                      schema.sql, connection helpers, demo seed
    http/                    auth middleware, errors, rate limiting
    lib/                     time maths, slot layout, booking codes
    services/                bookings, wallet, venue scope, audit log
    routes/                  public catalog, auth, player routes
      console/               overview, front desk, venues, admin
  test/                      booking rules and API tests
```

## Configuration

Optional. Copy `server/.env.example` to `server/.env` to change the port, database path, cancellation window or booking horizon. If `JWT_SECRET` isn't set, a random one is generated into `server/data/jwt.secret` on first run.

## Design notes

The look is a games hall after dark: pool-felt green, chalk blue and scoreboard orange on warm paper, with hard ink outlines like a printed club card. Every game has a hand-drawn icon, venue covers are generated from each hall's colours and games (no stock photos), and the home page opens with a full-screen looping video (`client/public/media/gamio-hero.mp4`, from the original Gamio project) under a transparent header, followed by a rotating showcase of toy-like game figurines. On phones the menu becomes a full-screen overlay with staggered links. Fonts are bundled locally, so the app works offline. Light and dark themes follow the system setting and can be toggled.
