# Antigravity Prompt — Eden Homepage Redesign

**Use this as your first Antigravity prompt verbatim (or paste directly into Mission Control).**

---

## Prompt

You are working on **Eden** — a launchable AI service platform at edencloud.app.

Your job in this session is to **redesign the public homepage** (`ui/entry/eden-public-auth-panel.tsx`)
for premium visual quality. You are working on the visual layer only. Do not touch backend files,
API routes, auth logic, Prisma, or anything under `modules/core/agents/`, `modules/core/services/`,
or `app/api/`.

Read `ANTIGRAVITY.md` at the repo root before starting. It defines:
- what you can and cannot touch
- the design token system
- security rules
- current homepage structure

---

### What to build

Redesign `ui/entry/eden-public-auth-panel.tsx` to feel like a **premium AI-native platform launch
page** — think Linear, Vercel, or Stripe homepage quality, but for an AI marketplace with a
teal/navy identity.

The component must:

1. **Preserve all existing functionality** — sign-up form, sign-in toggle, form submission,
   `maintenanceMode` prop, Auth.js integration, the `Explore` link to `/consumer`. Do not remove
   or rewire any of this logic.

2. **Elevate the visual quality** with:
   - A **depth-layered hero section**: floating glass-morphism panels over a rich gradient or
     subtle mesh background. Use `backdrop-filter: blur` and layered `box-shadow` with transparency.
   - **Animated accent elements**: a slow-pulsing radial glow behind the brand lockup using
     CSS `@keyframes` or Tailwind animation utilities. Keep it subtle — not distracting.
   - **Premium card treatment**: the "How Eden works" and "Who Eden is for" cards should feel
     elevated — thin borders, inner-glow on hover, micro-shadow layering.
   - **Monospaced label hierarchy**: Eden uses IBM Plex Mono for label caps (`EDEN LAUNCH`,
     `HOW EDEN WORKS` etc.). Make these feel intentional — tighter tracking, deliberate sizing.
   - **Form panel quality**: the right-column auth form should feel like a product-grade sign-in
     experience — not a plain form. Subtle inner shadow on inputs, clear focus ring using
     `eden-ring` (`#7bc9cf`), smooth transitions.

3. **Stay within the Eden design token system** — use only these Tailwind tokens:
   - `text-eden-ink` (`#10253a`), `text-eden-muted` (`#597087`), `text-eden-accent` (`#14989a`)
   - `bg-eden-bg`, `bg-eden-bg-alt`, `bg-eden-accent-soft`, `bg-eden-panel`
   - `border-eden-edge`, `border-eden-ring`
   - Custom CSS only where Tailwind tokens cannot achieve the effect (e.g. `@keyframes`, mesh
     gradients, complex `box-shadow` stacks)

4. **No new dependencies** — use only what is already available: Tailwind CSS v4, React, Next.js,
   `next/link`. Do not install three.js, framer-motion, GSAP, or any other library without
   explicit owner approval.

5. **Preserve the two-column layout** on `xl:` breakpoints (hero left, auth right). On smaller
   screens the form should stack below the hero naturally.

---

### Visual direction reference

The brand identity:
- **Teal accent** (`#14989a`) is the primary action colour — used on labels, CTAs, hover glows
- **Navy ink** (`#10253a`) is the primary text — confident, not harsh
- **Background**: currently a warm-to-cool radial gradient. You can enrich this with a soft mesh
  or a layered `conic-gradient` / `radial-gradient` stack, but keep it light — no dark mode
- **Glass panels**: use `bg-white/88` or similar with `backdrop-blur-md` for floating card effects
- The grid overlay class `.eden-grid` (defined in `globals.css`) is available for subtle
  structural texture

Mood: **calm authority, not flashy**. Eden is an operating system for AI services — it should
feel like the place serious builders deploy, not a startup landing page with excessive motion.

---

### What to deliver

- An updated `ui/entry/eden-public-auth-panel.tsx`
- If you add `@keyframes` or complex CSS, add it to `app/globals.css` — do not add a new CSS file
- No changes to any other file

After the change, confirm:
- the component still renders without TypeScript errors
- sign-up and sign-in flows are untouched
- the `maintenanceMode` banner still renders when the prop is `true`
- the `Explore` link to `/consumer` is still present
