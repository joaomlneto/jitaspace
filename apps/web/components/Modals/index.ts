import { LoginModal } from "~/components/Modals/LoginModal";
import { MailFaqModal } from "~/components/Modals/MailFaqModal";
import { ManageMailLabelsModal } from "~/components/Modals/ManageMailLabelsModal";
import { ComposeMailModal } from "./ComposeMailModal";
import { ViewCalendarEventModal } from "./ViewCalendarEventModal";
import { ViewMailingListSubscriptionsModal } from "./ViewMailingListSubscriptionsModal";
import { ViewMailMessageModal } from "./ViewMailMessageModal";

const contextModals = {
  composeMail: ComposeMailModal,
  login: LoginModal,
  mailFaq: MailFaqModal,
  manageMailLabels: ManageMailLabelsModal,
  viewCalendarEvent: ViewCalendarEventModal,
  viewMailMessage: ViewMailMessageModal,
  viewMailingListSubscriptions: ViewMailingListSubscriptionsModal,
};

declare module "@mantine/modals" {
  export interface MantineModalsOverride {
    modals: typeof contextModals;
  }
}

export { ComposeMailModal, contextModals };
