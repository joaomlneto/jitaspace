import { createEveIconComponent } from "../createIconComponent";
import RheaImage from "./rhea.png";

export const PerceptionAttributeSmallIcon = createEveIconComponent({
  name: "Perception Attribute Small Icon",
  variants: {
    castor: RheaImage,
    incarna: RheaImage,
    rhea: RheaImage,
  },
});
