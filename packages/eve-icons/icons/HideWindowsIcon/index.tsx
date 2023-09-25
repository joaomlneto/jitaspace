import { createEveIconComponent } from "../createIconComponent";
import RheaImage from "./rhea.png";

export const HideWindowsIcon = createEveIconComponent({
  name: "Hide Windows Icon",
  variants: {
    castor: RheaImage,
    incarna: RheaImage,
    rhea: RheaImage,
  },
});
