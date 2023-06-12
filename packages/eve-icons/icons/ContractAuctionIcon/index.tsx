import { createEveIconComponent } from "../createIconComponent";
import RheaImage from "./rhea.png";

export const ContractAuctionIcon = createEveIconComponent({
  name: "Auction Contract Icon",
  variants: {
    castor: RheaImage,
    incarna: RheaImage,
    rhea: RheaImage,
  },
});
