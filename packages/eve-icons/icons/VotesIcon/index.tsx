import { createEveIconComponent } from "../createIconComponent";
import RheaImage from "./rhea.png";

export const VotesIcon = createEveIconComponent({
  name: "Votes Icon",
  variants: {
    castor: RheaImage,
    incarna: RheaImage,
    rhea: RheaImage,
  },
});
