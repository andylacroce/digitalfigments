// Best-effort OG/Twitter image: posts have no dedicated "featured image" field
// (most are a single photo/video anyway), so pull the first markdown image
// reference straight out of the raw MDX body instead of adding a new schema
// field just for this.
export function firstImagePath(rawBody: string): string | undefined {
  const match = rawBody.match(/!\[[^\]]*\]\(([^)\s]+)\)/);
  return match?.[1];
}
