import { createEveIconComponent } from "../createIconComponent";
import RheaImage from "./rhea.png";

export const ContractCourierIcon = createEveIconComponent({
  name: "Courier Contract Icon",
  variants: {
    castor: RheaImage,
    incarna: RheaImage,
    rhea: RheaImage,
  },
});
