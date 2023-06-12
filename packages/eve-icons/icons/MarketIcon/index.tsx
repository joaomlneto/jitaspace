import { createEveIconComponent } from "../createIconComponent";
import RheaImage from "./rhea.png";

export const MarketIcon = createEveIconComponent({
  name: "Market Icon",
  variants: {
    castor: RheaImage,
    incarna: RheaImage,
    rhea: RheaImage,
  },
});
