import { createEveIconComponent } from "../createIconComponent";
import RheaImage from "./rhea.png";

export const CommandCenterHoldIcon = createEveIconComponent({
  name: "Command Center Hold Icon",
  variants: {
    castor: RheaImage,
    incarna: RheaImage,
    rhea: RheaImage,
  },
});
