# @jitaspace/chat

JitaSpace chat integration client.

## Overview

Exports a configured chat instance backed by a Discord adapter and a Redis-based state store. Used by the `eve-scrape` package to post EVE universe update notifications to a Discord channel.

## Exports

| Export | Description |
|---|---|
| `chat` | Configured `Chat` instance with Discord adapter |
| `updatesChannel` | Reference to the Discord updates channel |
| `postUpdateCard` | Posts a formatted status card to the updates channel |

## Usage

```ts
import { updatesChannel, postUpdateCard } from "@jitaspace/chat";

// Post a plain message
await updatesChannel.post("Alliance data updated.");

// Post a structured status card
await postUpdateCard({ status: "success", summary: "Scraped 1200 kills.", processed: 1200 });
```

## Environment Variables

| Variable | Description |
|---|---|
| `REDIS_URL` | Redis connection string for chat state |
| `DISCORD_UPDATES_CHANNEL_ID` | Target Discord channel ID |
