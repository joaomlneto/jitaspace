"use client";

import { Alert, Anchor } from "@mantine/core";
import { openContextModal } from "@mantine/modals";
import { IconSearchOff } from "@tabler/icons-react";

export interface SearchScopeNoticeProps {
  /** Run before the login modal opens — e.g. to close the Spotlight first. */
  onBeforeLogin?: () => void;
}

/**
 * Shown in Search / Spotlight when no signed-in character can reach EVE's search.
 * ESI's only search endpoint (`/characters/{id}/search`) is character-authenticated,
 * so without a token the universe results never load and search is limited to the
 * app's own pages. Explains the limitation and offers a way to log in.
 */
export function SearchScopeNotice({ onBeforeLogin }: SearchScopeNoticeProps) {
  return (
    <Alert
      variant="light"
      color="yellow"
      icon={<IconSearchOff size={18} />}
      title="Search is limited"
    >
      Without a signed-in character, search only covers JitaSpace&rsquo;s own
      pages and tools — finding pilots, corporations and places across New Eden
      uses EVE&rsquo;s authenticated search.{" "}
      <Anchor
        component="button"
        type="button"
        inherit
        onClick={() => {
          onBeforeLogin?.();
          openContextModal({
            modal: "login",
            title: "Log in",
            size: "xl",
            innerProps: {},
          });
        }}
      >
        Log in to search New Eden
      </Anchor>
      .
    </Alert>
  );
}
