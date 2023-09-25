import { createEveIconComponent } from "../createIconComponent";
import RheaImage from "./rhea.png";

export const MarketDeliveriesIcon = createEveIconComponent({
  name: "Market Deliveries Icon",
  variants: {
    castor: RheaImage,
    incarna: RheaImage,
    rhea: RheaImage,
  },
});
