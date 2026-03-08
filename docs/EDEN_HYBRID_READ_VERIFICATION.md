# Eden Hybrid Read Verification

This workflow is development-only. It exists to validate Eden's hybrid Prisma-backed read path against intentionally diverged PostgreSQL records while leaving the shared mock dataset unchanged.

## Purpose

Use this flow before wider backend cutover work when you need proof that these read surfaces can observe database-backed values:

- consumer discovery snapshot
- service detail routes
- business detail routes
- business dashboard overview
- owner dashboard summaries
- owner inspection surfaces

## Safety

- The divergence only updates PostgreSQL records.
- It does not edit the canonical mock data in `modules/core/mock-data/`.
- The divergence is reversible by re-running the canonical sync.
- The current UI remains mock-authoritative where local overlays or cookie-backed mock state exist.

## Commands

1. Push the current Prisma schema:

```bash
npx prisma db push
```

2. Sync canonical marketplace records into PostgreSQL:

```bash
npm run db:sync:canonical-marketplace
```

3. Apply the development-only divergence scenario:

```bash
npm run db:diverge:hybrid-read
```

Useful preview:

```bash
npm run db:diverge:hybrid-read -- --dry-run
```

4. Verify the hybrid read boundary directly:

```bash
npm run db:verify:hybrid-read
```

5. Start the app in hybrid read mode:

```bash
EDEN_BUILDER_LOOP_READ_MODE=hybrid
EDEN_LOG_HYBRID_READS=true
npm run dev
```

## Expected Divergence

The current scenario intentionally diverges these canonical records in PostgreSQL:

- `user-02`
  - display name becomes `Paige Brooks DB Divergence`
- `business-01`
  - name becomes `Northstar Habit Lab DB Divergence`
  - category becomes `AI Productivity Lab`
  - visibility becomes `Published`
- `service-01`
  - title becomes `Focus Sprint Planner DB Divergence`
  - category becomes `AI Productivity Lab`
  - status becomes `Published`

If hybrid reads are working, these values should appear through the read boundary without any changes to the mock source files.

## How To Read Verification Output

`npm run db:verify:hybrid-read` prints one result per targeted surface:

- `PASS`
  - the observed value matches the intentionally diverged PostgreSQL value
- `FALLBACK`
  - the observed value still matches the canonical mock baseline
- `CHECK`
  - the result did not match either expected divergence or mock baseline, so inspect local overrides or database state

When `EDEN_LOG_HYBRID_READS=true`, server logs also show whether a persistent read:

- completed with persistent data
- completed without a persistent match
- failed and fell back to the mock path

## Manual UI Verification

For a clean manual pass, first clear local mock overrides for the same business or service:

- use the owner reset controls in the UI
- or clear the relevant mock cookies

Then check:

1. `/consumer`
   - `Focus Sprint Planner DB Divergence` should appear as a published discovery result
2. `/services/service-01`
   - title should show `Focus Sprint Planner DB Divergence`
3. `/businesses/business-01`
   - title should show `Northstar Habit Lab DB Divergence`
4. `/business`
   - the active workspace overview should show the diverged business name
5. `/owner`
   - watched summaries should show the diverged user and business values
6. `/owner/users/user-02`
   - the inspected user and owned business should show the diverged values

## Reset

To restore the canonical PostgreSQL view:

```bash
npm run db:sync:canonical-marketplace
```

That keeps the divergence workflow reversible and non-destructive.

