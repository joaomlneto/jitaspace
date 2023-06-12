import { createEveIconComponent } from "../createIconComponent";
import RheaImage from "./rhea.png";

export const WalletIcon = createEveIconComponent({
  name: "Wallet Icon",
  variants: {
    castor: RheaImage,
    incarna: RheaImage,
    rhea: RheaImage,
  },
});
