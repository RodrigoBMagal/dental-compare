import { createMagentoAdapter } from "./magento.js";

export const dentalCremer = createMagentoAdapter({
  slug: "dental-cremer",
  name: "Dental Cremer",
  baseUrl: "https://www.dentalcremer.com.br",
});
