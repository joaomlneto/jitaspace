import { createEveIconComponent } from "../createIconComponent";
import RheaImage from "./rhea.png";

export const ConcordIcon = createEveIconComponent({
  name: "CONCORD Icon",
  variants: {
    castor: RheaImage,
    incarna: RheaImage,
    rhea: RheaImage,
  },
});
