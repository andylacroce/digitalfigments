import { config, fields, collection } from '@keystatic/core';
import { block } from '@keystatic/core/content-components';
import { createElement } from 'react';
import mediaTypes from './scripts/lib/media-types.json';

// Keystatic's file field accepts any file, but <video>/<audio> only play
// certain formats, so each block accepts just the types listed for it in
// scripts/lib/media-types.json (which also supplies the R2 content types).
//
// Keystatic only shows an error message for its own FieldDataError, which it
// doesn't export — a plain Error would silently block the dialog's Done
// button — so borrow the class from a validation it throws itself.
const FieldDataError = (() => {
  try {
    fields.text({ label: '', validation: { isRequired: true } }).validate('', undefined);
  } catch (e) {
    return (e as Error).constructor as new (message: string) => Error;
  }
  throw new Error('Could not find Keystatic FieldDataError');
})();

const extensionsOf = (types: Record<string, string>) => Object.keys(types).map((ext) => ext.slice(1));

function mediaFile(label: string, extensions: string[]) {
  const field = fields.file({
    label,
    directory: 'assets/media',
    publicPath: '/media/',
    validation: { isRequired: true },
  });
  type Value = Parameters<typeof field.validate>[0];
  const problem = (value: Value) =>
    value && !extensions.includes(value.extension.toLowerCase())
      ? `${label} must be ${extensions.map((e) => '.' + e).join(', ')} (got .${value.extension})`
      : null;
  return {
    ...field,
    // The stock input only flags "required"; show why a wrong file is rejected.
    Input(props: Parameters<typeof field.Input>[0]) {
      const message = problem(props.value);
      return createElement(
        'div',
        null,
        createElement(field.Input, props),
        message && createElement('p', { role: 'alert', style: { color: '#c0392b', marginTop: 8 } }, message)
      );
    },
    validate(value: Value) {
      const message = problem(value);
      if (message) throw new FieldDataError(message);
      return field.validate(value);
    },
  };
}

// Keystatic requires an explicit component definition for any
// non-standard-markdown element (raw HTML tags included) used in MDX
// content, or opening that entry fails with "Missing component
// definition for X". The file fields upload into assets/media/ like track
// audio does (see the tracks collection below), but Keystatic nests editor
// uploads under the post's slug: assets/media/<slug>/<file>, stored as
// '/media/<slug>/<file>'. Render-time mapping lives in src/components/mdx.ts.
const mdxComponents = {
  Audio: block({
    label: 'Audio',
    schema: {
      src: mediaFile('Audio file', extensionsOf(mediaTypes.audio)),
      controls: fields.checkbox({ label: 'Show controls', defaultValue: true }),
    },
  }),
  Video: block({
    label: 'Video',
    schema: {
      src: mediaFile('Video file', extensionsOf(mediaTypes.video)),
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
            // publicPath isn't a real URL — it's the string Keystatic prefixes
            // onto the filename when writing the MDX image reference. Posts
            // live flat in src/content/posts, so a relative './images/' here
            // produces a path Astro's build can resolve as a local import and
            // optimize (resize, WebP/AVIF, responsive srcset).
            image: {
              directory: 'src/content/posts/images',
              publicPath: './images/',
            },
          },
          components: mdxComponents,
        }),
      },
    }),
    tracks: collection({
      label: 'Tracks (covers, demos, a2z)',
      slugField: 'song',
      path: 'src/content/tracks/*',
      format: 'json',
      schema: {
        song: fields.slug({ name: { label: 'Song / track title' } }),
        section: fields.select({
          label: 'Section',
          description: 'Which page this track appears on',
          options: [
            { label: 'Covers', value: 'covers' },
            { label: 'Demos (originals)', value: 'demos' },
            { label: 'a2z Covers (2008)', value: 'a2z' },
          ],
          defaultValue: 'covers',
        }),
        artist: fields.text({
          label: 'Original artist',
          description: 'Leave blank for demos — those are originals, not covers',
        }),
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
            // Not under public/ — files here get swept into every Vercel
            // deployment forever (see README.md). scripts/sync-media.mjs
            // mirrors this directory to R2; mediaUrl() resolves the stored
            // '/media/...' path against the R2 bucket at render time. Same
            // assets/media directory as the post Video/Audio blocks above,
            // so the R2 layout stays one namespace.
            audio: fields.file({
              label: 'Audio file',
              directory: 'assets/media',
              publicPath: '/media/',
            }),
            embed: fields.url({ label: 'Video URL' }),
          }
        ),
        order: fields.integer({
          label: 'Sort order',
          description: 'Lower numbers appear first within this section',
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
        body: fields.mdx({ label: 'Content' }),
      },
    }),
  },
});
