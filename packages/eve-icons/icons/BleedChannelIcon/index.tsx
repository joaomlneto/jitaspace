import { createEveIconComponent } from "../createIconComponent";
import RheaImage from "./rhea.png";

export const BleedChannelIcon = createEveIconComponent({
  name: "Bleed Channel Icon",
  variants: {
    castor: RheaImage,
    incarna: RheaImage,
    rhea: RheaImage,
  },
});
