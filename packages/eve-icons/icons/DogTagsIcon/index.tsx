import { createEveIconComponent } from "../createIconComponent";
import RheaImage from "./rhea.png";

export const DogTagsIcon = createEveIconComponent({
  name: "Dog Tags Icon",
  variants: {
    castor: RheaImage,
    incarna: RheaImage,
    rhea: RheaImage,
  },
});
