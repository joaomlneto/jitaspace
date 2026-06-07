/**
 * Tests for createChat() in packages/chat/index.tsx.
 *
 * Key invariant: the caller-supplied Discord bot token must be forwarded to
 * createDiscordAdapter({ botToken }) so the adapter never falls back to
 * process.env.DISCORD_BOT_TOKEN.
 */

import { beforeEach, describe, expect, it, jest } from "@jest/globals";

// ---------------------------------------------------------------------------
// Mock external chat packages — the real ones hit Discord / Redis.
// ---------------------------------------------------------------------------

const mockChatInstance = {
  onNewMention: jest.fn(),
  onAction: jest.fn(),
  onSubscribedMessage: jest.fn(),
  channel: jest.fn().mockReturnValue({ post: jest.fn() }),
};

jest.mock("chat", () => ({
  Chat: jest.fn().mockImplementation(() => mockChatInstance),
  Card: jest.fn(),
  CardText: jest.fn(),
  Divider: jest.fn(),
  Actions: jest.fn(),
  Button: jest.fn(),
  Field: jest.fn(),
  Fields: jest.fn(),
}));

const mockCreateDiscordAdapter = jest.fn().mockReturnValue({});
jest.mock("@chat-adapter/discord", () => ({
  createDiscordAdapter: (...args: unknown[]) =>
    mockCreateDiscordAdapter(...args),
}));

jest.mock("@chat-adapter/state-redis", () => ({
  createRedisState: jest.fn().mockReturnValue({}),
}));

// ---------------------------------------------------------------------------

describe("createChat", () => {
  beforeEach(() => {
    jest.resetModules();
    mockCreateDiscordAdapter.mockClear();
  });

  it("passes the injected botToken to createDiscordAdapter", async () => {
    const { createChat } = await import("../index.tsx");
    createChat({ discordBotToken: "tok-abc-123" });
    expect(mockCreateDiscordAdapter).toHaveBeenCalledTimes(1);
    expect(mockCreateDiscordAdapter).toHaveBeenCalledWith({
      botToken: "tok-abc-123",
    });
  });

  it("does not call createDiscordAdapter when no token is provided", async () => {
    const { createChat } = await import("../index.tsx");
    createChat({});
    expect(mockCreateDiscordAdapter).not.toHaveBeenCalled();
  });

  it("does not call createDiscordAdapter when called with no arguments", async () => {
    const { createChat } = await import("../index.tsx");
    createChat();
    expect(mockCreateDiscordAdapter).not.toHaveBeenCalled();
  });

  it("sets updatesChannel when both token and channelId are provided", async () => {
    const { createChat } = await import("../index.tsx");
    const { updatesChannel } = createChat({
      discordBotToken: "tok-abc-123",
      discordUpdatesChannelId: "chan-999",
    });
    expect(updatesChannel).not.toBeNull();
  });

  it("sets updatesChannel to null when token is absent", async () => {
    const { createChat } = await import("../index.tsx");
    const { updatesChannel } = createChat({
      discordUpdatesChannelId: "chan-999",
    });
    expect(updatesChannel).toBeNull();
  });

  it("sets updatesChannel to null when channelId is absent", async () => {
    const { createChat } = await import("../index.tsx");
    const { updatesChannel } = createChat({ discordBotToken: "tok-abc-123" });
    expect(updatesChannel).toBeNull();
  });

  it("returns chat, updatesChannel, and postUpdateCard", async () => {
    const { createChat } = await import("../index.tsx");
    const result = createChat();
    expect(result).toHaveProperty("chat");
    expect(result).toHaveProperty("updatesChannel");
    expect(result).toHaveProperty("postUpdateCard");
    expect(typeof result.postUpdateCard).toBe("function");
  });
});
