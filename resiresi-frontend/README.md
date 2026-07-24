# resiresi-frontend

Reservation management UI for the ResiResi platform. Each restaurant ("tenant")
signs in and manages its own reservations: list, add, edit, cancel.

## No roles, no keys

- **Sign-in picks a restaurant.** There are no passwords and no roles — every
  signed-in tenant can do everything, scoped to the restaurant they picked. The
  choice is stored in the `resiresi_tenant` cookie.
- **The backend is an open origin.** It needs no credential of its own. Access
  control belongs to a gateway in front of it, not to this app.

## Run it

```bash
npm install
cp .env.example .env.local     # RESIRESI_API_URL defaults to production
npm run dev                    # http://localhost:3003
```

Point it at a local backend with:

```bash
RESIRESI_API_URL=http://localhost:8080 npm run dev
```

To route through an APIblaze proxy instead of the origin, set `RESIRESI_API_URL`
to the proxy URL and `RESIRESI_API_KEY` to an APIblaze key — the client sends
`x-api-key` only when that variable is set.

## Pages

| Route                 | What it does                                   |
|-----------------------|------------------------------------------------|
| `/login`              | Pick which restaurant you manage               |
| `/reservations`       | List + filter by status, add, cancel           |
| `/reservations/[id]`  | Edit a reservation                             |
