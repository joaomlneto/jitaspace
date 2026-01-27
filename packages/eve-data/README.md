# @jitaspace/eve-data

Some hardcoded datasets from EVE Online, used across the JitaSpace project.

## Installation

```bash
npm install @jitaspace/eve-data
# or
pnpm add @jitaspace/eve-data
# or
yarn add @jitaspace/eve-data
```

## Usage

```typescript
import {
  incursion_constellations,
  incursion_payouts_isk,
  incursion_payouts_lp
} from '@jitaspace/eve-data';

// Example: Accessing incursion constellation data
const vanguards = incursion_constellations['Agiesseson'].Vanguards;
console.log('Vanguard systems in Agiesseson:', vanguards);

// Example: Checking ISK payouts for a Vanguard site in Highsec
const iskPayout = incursion_payouts_isk.Vanguard.H[10];
console.log('ISK Payout for Vanguard (10 people):', iskPayout);
```

## Data Included

- `incursion_constellations`: Static data about incursion constellations (Staging, Vanguards, Assaults, HQ).
- `incursion_payouts_isk`: ISK rewards for various incursion site types.
- `incursion_payouts_lp`: LP rewards for various incursion site types.
