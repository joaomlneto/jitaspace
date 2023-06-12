import { createEveIconComponent } from "../createIconComponent";
import RheaImage from "./rhea.png";

export const CertificatesIcon = createEveIconComponent({
  name: "Certificates Icon",
  variants: {
    castor: RheaImage,
    incarna: RheaImage,
    rhea: RheaImage,
  },
});
