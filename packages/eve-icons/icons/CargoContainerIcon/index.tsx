import { createEveIconComponent } from "../createIconComponent";
import RheaImage from "./rhea.png";

export const CargoContainerIcon = createEveIconComponent({
  name: "Cargo Container Icon",
  variants: {
    castor: RheaImage,
    incarna: RheaImage,
    rhea: RheaImage,
  },
});
