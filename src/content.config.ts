import { defineCollection, z } from "astro:content";
import { glob } from "astro/loaders";

const posts = defineCollection({
  loader: glob({ pattern: "**/*.mdx", base: "./src/content/posts" }),
  schema: z.object({
    title: z.string(),
    date: z.coerce.date(),
    category: z.enum(["images", "video", "music", "gif", "text"]),
  }),
});

const covers = defineCollection({
  loader: glob({ pattern: "**/*.json", base: "./src/content/covers" }),
  schema: z.object({
    song: z.string(),
    artist: z.string(),
    date: z.string(),
    media: z.discriminatedUnion("discriminant", [
      z.object({ discriminant: z.literal("audio"), value: z.string() }),
      z.object({ discriminant: z.literal("embed"), value: z.string() }),
    ]),
    order: z.number(),
  }),
});

const pages = defineCollection({
  loader: glob({ pattern: "**/*.mdx", base: "./src/content/pages" }),
  schema: z.object({
    title: z.string(),
  }),
});

export const collections = { posts, covers, pages };
