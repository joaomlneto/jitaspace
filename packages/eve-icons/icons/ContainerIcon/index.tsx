import { createEveIconComponent } from "../createIconComponent";
import RheaImage from "./rhea.png";

export const ContainerIcon = createEveIconComponent({
  name: "Container Icon",
  variants: {
    castor: RheaImage,
    incarna: RheaImage,
    rhea: RheaImage,
  },
});
