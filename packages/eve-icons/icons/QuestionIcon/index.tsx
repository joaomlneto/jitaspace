import { createEveIconComponent } from "../createIconComponent";
import RheaImage from "./rhea.png";

export const QuestionIcon = createEveIconComponent({
  name: "Question Icon",
  variants: {
    castor: RheaImage,
    incarna: RheaImage,
    rhea: RheaImage,
  },
});
