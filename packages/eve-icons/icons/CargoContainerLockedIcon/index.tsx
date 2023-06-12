import { createEveIconComponent } from "../createIconComponent";
import RheaImage from "./rhea.png";

export const CargoContainerLockedIcon = createEveIconComponent({
  name: "Cargo Container Locked Icon",
  variants: {
    castor: RheaImage,
    incarna: RheaImage,
    rhea: RheaImage,
  },
});
