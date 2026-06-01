# CMAS Practice Simulator

A self-hosted, TestNav-style practice tool for Colorado's CMAS English
Language Arts assessment. Independent and unofficial — not affiliated with
Pearson, TestNav, the Colorado Department of Education, or CMAS.

Two profiles ship out of the box:

- **Olive** — Grade 6 (`g6-form-a`)
- **Fox** — Grade 4 (`g4-form-a`)

The full build spec is in [`PROJECT.md`](./PROJECT.md).

## Architecture

- **Client:** React 18 + TypeScript + Vite + Tailwind, Zustand for state.
- **Server:** Node + TypeScript + Express, SQLite via `better-sqlite3` at
  `/data/cmas.db`. Serves both the API and the built client.
- **Content:** `cmas-content.json` is the source of truth. The client
  validates it against a Zod schema at load time.
- **Container:** Multi-stage Dockerfile, orchestrated by `docker-compose.yml`
  alongside a `cloudflared` sidecar for optional public access.

## Run

### Local dev

```bash
npm install
npm run dev
```

Vite serves the client at <http://localhost:5173> and proxies `/api/*` to the
server at <http://localhost:8473>.

> Dev mode writes to `./data/cmas.db` relative to the server's working
> directory (override with `DB_PATH=…`). It reads `cmas-content.json` from
> the repo root.

### Production (the home server)

```bash
cp .env.example .env
# paste TUNNEL_TOKEN if you want public access (see "Public access" below)
docker compose up -d --build
```

The app comes up on the LAN at `http://10.0.0.16:8473`. SQLite data lives in
the named volume `cmas_data` mounted at `/data` inside the container.

#### LAN-only binding

The default compose mapping `"8473:8473"` publishes on all host interfaces,
so any LAN device can reach `http://10.0.0.16:8473`. To restrict strictly to
the LAN interface, change the mapping in `docker-compose.yml` to:

```yaml
ports:
  - "10.0.0.16:8473:8473"
```

If a host firewall is in use (ufw / firewalld), allow the LAN to that port
and deny others. With ufw:

```bash
sudo ufw allow from 10.0.0.0/24 to any port 8473 proto tcp
sudo ufw deny 8473/tcp
```

#### Public access via Cloudflare Tunnel

`cloudflared` is included as a sidecar service. Set `TUNNEL_TOKEN` in `.env`
(it's the per-tunnel JWT, not a Cloudflare API token) and the sidecar will
make the same app available at <https://cmas.jsb-emr.us>, gated by a
Cloudflare Access policy that allow-lists a single email via OTP.

To omit public exposure, comment out the `cloudflared` service block — the
LAN service is unaffected.

To rotate the tunnel token: Cloudflare dash → Zero Trust → Networks →
Tunnels → `cmas` → "Configure" → re-issue token; replace the value in
`.env`; `docker compose up -d cloudflared`.

#### Updating content

The image bundles a copy of `cmas-content.json` at
`/app/content/cmas-content.json`. To swap it without rebuilding, uncomment
the volume mount in `docker-compose.yml`:

```yaml
- ./cmas-content.json:/app/content/cmas-content.json:ro
```

Then edit the file on the host and restart the container. The schema is
checked by the client; mismatches surface as an error on the Home screen.

#### Backups

Everything the kids do lives in the `cmas_data` volume.

```bash
# online backup of the SQLite store
docker compose exec cmas sh -c 'sqlite3 /data/cmas.db ".backup /data/cmas.db.bak"'
docker cp cmas:/data/cmas.db.bak ./cmas-backup-$(date +%F).db
```

To restore: stop the stack, replace `cmas.db` in the volume, start it back
up.

## API

All under the same origin. Profiles are `olive` or `fox`.

| Method | Path | Purpose |
|---|---|---|
| GET | `/api/health` | Health check (powers the container healthcheck). |
| GET | `/api/content` | Parsed `cmas-content.json`. |
| GET | `/api/profiles` | Profile list with form mappings. |
| GET | `/api/state/:profile` | In-progress session state for the child. |
| PUT | `/api/state/:profile` | Save/replace in-progress state. |
| DELETE | `/api/state/:profile` | Clear in-progress state. |
| GET | `/api/results/:profile` | Completed results for this child. |
| POST | `/api/results/:profile` | Append a completed result. |
| GET | `/api/results` | All children's results (parent review). |
| PATCH | `/api/results/:profile/:id/parent-score` | Add/update a parent rubric score. |

The server validates the `:profile` segment against the known set; anything
else returns 404.

## What this app deliberately does **not** do

- No real accounts, passwords, or PII inside the app — profile selection is
  the only in-app identity. Public-side auth is enforced at the Cloudflare
  Access edge.
- No router port-forwarding. The public path is the outbound
  Cloudflare Tunnel, not an inbound NAT rule.
- No automated grading of short or prose responses — the parent scores
  those from the rubric on the Results screen.
- No Pearson / TestNav / CMAS branding, logos, or official test content.

## License / use

Personal-use practice tool, intended for the two children named above and
the parent who runs the server. The content in `cmas-content.json` is
original practice material written for this app and is safe to keep in
version control.
