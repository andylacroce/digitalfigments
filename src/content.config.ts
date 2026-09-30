import { defineCollection } from "astro:content";
import { z } from "astro/zod";
import { glob } from "astro/loaders";

const posts = defineCollection({
  loader: glob({ pattern: "**/*.mdx", base: "./src/content/posts" }),
  schema: z.object({
    title: z.string(),
    date: z.coerce.date(),
  }),
});

const tracks = defineCollection({
  loader: glob({ pattern: "**/*.json", base: "./src/content/tracks" }),
  schema: z.object({
    song: z.string(),
    section: z.enum(["covers", "demos", "a2z"]),
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

export const collections = { posts, tracks, pages };
