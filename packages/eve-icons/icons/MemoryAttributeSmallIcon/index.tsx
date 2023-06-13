import { createEveIconComponent } from "../createIconComponent";
import RheaImage from "./rhea.png";

export const MemoryAttributeSmallIcon = createEveIconComponent({
  name: "Memory Attribute Small Icon",
  variants: {
    castor: RheaImage,
    incarna: RheaImage,
    rhea: RheaImage,
  },
});
