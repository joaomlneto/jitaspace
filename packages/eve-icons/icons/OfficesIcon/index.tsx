import { createEveIconComponent } from "../createIconComponent";
import RheaImage from "./rhea.png";

export const OfficesIcon = createEveIconComponent({
  name: "Offices Icon",
  variants: {
    castor: RheaImage,
    incarna: RheaImage,
    rhea: RheaImage,
  },
});
