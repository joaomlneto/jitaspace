import { describe, expect, it } from "@jest/globals";

import { CSM_21, isCsm21Candidate } from "~/config/csm";
import { newsItems } from "~/config/news";

describe("CSM 21 election data", () => {
  it("lists the 53 candidates of the official announcement", () => {
    expect(CSM_21.candidates).toHaveLength(53);
  });

  it("names every candidate once, by a distinct character", () => {
    const ids = CSM_21.candidates.map((candidate) => candidate.characterId);
    expect(new Set(ids).size).toBe(ids.length);
    const threads = CSM_21.candidates.map((candidate) => candidate.forumThread);
    expect(new Set(threads).size).toBe(threads.length);
  });

  it.each(CSM_21.candidates)(
    "$name has a pitch and a CSM Campaigns forum thread",
    (candidate) => {
      expect(candidate.characterId).toBeGreaterThan(0);
      expect(candidate.pitch.length).toBeGreaterThan(40);
      expect(candidate.forumThread).toMatch(
        /^https:\/\/forums\.eveonline\.com\/t\/[a-z0-9-]+\/\d+$/,
      );
    },
  );

  it("links each interview to a Twitch VOD", () => {
    expect(CSM_21.interviews).toHaveLength(4);
    for (const interview of CSM_21.interviews) {
      expect(interview.url).toMatch(/^https:\/\/www\.twitch\.tv\/videos\/\d+$/);
    }
  });

  it("recognises candidates and nobody else", () => {
    expect(isCsm21Candidate(585213969)).toBe(true);
    expect(isCsm21Candidate(123)).toBe(false);
    expect(isCsm21Candidate(undefined)).toBe(false);
  });

  it("announces the vote on the home page for exactly the voting window", () => {
    const card = newsItems.find((item) => item.id === "csm-21-voting-open");
    expect(card).toMatchObject({
      publishAt: "2026-10-22T11:00:00Z",
      expiresAt: "2026-11-03T11:00:00Z",
      link: { href: "/csm" },
    });
    expect(card?.publishAt).toBe(CSM_21.voting.start);
    expect(card?.expiresAt).toBe(CSM_21.voting.end);
    const others = newsItems.filter((item) => item !== card);
    for (const item of others) {
      expect(card?.priority ?? 0).toBeGreaterThan(item.priority ?? 0);
    }
  });
});
