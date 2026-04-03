# @jitaspace/eve-scrape

Inngest background jobs for scraping and syncing EVE Online data.

## Overview

Defines [Inngest](https://www.inngest.com) functions that periodically fetch data from the EVE ESI API, EVEKill, and the SDE, then persist it to the JitaSpace database. Used by the worker app.

## Included Jobs

- Alliance, corporation, and character data sync
- Kill mail ingestion
- Market data and price updates
- Universe data (items, regions, constellations, systems)
- Industry indices and sovereignty data

## Usage

Register the exported functions with your Inngest client in the worker app:

```ts
import { scrapingFunctions } from "@jitaspace/eve-scrape";

// Pass to inngest.serve(...)
```

## Dependencies

- `inngest` — Job scheduling and execution
- `@jitaspace/db` — Database persistence
- `@jitaspace/esi-client` — EVE ESI API access
- `@jitaspace/evekill-client` — Kill mail data
- `@jitaspace/sde-client` — Static data export access
- `@jitaspace/kv` — Redis queues
- `@jitaspace/chat` — Discord update notifications
