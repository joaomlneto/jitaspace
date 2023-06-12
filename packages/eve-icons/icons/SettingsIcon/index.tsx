import { createEveIconComponent } from "../createIconComponent";
import RheaImage from "./rhea.png";

export const SettingsIcon = createEveIconComponent({
  name: "Settings Icon",
  variants: {
    castor: RheaImage,
    incarna: RheaImage,
    rhea: RheaImage,
  },
});
