import { CurrentShipFittingModal } from "~/components/Modals/CurrentShipFittingModal";
import { SsoTokenModal } from "~/components/Modals/SsoTokenModal";
import { ComposeMailModal } from "./ComposeMailModal";
import { FittingModal } from "./FittingModal";
import { LoginModal } from "./LoginModal";
import { ManageMailLabelsModal } from "./ManageMailLabelsModal";
import { ViewCalendarEventModal } from "./ViewCalendarEventModal";
import { ViewMailingListSubscriptionsModal } from "./ViewMailingListSubscriptionsModal";
import { ViewMailMessageModal } from "./ViewMailMessageModal";


const contextModals = {
  composeMail: ComposeMailModal,
  currentShipFitting: CurrentShipFittingModal,
  fitting: FittingModal,
  login: LoginModal,
  manageMailLabels: ManageMailLabelsModal,
  ssoToken: SsoTokenModal,
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
