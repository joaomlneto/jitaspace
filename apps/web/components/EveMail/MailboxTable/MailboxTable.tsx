import React from "react";
import { type TableProps } from "@mantine/core";

import { DesktopMailboxTable } from "./DesktopMailboxTable";
import { MobileMailboxTable } from "./MobileMailboxTable";

export type MailboxTableProps = TableProps & {
  data: {
    from?: number;
    is_read?: boolean;
    labels?: number[];
    mail_id?: number;
    recipients?: {
      recipient_id: number;
      recipient_type: string;
    }[];
    subject?: string;
    timestamp?: string;
    // This is a custom property that we add to the data
    // to indicate whether the mail has been deleted or not.
    // This is to try and be more responsive to the user, since the API
    // takes up to 30 seconds to actually show changes.
    isDeleted?: boolean;
  }[];
  mutate?: () => void;
};

export const MailboxTable = (props: MailboxTableProps) => {
  return (
    <>
      {/* FIXME MANTINE V7 MIGRATION */}
      <DesktopMailboxTable {...props} />
      <MobileMailboxTable {...props} />
    </>
  );
};
