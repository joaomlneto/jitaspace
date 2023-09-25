import { createEveIconComponent } from "../createIconComponent";
import RheaImage from "./rhea.png";

export const ProjectDiscoveryIcon = createEveIconComponent({
  name: "Project Discovery Icon",
  variants: {
    castor: RheaImage,
    incarna: RheaImage,
    rhea: RheaImage,
  },
});
