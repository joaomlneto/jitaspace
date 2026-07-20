# @jitaspace/esi-metadata

[![npm version](https://img.shields.io/npm/v/@jitaspace/esi-metadata)](https://www.npmjs.com/package/@jitaspace/esi-metadata)
[![npm downloads](https://img.shields.io/npm/dm/@jitaspace/esi-metadata)](https://www.npmjs.com/package/@jitaspace/esi-metadata)
[![license](https://img.shields.io/npm/l/@jitaspace/esi-metadata)](./LICENSE)

Static metadata for the [EVE Online](https://www.eveonline.com) ESI API — typed OAuth2 scopes and entity ID ranges.

## Installation

```bash
npm install @jitaspace/esi-metadata
# or
pnpm add @jitaspace/esi-metadata
```

## Overview

Provides TypeScript constants and types describing ESI entity ID ranges and OAuth2 scope definitions, so you don't have to hardcode ESI-specific values.

## Exports

| Export | Description |
|---|---|
| `scopes` | Array of every EVE Online ESI OAuth2 scope string |
| `ESIScope` | Union type of all scope strings (`(typeof scopes)[number]`) |
| `scopeDescriptions` / `getScopeDescription(scope)` | Human-readable descriptions for each scope |
| `endpointScopes` | Mapping of ESI endpoints to the scopes they require |
| `characterIdRanges`, `corporationIdRanges`, `allianceIdRanges`, `regionIdRanges`, `constellationIdRanges`, `solarSystemRanges`, `stargateRanges`, `stationRanges`, `npcCharacterIdRanges` | Min/max numeric ID boundaries for EVE entity types |
| `isIdInRanges(id, ranges)` | Helper to test whether an ID falls within a set of ranges |

## Usage

```ts
import {
  scopes,
  characterIdRanges,
  isIdInRanges,
  getScopeDescription,
  type ESIScope,
} from "@jitaspace/esi-metadata";

const scope: ESIScope = "esi-mail.read_mail.v1";
console.log(getScopeDescription(scope));

// Classify an ID by range
const isCharacter = isIdInRanges(2112625428, characterIdRanges);
```
