import { createEveIconComponent } from "../createIconComponent";
import RheaImage from "./rhea.png";

export const StructureBrowserIcon = createEveIconComponent({
  name: "Structure Browser Icon",
  variants: {
    castor: RheaImage,
    incarna: RheaImage,
    rhea: RheaImage,
  },
});
