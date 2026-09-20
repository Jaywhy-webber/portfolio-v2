import { defineCollection } from "astro:content";
import { glob } from "astro/loaders";
import { projectSchema } from "./schemas/projects";
import { experienceSchema } from "./schemas/experience";
import { researchSchema } from "./schemas/research";

const projects = defineCollection({
  loader: glob({ pattern: "**/*.md", base: "./src/content/projects" }),
  schema: projectSchema,
});

const readmes = defineCollection({
  loader: glob({ pattern: "**/*.md", base: "./src/content/readmes" }),
});

const experience = defineCollection({
  loader: glob({ pattern: "**/*.md", base: "./src/content/experience" }),
  schema: experienceSchema,
});

const research = defineCollection({
  loader: glob({ pattern: "**/*.md", base: "./src/content/research" }),
  schema: researchSchema,
});

export const collections = { projects, readmes, experience, research };
