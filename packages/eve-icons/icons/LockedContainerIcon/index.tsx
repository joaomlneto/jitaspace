import { createEveIconComponent } from "../createIconComponent";
import RheaImage from "./rhea.png";

export const LockedContainerIcon = createEveIconComponent({
  name: "Locked Container Icon",
  variants: {
    castor: RheaImage,
    incarna: RheaImage,
    rhea: RheaImage,
  },
});
