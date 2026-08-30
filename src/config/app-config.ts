import packageJson from "../../package.json";

const currentYear = new Date().getFullYear();

export const APP_CONFIG = {
  name: "PokeDen",
  version: packageJson.version,
  copyright: `© ${currentYear}, PokeDen.`,
  meta: {
    title: "PokeDen — Your study workspace",
    description: "Plan subjects, organize tasks and notes, and build focused study habits with PokeDen.",
  },
};
