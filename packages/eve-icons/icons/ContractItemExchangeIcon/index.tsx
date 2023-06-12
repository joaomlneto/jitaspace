import { createEveIconComponent } from "../createIconComponent";
import RheaImage from "./rhea.png";

export const ContractItemExchangeIcon = createEveIconComponent({
  name: "Item Exchange Contract Icon",
  variants: {
    castor: RheaImage,
    incarna: RheaImage,
    rhea: RheaImage,
  },
});
