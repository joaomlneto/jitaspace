import { MailFaqModal } from "~/components/Modals/MailFaqModal";
import { ManageMailLabelsModal } from "~/components/Modals/ManageMailLabelsModal";
import { ComposeMailModal } from "./ComposeMailModal";
import { ViewMailingListSubscriptionsModal } from "./ViewMailingListSubscriptionsModal";
import { ViewMailMessageModal } from "./ViewMailMessageModal";

const contextModals = {
  composeMail: ComposeMailModal,
  mailFaq: MailFaqModal,
  manageMailLabels: ManageMailLabelsModal,
  viewMailMessage: ViewMailMessageModal,
  viewMailingListSubscriptions: ViewMailingListSubscriptionsModal,
};

declare module "@mantine/modals" {
  export interface MantineModalsOverride {
    modals: typeof contextModals;
  }
}

export { ComposeMailModal, contextModals };
