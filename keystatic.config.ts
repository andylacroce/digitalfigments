import { config, fields, collection } from '@keystatic/core';
import { block } from '@keystatic/core/content-components';

// Keystatic requires an explicit component definition for any
// non-standard-markdown element (raw HTML tags included) used in MDX
// content, or opening that entry fails with "Missing component
// definition for X" — see MIGRATION.md for the audio/video/figcaption
// history behind this list.
const mdxComponents = {
  audio: block({
    label: 'Audio',
    schema: {
      src: fields.text({ label: 'Audio file URL' }),
      controls: fields.checkbox({ label: 'Show controls', defaultValue: true }),
    },
  }),
  video: block({
    label: 'Video',
    schema: {
      src: fields.text({ label: 'Video file URL' }),
      controls: fields.checkbox({ label: 'Show controls', defaultValue: true }),
    },
  }),
};

// Local dev uses `local` storage (reads/writes files on disk directly via
// `npm run dev`) since the GitHub OAuth App's callback URL only matches the
// production domain — a real GitHub login can't complete against localhost.
// Production uses `github` storage so content can be edited from the
// deployed site itself.
const storage = import.meta.env.DEV
  ? { kind: 'local' as const }
  : { kind: 'github' as const, repo: { owner: 'andylacroce', name: 'digitalfigments' } };

export default config({
  storage,
  ui: {
    brand: { name: 'Digital Figments' },
  },
  collections: {
    posts: collection({
      label: 'Posts',
      slugField: 'title',
      path: 'src/content/posts/*',
      format: { contentField: 'body' },
      schema: {
        title: fields.slug({ name: { label: 'Title' } }),
        date: fields.date({ label: 'Date', defaultValue: { kind: 'today' } }),
        body: fields.mdx({
          label: 'Content',
          options: {
            image: {
              directory: 'src/content/posts/images',
              publicPath: '/posts-media/',
            },
          },
          components: mdxComponents,
        }),
      },
    }),
    covers: collection({
      label: 'Covers (song archive)',
      slugField: 'song',
      path: 'src/content/covers/*',
      format: 'json',
      schema: {
        song: fields.slug({ name: { label: 'Song title' } }),
        artist: fields.text({ label: 'Original artist' }),
        date: fields.text({
          label: 'Date recorded',
          description: 'Free text — some originals only have an approximate year, e.g. "200_"',
        }),
        media: fields.conditional(
          fields.select({
            label: 'Media type',
            options: [
              { label: 'Audio file', value: 'audio' },
              { label: 'YouTube / video embed', value: 'embed' },
            ],
            defaultValue: 'audio',
          }),
          {
            audio: fields.file({
              label: 'Audio file',
              directory: 'public/covers-audio',
              publicPath: '/covers-audio/',
            }),
            embed: fields.url({ label: 'Video URL' }),
          }
        ),
        order: fields.integer({
          label: 'Sort order',
          description: 'Lower numbers appear first on the Covers page',
          defaultValue: 0,
        }),
      },
    }),
    pages: collection({
      label: 'Static pages',
      slugField: 'title',
      path: 'src/content/pages/*',
      format: { contentField: 'body' },
      schema: {
        title: fields.slug({ name: { label: 'Title' } }),
        date: fields.date({
          label: 'Date',
          description: 'Only used to order entries on /blog — leave blank for pages that aren\'t part of that section.',
          validation: { isRequired: false },
        }),
        body: fields.mdx({ label: 'Content', components: mdxComponents }),
      },
    }),
  },
});
