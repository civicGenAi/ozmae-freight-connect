# CLAUDE.md

Guidance for Claude (and any new session/account) working in this repository.
Read this first so you don't start from scratch.

## What this is

**Ozmae Freight Connect** — a web app for a freight / logistics company
(East Africa corridor). It manages the full commercial pipeline:

`Leads → Quotations/Proformas → Job Orders → Tracking → Invoices → Payments`,
plus a CRM layer (customers, interactions, tasks, customer health, lost deals),
fleet (vehicles/drivers), rate cards, documents, reporting, and user/role admin.

It is a single-page app talking directly to **Supabase** (Postgres + Auth +
Storage + Edge Functions). There is no separate backend server.

## Tech stack

- **Build/dev:** Vite + React 18 + TypeScript
- **UI:** shadcn/ui (Radix primitives) in `src/components/ui`, Tailwind CSS,
  `lucide-react` icons, `framer-motion` for animation
- **Data:** `@supabase/supabase-js` + `@tanstack/react-query` (all server state)
- **Forms:** `react-hook-form` + `zod`
- **Charts:** `recharts`
- **PDF:** `@react-pdf/renderer` (quotation/invoice/delivery/pickup docs)
- **Toasts:** `sonner` (primary) — `toast.success/error/info` from `"sonner"`
- **Routing:** `react-router-dom` v6
- Package manager: npm (a `bun.lock` also exists; npm is fine).

## Commands

```bash
npm install            # node_modules is NOT committed; install first
npm run dev            # Vite dev server
npm run build          # production build (tsc + vite build)
npm run lint           # eslint
npm test               # vitest run
```

Build needs `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` (see
`src/lib/supabase.ts`). Missing env only warns; the build still completes but
the app can't talk to the DB at runtime.

## Architecture / where things live

- `src/App.tsx` — all routes. Every authenticated page is wrapped in
  `<AuthGuard><AppLayout>…</AppLayout></AuthGuard>`. Public: `/login`,
  `/reset-password`, `/track`, `/track/:code`.
- `src/components/AppLayout.tsx` — shell: sidebar nav, header, the
  **password-update banner**, and the redirect-to-reset enforcement.
- `src/components/AuthGuard.tsx` — gates authenticated routes; shows
  `LogisticsLoader` while auth resolves.
- `src/hooks/useAuth.ts` — **central auth/roles hook.** Loads the profile +
  `user_roles`, exposes `isAdmin/isSales/isOperations/isFinance/isLeads`,
  `hasRole()`, and the password-age flags (`mustChangePassword`,
  `shouldShowPasswordReminder`, `passwordAgeDays`, `isUsingDefaultPassword`).
- `src/hooks/useCrm.ts` — react-query hooks for CRM (interactions, tasks,
  customer health, decline reasons, customer timeline, custom locations).
- `src/lib/supabase.ts` — the single Supabase client.
- `src/lib/quotationUtils.ts`, `src/lib/utils.ts` — helpers (`cn`, etc.).
- `src/types/index.ts` — shared TS types. Note many DB rows are typed loosely
  with `[key: string]: any`, so the compiler won't catch field-name typos.
- `src/pages/**` — one file per screen. The big ones:
  `Dashboard.tsx`, `JobOrders.tsx` (~1.7k lines), `Quotations.tsx` (~1.3k),
  `Leads.tsx`, `Invoices.tsx`, `Payments.tsx`, plus `src/pages/crm/*`.
- `src/components/*PDF.tsx` — react-pdf document templates.
- `supabase/` — `schema.sql` (canonical schema), `migrations/*` (incremental,
  timestamp-prefixed), `functions/` (edge functions, e.g. `manage-user`).

## Data model (high level)

Core tables (`supabase/schema.sql` + migrations): `profiles`, `user_roles`,
`customers`, `leads`, `quotations` (+ `quotation_items`), `vehicles`,
`drivers`, `job_orders` (+ `job_status_timeline`), `invoices`, `payments`,
`documents`, `notifications`, `security_logs`, `rate_card`, `company_profile`,
and CRM tables (`customer_interactions`, `crm_tasks`, `customer_health`,
`decline_reasons`, `custom_locations`).

Pipeline links: `leads.customer_id → customers`; `quotations.lead_id`,
`quotations.customer_id`; `job_orders.quotation_id`, `job_orders.customer_id`;
`invoices.job_order_id`; `payments.invoice_id`.

Job status enum (see `schema.sql` + extra stages used in `JobOrders.tsx`):
`planning, awaiting_deposit, deposit_confirmed, dispatched, picked_up,
in_transit, at_destination, delivered, closed, cancelled` (the page also
references `approved/on_hold/in_progress/completed`).

DB notes:
- Numbers auto-generate via Postgres sequences + triggers
  (`lead/quote/job/invoice/payment_number_seq`).
- A trigger logs job status changes into `job_status_timeline`.
- **RLS is enabled on every table.** Read policies are mostly
  "authenticated can read"; some writes are role-restricted. If a query
  returns nothing unexpectedly, suspect RLS before the frontend.
- `job_orders.total_amount` and `profiles.password_updated_at /
  is_using_default_password` come from migrations, not the base `schema.sql`.

## Conventions

- **Brand colors:** accent orange `#F26B2A` (Tailwind `accent`, HSL
  `24 78% 57%`), dark navy `#0f1d35`. Heavy use of `uppercase`,
  `font-black`, `tracking-widest`, rounded-2xl/3xl cards.
- Server state goes through react-query; mutate then
  `queryClient.invalidateQueries({ queryKey: [...] })`. Keep query keys
  consistent (e.g. `["job_orders"]`, `["quotations"]`, `["dashboard_stats"]`).
- Always show user feedback via `sonner` toasts; **a success toast must live in
  `onSuccess`, and every mutation should have an `onError`** (see Known issues).
- Prefer the existing shadcn components. For searchable pickers use
  `CreatableCombobox` / `HybridSelect` rather than the plain `Select`.

## Known issues / roadmap (as of this writing)

These are open items the owner asked for. Treat as a phased backlog and **do
not break existing flows** — change one area at a time.

1. **Loader** — wants a lighter, cleaner `LogisticsLoader`. (Done: simplified.)
2. **Password policy logic** — `useAuth.ts` forced a password change after only
   7 days and nagged "expires soon" from day 1. Fixed to sane thresholds
   (`PASSWORD_EXPIRY_DAYS` / `PASSWORD_REMINDER_DAYS`); banner copy in
   `AppLayout.tsx` now shows days remaining.
3. **Dashboard** — DONE. The old `*DashboardMockup` hardcoded panels were
   replaced with one central, all-real summary (`["dashboard_overview"]` query
   derives KPIs, 14-day revenue/jobs trend, pipeline funnel, job/quote status
   distributions, fleet utilization, top routes, recent jobs, snapshot).
   Everything is query-backed and degrades to empty states.
4. **Job Orders cards/status** — DONE. Status-change mutation now detects a
   silent 0-row no-op (the real cause: **`job_orders` had RLS enabled with only
   a SELECT policy**, so UPDATEs were blocked but returned no error → fake
   success toast). Added `onError`, refresh of the open drawer, and a migration
   (`20260614120000_job_orders_write_policies.sql`) granting authenticated
   write. Pipeline stat cards now count across ALL jobs via the
   `["job_stage_counts"]` query, not just the current page.
   **The migration must be applied in Supabase for status changes to persist.**
5. **Quotations / "business entry"** — DONE. The "business entry" the owner
   meant is the **Business Entity picker in Job Order creation**
   (`JobOrders.tsx`), now a searchable `HybridSelect`. The "two quotes, only one
   shows" bug was the auto-pull that always used `accepted || latest`; there's
   now a **Source Quotation** chooser listing every quote for the selected
   business so any of them can be picked. (The Quotations *list* itself was fine
   — it keys by `quote.id`.)
6. **Admin vault** — DONE (for Job Costing). `VaultGuard.tsx` reuses
   `PinGate.tsx` + `company_profile.resource_pin_hash`/`resource_pin_enabled`
   to gate the `/job-costing` route behind the 4-digit company PIN (even for
   admins); unlocked for the browser session via sessionStorage. The PIN is
   set up in My Account. To gate more areas, wrap their route in `<VaultGuard>`.
7. **Job costing & central job file (new module)**.
   - Phase 1 DONE: top-level **Job Costing** page (`src/pages/JobCosting.tsx`,
     route `/job-costing`, Finance nav). Per-job cost line items
     (`job_costs` table) → true cost, profit/loss & margin; revenue from linked
     quotation or `job_orders.total_amount`.
   - Phase 2 DONE: **extra billable charges** (`job_charges` table, revenue
     side) and **payables tracking** (`job_costs.payment_status`/`paid_on`,
     paid/owed toggle + "Payables Owed" summary). Migrations
     `20260614130000_job_costs.sql` + `20260614140000_job_costing_phase2.sql`.
   - Documents: enhanced the existing **Document Vault** (`Documents.tsx`) with
     search, document-type filter, and in-page upload (files stored in the
     `logistic-files` bucket, rows in `documents`; migration
     `20260614150000_documents_policies.sql`). The job number is the serial.
   - **All the above migrations must be applied in Supabase.**

## Recent changes (latest iteration)

- **Quote totals:** `getQuoteTotal(quote)` in `quotationUtils.ts` is the source of
  truth — falls back to summing `metadata.tableRows[].amount` (item rows) when
  `total_amount_usd` is stored as 0 (common). Used in Quotations list, Job Order
  entity hints / source-quote chooser / autofill / creation. Prefer it over
  reading `total_amount_usd` directly.
- **Caching:** global react-query defaults set in `App.tsx`
  (`staleTime` 60s, `gcTime` 30m, `refetchOnWindowFocus: false`).
- **Nav order** (`AppLayout.tsx`): Overview → Sales → Operations → Finance →
  Documents → CRM → **INSIGHTS** (Reports, System Status) → Settings.
- **Reports** (`Reports.tsx`) rebuilt: real revenue (payments) vs real cost
  (`job_costs`) vs real profit per period; top customers/routes, win rate,
  Excel export. No more fake 20% margin.
- **System Status** (`StatusPage.tsx`, route `/status`): live DB/Auth/Storage/
  network health checks with latency, auto-refresh.
- **CRM crash fixed:** `useCustomerHealth(id)` now returns the same shape as the
  list (`{ ...metrics, customer }`) so `CustomerProfile` (`health.customer`)
  doesn't crash.
- **HybridSelect:** each item now has a unique `value` (label collisions made
  duplicate-named options select together); supports an optional `hint`.
- **My Account:** visual-only modern refresh (hero header, tab bar, profile card).
  Now 6 tabs incl. **Notifications** (`NotificationsPanel.tsx` — filters by
  status/type, date grouping, mark read/delete; uses the `read` column) and
  **Status** (`SystemStatusPanel.tsx`, shared with `/status`).
- **Quotations pagination:** client-side, 20/page over the filtered list
  (`PAGE_SIZE`), so search still spans everything; grouped view per page.
- **Skeletons:** CRM pages (Interactions, Tasks, Health, Lost Deals) now show
  skeletons instead of plain "Loading…" text.
- **Job Costing combine:** tick multiple jobs → "Combine" opens a joint
  profit/loss view (per-job breakdown + combined totals + verdict),
  non-destructive. Works for one client or across clients. Optionally **save a
  combination** (named) → `job_groups` table (migration
  `20260614170000_job_groups.sql`); saved combos show as chips above the table
  and reopen the combined view. Additive only — never alters individual jobs.
- **Sidebar:** System Status removed (lives in My Account → Status tab).
- **My Account:** compact header that changes per active tab; navy replaced with
  brand accent everywhere. Security audit log is a light card capped at 10 with
  a "View all" link to the full **Security Audit Log** page
  (`SecurityLogs.tsx`, `/settings/security-logs`). Sessions tab is full-width.

- **Merge duplicate customers:** `MergeDuplicatesDialog.tsx` + "Merge Duplicates"
  button on `crm/Customers.tsx`. Calls the `merge_customers(p_primary, p_dupes)`
  RPC (migration `20260614160000_merge_customers.sql`, SECURITY DEFINER) which
  reassigns all child records then deletes the dupes. **Run the migration in
  Supabase.**

- **Self-learning categories:** Job Costing cost/charge category pickers use
  `CreatableCombobox`; options = defaults ∪ distinct categories already used
  (`["job_cost_categories"]`/`["job_charge_categories"]` queries), so a typed
  category is available next time. Pattern to reuse for other free-text pickers.
- **Theme switching:** `next-themes` `ThemeProvider` in `App.tsx`
  (`attribute="class"`, light/dark/system); dark CSS vars in `index.css`. Header
  avatar dropdown (`AppLayout.tsx`) is a round menu with My Account + theme
  switcher + Log out (no more name/email).
- **Dark mode pass (DONE):** swept the app shell + most pages, converting
  hardcoded light-mode colors to theme tokens so Light/Dark/System actually
  look right everywhere, not just in the editor preview:
  - `AppLayout.tsx`: sidebar (desktop + mobile + collapsed tooltip) and header
    moved from `bg-primary`/`bg-white`/`bg-[#F8F9FA]`/`bg-[#0f1d35]` to
    `bg-sidebar`/`text-sidebar-foreground` (NOT `bg-primary` — that token
    intentionally flips light in dark mode, which broke the sidebar) and
    `bg-card`/`bg-background`.
  - `PinGate.tsx`, `VaultGuard.tsx`: header/icon blocks use `bg-sidebar` (always
    dark, keeps hardcoded white icons readable); inputs/labels/borders →
    `bg-card`/`text-foreground`/`text-muted-foreground`/`border-border`.
  - Converted `bg-white`→`bg-card`, `bg-slate-50/100`→`bg-muted`/`bg-muted/30`,
    `text-slate-*`→`text-foreground`/`text-muted-foreground`,
    `border-slate-*`/`border-white`→`border-border`, and admin/segmented-control
    "active" pills (`bg-slate-900 text-white`)→`bg-primary text-primary-foreground`
    across `MyAccount.tsx`, `CompanyResources.tsx`, `NotificationsPanel.tsx`,
    `SystemStatusPanel.tsx`, `FileUpload.tsx`, `Dashboard.tsx`,
    `JobOrders.tsx`, `Documents.tsx`, `Reports.tsx`, `JobCosting.tsx`,
    `Quotations.tsx`, `Leads.tsx`, `QuotationTemplateEditor.tsx` (editor chrome
    only), `LogisticsLoader.tsx`, `CargoItemsTable.tsx`, `StringArrayInput.tsx`,
    `TransportModeSelector.tsx`, and the CRM pages (`CustomerProfile.tsx`,
    `CustomerHealth.tsx`, `InteractionsLog.tsx`, `Tasks.tsx`, `LostDeals.tsx`,
    `Customers.tsx`).
  - **Left intentionally unchanged** (still hardcoded, by design):
    - Always-dark brand blocks (`bg-[#0f1d35]`/`bg-sidebar` heroes, Dashboard's
      "Business Snapshot" card, Login/Verify2FA dark panels) — these stay dark
      navy with `text-white` in both themes.
    - "Document/paper preview" UI: Invoice view dialog, Delivery Note preview
      pane + PDF viewer, Quotation Template's print canvas (`#quotation-print-area`),
      QR codes — these render printable documents and must stay white.
    - Semantic status badges/chips (`bg-emerald-50 text-emerald-700`,
      `bg-amber-100 text-amber-800`, `bg-rose-50`, etc.) and fixed
      multi-color legends (e.g. health/priority color maps with a `slate`
      "neutral" entry) — left as-is, they read fine in both themes.
    - `Index.tsx` (dead/unrouted), `PublicTracking.tsx` (45 occurrences, public
      branded tracking page), `Login.tsx`/`Verify2FA.tsx` (pre-auth, mostly
      always-dark already) — not swept; lower priority if revisited.
  - `npm run build` passes; remaining `npm run lint` errors are pre-existing
    `@typescript-eslint/no-explicit-any` issues, unrelated to this pass.

## Phase 2: Operations, Finance, Intelligence & Fleet (latest)

A second phased rollout, additive only — no existing query, mutation, route,
or page was removed/renamed. **Migration
`20260615090000_phase2_operations_finance_fleet.sql` must be applied in
Supabase** (adds `vehicle_maintenance`, `payment_reminders`,
`job_progress_reports.lat/lng/is_checkpoint/checkpoint_type`,
`job_costs.vehicle_id`, and the `get_public_tracking`/`flag_overdue_invoices`
RPCs).

- **Operations & tracking**
  - **Live GPS + map tracking**: `ShipmentMap.tsx` (Leaflet/`react-leaflet`,
    OpenStreetMap tiles) renders the route, current position and checkpoints
    from a job's `job_progress_reports`. Used in `Tracking.tsx` (internal,
    "Show Live Map" toggle per job), `JobOrders.tsx` (job drawer, when any
    report has lat/lng), and `PublicTracking.tsx`.
  - **Progress updates** (`JobOrders.tsx`) gained: an optional free-text
    location + "Capture GPS" button (`navigator.geolocation`) that stamps
    `lat`/`lng`, and a "Mark as Border/Checkpoint" toggle with a checkpoint
    type picker (border crossing, customs, port/terminal, weigh station,
    warehouse, other) → `job_progress_reports.is_checkpoint`/`checkpoint_type`.
    Timeline entries show checkpoint + "GPS" badges when present.
  - **WhatsApp/SMS notify-on-update**: placeholder only, as directed — the
    checkboxes queue a toast ("integration coming soon") and make no
    external API calls.
  - **Customer self-service portal** (`PublicTracking.tsx`): now backed by
    `get_public_tracking(p_code)` (SECURITY DEFINER RPC, anon-safe single
    curated payload) instead of direct table selects. Adds a live map, an
    "Account Summary" card (linked quotation status + invoice
    total/deposit/balance with status chips), and a "Shipment Documents"
    list (links into the `logistic-files` bucket).

- **Finance & billing — Receivables Aging**
  - New page `ReceivablesAging.tsx` (route `/receivables-aging`, Finance nav
    item "Receivables Aging"). On load it calls `flag_overdue_invoices()` to
    flip any `invoices` row whose `deposit_due_date`/`balance_due_date` has
    passed and is still `pending` to `overdue`.
  - Buckets outstanding deposit/balance lines into **Current / 0–30 / 30–60 /
    60–90 / 90+** days overdue, with KPI cards (Total Outstanding, Overdue,
    Current) and clickable bucket-filter chips.
  - "Send Reminder" per line logs to the new `payment_reminders` table —
    `in_app` is a real follow-up log; `email`/`sms`/`whatsapp` insert the
    intent row then toast "coming soon" (placeholders).

- **Intelligence & automation**
  - **Dashboard alerts/health signals** (`Dashboard.tsx`): new
    `["dashboard_alerts"]` query surfaces stuck jobs (active stage,
    `updated_at` >2 days old), quotes expiring within 7 days, vehicle
    maintenance due within 30 days, driver licenses expiring within 30 days,
    and overdue invoices — shown as a severity-sorted "Alerts & Health
    Signals" card linking to the relevant page.
  - **Quote-to-revenue analytics** (`Reports.tsx`): new "Quote-to-Revenue
    Analytics" section — avg. lead→quote and quote→job conversion times,
    win-rate breakdowns by route/customer/salesperson, and lost-deal trends
    by `decline_reasons.reason_category` (count + lost pipeline value).
  - **Smart rate suggestions** (`Quotations.tsx`): the new-quote form matches
    the selected origin/destination against active `rate_card` entries and
    shows clickable suggestion chips (vehicle type, base rate, optional
    per-km rate) that fill the Quote Amount field.

- **Fleet & resources**
  - `Fleet.tsx` is now tabbed (Fleet / Schedule / Maintenance / Fuel & Trip
    Costs) via `Tabs`/`TabsList`/`TabsContent`; the existing Vehicles/Drivers
    tables, dialogs, Excel import and delete flows are unchanged inside the
    "Fleet" tab (the header's import/add controls only render on that tab).
  - **Schedule** (`fleet/FleetSchedule.tsx`): vehicle/driver availability
    snapshot (counts by status) + a date-grouped list of active job orders
    with inline editable Depart/Arrive date pickers
    (`job_orders.estimated_departure/estimated_arrival`).
  - **Maintenance** (`fleet/FleetMaintenance.tsx`): CRUD for
    `vehicle_maintenance` records (insurance/inspection/service/registration/
    other, with due/last-done dates and cost) showing
    Overdue/Due-in-Nd/OK badges; plus a Driver License Expiry table
    (`drivers.license_number/license_class/license_expiry`) with an inline
    edit dialog.
  - **Fuel & Trip Costs** (`fleet/FleetFuelLog.tsx`): logs fuel/trip spend
    into `job_costs` with `job_order_id` + the new `job_costs.vehicle_id`,
    sharing the self-learning `["job_cost_categories"]` list with Job Costing
    (entries also appear in that job's cost breakdown); per-vehicle and grand
    totals, recent-entries table.

## CRM assessment (open)

CRM works (Customers/Interactions/Tasks/Health/Lost Deals) and is wired to
`useCrm.ts`. It IS linked to the pipeline (timeline pulls leads/quotes/jobs/
invoices/interactions). Likely improvements if asked: surface CRM tasks/health
on the customer-facing flows, dedupe duplicate customer records (the app has
several same-named customers — see Job Order name-aware quote matching), and
add quick "create quote/job" actions from the customer profile.

## Git workflow

- Active development branch: **`claude/bold-davinci-9hjgaw`**. Develop and push
  there; never push elsewhere without explicit permission.
- Push with `git push -u origin <branch>`. Commit only when asked; do not open
  PRs unless explicitly requested.
- Do not put model identifiers in commit messages or code.

## Gotchas

- Loose typing (`any`) means the TS compiler won't catch DB field typos — be
  careful with column names; cross-check `supabase/schema.sql` + migrations.
- The dashboard mixes real queries with mock data — don't assume a number on
  screen is live.
- There are several loose scripts at repo root (`patch_leads.js`,
  `drop_constraint.*`, `get_columns.js`, etc.) — one-off DB utilities, not part
  of the app build.
</content>
