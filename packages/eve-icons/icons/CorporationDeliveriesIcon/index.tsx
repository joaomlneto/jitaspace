import { createEveIconComponent } from "../createIconComponent";
import RheaImage from "./rhea.png";

export const CorporationDeliveriesIcon = createEveIconComponent({
  name: "Corporation Deliveries Icon",
  variants: {
    castor: RheaImage,
    incarna: RheaImage,
    rhea: RheaImage,
  },
});
