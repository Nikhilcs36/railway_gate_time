# 🚂 Railway Gate Tracker

Live crossing times & predicted closures — avoid the wait at the gate.

React + TypeScript single-page app that shows railway level crossings on a map (or in
a list) with their live status: which train is approaching, how far away it is, and
when the gate is expected to close and reopen.

## Features

- **Live status per gate** — approaching train, distance in km, ETA, predicted
  closure/opening times and a confidence score.
- **Colour-coded markers** — green = open, amber = closing soon, red = closed.
- **Countdown timers** — live countdown to the next closure on every gate.
- **"Near me" geolocation search** — gates around your live GPS position, with 5 / 10 /
  15 km presets or a custom radius drawn as a circle on the map. Without a GPS fix the
  list loads for the current map viewport instead.
- **Crowd-sourced reports** — report a train at a gate from the list.
- **Optional extras** — subscribe to a WebSocket (`VITE_WS_URL`) for realtime push
  events. Runs fine without a Google Maps key too: the map becomes a fallback notice
  and the list view is used.

## Getting started

Requires Node.js 20+.

```bash
git clone https://github.com/Nikhilcs36/railway_gate_time.git
cd railway_gate_time
npm install
npm run dev
```

Runs at <http://localhost:5173>.

No backend needed: in development [`msw`](https://mswjs.io/) intercepts every `/api/*`
request and serves simulated live data. Unhandled requests pass through.

### Environment

Both variables are optional — copy `.env.example` to `.env` and fill in what you need.

| Variable | Description |
| --- | --- |
| `VITE_GOOGLE_MAPS_API_KEY` | Google Maps browser API key. Without it the map becomes a fallback notice and the list view is used. |
| `VITE_WS_URL` | WebSocket URL for realtime train events, e.g. `wss://api.example.com/events`. |

> `.env` is git-ignored — never commit real keys.

## Scripts

| Command | Description |
| --- | --- |
| `npm run dev` | Start the Vite dev server with MSW mocking. |
| `npm run build` | Type-check with `tsc --noEmit` and build to `dist/`. |
| `npm run preview` | Preview the production build. |
| `npm test` | Run the Vitest suite once. |
| `npm run test:watch` | Run Vitest in watch mode. |

### API contract

The frontend talks to a backend mounted at `/api`:

| Method | Endpoint | Purpose |
| --- | --- | --- |
| `GET` | `/api/crossings` | All crossings; accepts optional `?lat=&lng=` to centre the result set. |
| `GET` | `/api/crossings/nearby?north=&south=&east=&west=` | Crossings within map bounds. |
| `GET` | `/api/crossings/:id/status` | Live status for one crossing. |
| `POST` | `/api/reports` | Submit a crowd-sourced train report. |

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
