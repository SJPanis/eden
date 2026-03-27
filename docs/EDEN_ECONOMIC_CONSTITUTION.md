# Eden Economic Constitution

## Core Identity

Eden is a closed-loop AI service economy governed by two pools: **Artist** and **Architect**.

```
a + v = E  (total pool)
```

## Artist Pool — Innovation (Revenue-Based)

- **Measures:** Service revenue generated for Eden
- **Earns:** % proportional to `your_service_revenue / total_eden_revenue`
- **Volatile:** rises and falls with service performance
- **Anti-spam:** Only REAL service runs count (user spent Leafs on actual result)

## Architect Pool — Time/Usage (Commitment-Based)

- **Measures:** Meaningful lifetime usage of Eden
- **Earns:** % of `weighted_usage / total_eden_weighted_usage`
- **Sticky:** once earned, hard to dilute — early birds protected
- **Anti-spam:** Only QUALIFYING actions count toward Architect:

| Action | Yield |
|--------|-------|
| Completed service run | 1.0 |
| Published CIB accepted by PIBB owner | 1.0 |
| Referred user who spent 100+ Leafs | 0.8 |
| Draft CIB submitted not yet accepted | 0.1 |
| Spam API calls | 0.0 |
| Failed/incomplete runs | 0.0 |
| Rejected contributions | 0.0 |

```
Architect stake = sum(yield * tokens_used) across all qualifying actions
```

## Equilibrium Rule (The 10% Drift Cap)

- **Natural equilibrium:** Artist = 50%, Architect = 50% of E
- **Max allowed drift:** +/-10% from midpoint
- **Valid range:** Artist 40-60%, Architect 40-60%
- If Artist exceeds 60%: excess new inflow redirects to Architect
- If Architect exceeds 60%: excess new inflow redirects to Artist

```
a_final = clamp(Ra / (Ra + Rv), 0.40, 0.60)
```

## Leaf Economy

- **25 Leafs = $1 USD**
- Service run split: 70% creator, 15% Eden platform, 15% contribution pool
- Minimum payout: 1000 Leafs = $40
- Founder stake: 30% of Eden platform revenue (Sonny, fixed)

## Contribution Tiers

- **New PIBB:** joins Innovation (Artist) pool
- **CIB on existing PIBB:** earns Usage (Architect) pool
- **Inner ring PIBBs** (high revenue): harder to contribute, bigger reward
- **Outer ring PIBBs** (new/low revenue): easier to contribute, lower reward

## Digital Garden Visualization

- **Artist buildings:** tall, gold, pulse with service activity
- **Architect foundations:** wide, blue, permanent — never shrink
- **Town hall:** founder stake — always at center, never moves
- **Overflow particles:** visible rebalancing when drift cap is hit
- **Agent sprites:** workers gathering resources (encrypted task context)
- **Agent trade:** context passing between worker agents
- **Completed structure:** finished feature/checkpoint
