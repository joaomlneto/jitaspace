# @jitaspace/kv

Redis client and Bull queue definitions for JitaSpace.

## Overview

Provides a connected Redis client and pre-configured Bull job queues for processing EVE Online entity data. Used by background workers to queue and process large volumes of ESI entity lookups.

## Exports

| Export | Description |
|---|---|
| `redis` | Connected Redis client instance |
| `kv` | Object containing named Bull queues under `kv.queues` |
| `kv.queues.allianceIds` | Queue for alliance ID processing jobs |
| `kv.queues.characterIds` | Queue for character ID processing jobs |
| `kv.queues.corporationIds` | Queue for corporation ID processing jobs |
| `kv.queues.war` | Queue for war data processing jobs |

## Usage

```ts
import { redis, kv } from "@jitaspace/kv";

await kv.queues.characterIds.add({ characterIds: [12345678] });
```

## Environment Variables

| Variable | Description |
|---|---|
| `REDIS_URL` | Redis connection string |
