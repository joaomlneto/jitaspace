import { createEveIconComponent } from "../createIconComponent";
import RheaImage from "./rhea.png";

export const CargoFolderIcon = createEveIconComponent({
  name: "Cargo Folder Icon",
  variants: {
    castor: RheaImage,
    incarna: RheaImage,
    rhea: RheaImage,
  },
});
