import { createEveIconComponent } from "../createIconComponent";
import RheaImage from "./rhea.png";

export const MedicalIcon = createEveIconComponent({
  name: "Medical Icon",
  variants: {
    castor: RheaImage,
    incarna: RheaImage,
    rhea: RheaImage,
  },
});
