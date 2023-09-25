import { createEveIconComponent } from "../createIconComponent";
import RheaImage from "./rhea.png";

export const DockingIcon = createEveIconComponent({
  name: "Docking Icon",
  variants: {
    castor: RheaImage,
    incarna: RheaImage,
    rhea: RheaImage,
  },
});
