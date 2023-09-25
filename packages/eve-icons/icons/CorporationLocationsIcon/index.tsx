import { createEveIconComponent } from "../createIconComponent";
import RheaImage from "./rhea.png";

export const CorporationLocationsIcon = createEveIconComponent({
  name: "Corporation Locations Icon",
  variants: {
    castor: RheaImage,
    incarna: RheaImage,
    rhea: RheaImage,
  },
});
