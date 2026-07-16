import { createMagentoAdapter } from "./magento.js";

export const dentalSpeed = createMagentoAdapter({
  slug: "dental-speed",
  name: "Dental Speed",
  baseUrl: "https://www.dentalspeed.com",
});
