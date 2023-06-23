import { createEveIconComponent } from "../createIconComponent";
import RheaImage from "./rhea.png";

export const TerminateIcon = createEveIconComponent({
  name: "Terminate Icon",
  variants: {
    castor: RheaImage,
    incarna: RheaImage,
    rhea: RheaImage,
  },
});
