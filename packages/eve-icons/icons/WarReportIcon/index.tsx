import { createEveIconComponent } from "../createIconComponent";
import RheaImage from "./rhea.png";

export const WarReportIcon = createEveIconComponent({
  name: "War Report Icon",
  variants: {
    castor: RheaImage,
    incarna: RheaImage,
    rhea: RheaImage,
  },
});
