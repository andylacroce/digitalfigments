import { config, fields, collection } from '@keystatic/core';

export default config({
  storage: {
    kind: 'github',
    repo: { owner: 'andylacroce', name: 'digitalfigments' },
  },
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
        body: fields.mdx({ label: 'Content' }),
      },
    }),
  },
});
