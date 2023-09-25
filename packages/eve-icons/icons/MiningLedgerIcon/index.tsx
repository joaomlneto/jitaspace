import { createEveIconComponent } from "../createIconComponent";
import RheaImage from "./rhea.png";

export const MiningLedgerIcon = createEveIconComponent({
  name: "Mining Ledger Icon",
  variants: {
    castor: RheaImage,
    incarna: RheaImage,
    rhea: RheaImage,
  },
});
