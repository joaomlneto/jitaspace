import { inngest } from "../client";

export const test = inngest.createFunction(
  { name: "Import product images" },
  { event: "shop/product.imported" }, // The event that will trigger this function

  // This function will be called every time an event payload is received
  async ({ event, step }) => {
    return "IMPORTING PRODUCT IMAGE...";
  },
);
