import { createEveIconComponent } from "../createIconComponent";
import RheaImage from "./rhea.png";

export const TrainingQueueIcon = createEveIconComponent({
  name: "Training Queue Icon",
  variants: {
    castor: RheaImage,
    incarna: RheaImage,
    rhea: RheaImage,
  },
});
