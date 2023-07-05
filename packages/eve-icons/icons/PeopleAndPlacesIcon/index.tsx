import { createEveIconComponent } from "../createIconComponent";
import RheaImage from "./rhea.png";

export const PeopleAndPlacesIcon = createEveIconComponent({
  name: "People and Places Icon",
  variants: {
    castor: RheaImage,
    incarna: RheaImage,
    rhea: RheaImage,
  },
});
