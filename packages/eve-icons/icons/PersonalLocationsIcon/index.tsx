import { createEveIconComponent } from "../createIconComponent";
import RheaImage from "./rhea.png";

export const PersonalLocationsIcon = createEveIconComponent({
  name: "Personal Locations Icon",
  variants: {
    castor: RheaImage,
    incarna: RheaImage,
    rhea: RheaImage,
  },
});
