"use client";

import { useMemo } from "react";

import type {
  GetCharactersCharacterIdContractsQueryResponse,
  GetCorporationsCorporationIdContractsQueryResponse,
} from "@jitaspace/esi-client";

import type { EsiSubjectError } from "../multi";
import {
  useMultipleCharacterContracts,
  useMultipleCorporationContracts,
} from "../../generated/multi";

/** A contract as ESI lists it to a character. Corporations get the same shape. */
export type EsiContract =
  | GetCharactersCharacterIdContractsQueryResponse[number]
  | GetCorporationsCorporationIdContractsQueryResponse[number];

/** Which ESI listing a contract was read from, and so whose token can open it. */
export interface ContractSource {
  kind: "character" | "corporation";
  /** The character or corporation id the listing belongs to. */
  subjectId: number;
}

export type AuthenticatedContract = EsiContract & {
  /**
   * Every listing the contract appeared in. A corporation contract an
   * authenticated character issued shows up in both the character's and the
   * corporation's listing; the first source is the character's when there is
   * one, since its endpoints need no corporation role.
   */
  sources: ContractSource[];
};

export interface AuthenticatedContractsResult {
  /** One entry per contract, however many listings it appeared in. */
  data: AuthenticatedContract[];
  isLoading: boolean;
  /** True until both fan-outs have settled, including before auth rehydrates. */
  isPending: boolean;
  isError: boolean;
  errors: (EsiSubjectError & { kind: ContractSource["kind"] })[];
  /** The characters whose contracts were read. */
  characterIds: number[];
  /** The corporations whose contracts were read. */
  corporationIds: number[];
  refetch: () => void;
}

/**
 * Every contract ESI shows the authenticated characters and their
 * corporations, in one list.
 *
 * ESI scopes contracts per character (`/characters/{id}/contracts`) and per
 * corporation (`/corporations/{id}/contracts`), and the generated hooks read
 * one subject at a time. This runs both multi-subject fan-outs and merges them:
 * a contract seen in several listings appears once, with every listing it came
 * from in `sources`.
 *
 * The listings hold every contract the subject issued, was assigned or
 * accepted in the last 30 days, in every status; filter on `status` and
 * `issuer_id` for "my open contracts".
 */
export function useAuthenticatedContracts(): AuthenticatedContractsResult {
  const characters = useMultipleCharacterContracts();
  const corporations = useMultipleCorporationContracts();

  const data = useMemo(() => {
    const byId = new Map<number, AuthenticatedContract>();
    const add = (
      contract: EsiContract & { subjectId: number },
      kind: ContractSource["kind"],
    ) => {
      const { subjectId, ...rest } = contract;
      const source = { kind, subjectId };
      const existing = byId.get(contract.contract_id);
      if (existing) {
        existing.sources.push(source);
      } else {
        byId.set(contract.contract_id, { ...rest, sources: [source] });
      }
    };
    // Characters first, so their source leads (see `sources`).
    for (const contract of characters.data) add(contract, "character");
    for (const contract of corporations.data) add(contract, "corporation");
    return [...byId.values()];
  }, [characters.data, corporations.data]);

  const errors = useMemo(
    () => [
      ...characters.errors.map((error) => ({
        ...error,
        kind: "character" as const,
      })),
      ...corporations.errors.map((error) => ({
        ...error,
        kind: "corporation" as const,
      })),
    ],
    [characters.errors, corporations.errors],
  );

  const refetchCharacters = characters.refetch;
  const refetchCorporations = corporations.refetch;
  const refetch = useMemo(
    () => () => {
      refetchCharacters();
      refetchCorporations();
    },
    [refetchCharacters, refetchCorporations],
  );

  return {
    data,
    isLoading: characters.isLoading || corporations.isLoading,
    isPending: characters.isPending || corporations.isPending,
    isError: characters.isError || corporations.isError,
    errors,
    characterIds: characters.subjectIds,
    corporationIds: corporations.subjectIds,
    refetch,
  };
}
