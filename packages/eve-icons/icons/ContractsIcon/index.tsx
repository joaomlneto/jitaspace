import { createEveIconComponent } from "../createIconComponent";
import RheaImage from "./rhea.png";

export const ContractsIcon = createEveIconComponent({
  name: "Contracts Icon",
  variants: {
    castor: RheaImage,
    incarna: RheaImage,
    rhea: RheaImage,
  },
});
