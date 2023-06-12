import { createEveIconComponent } from "../createIconComponent";
import RheaImage from "./rhea.png";

export const StopIcon = createEveIconComponent({
  name: "Stop Icon",
  variants: {
    castor: RheaImage,
    incarna: RheaImage,
    rhea: RheaImage,
  },
});
