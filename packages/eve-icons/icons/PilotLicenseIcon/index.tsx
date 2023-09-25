import { createEveIconComponent } from "../createIconComponent";
import RheaImage from "./rhea.png";

export const PilotLicenseIcon = createEveIconComponent({
  name: "Pilot License Icon",
  variants: {
    castor: RheaImage,
    incarna: RheaImage,
    rhea: RheaImage,
  },
});
