import { createEveIconComponent } from "../createIconComponent";
import RheaImage from "./rhea.png";

export const MoonDrillIcon = createEveIconComponent({
  name: "Moon Drill Icon",
  variants: {
    castor: RheaImage,
    incarna: RheaImage,
    rhea: RheaImage,
  },
});
