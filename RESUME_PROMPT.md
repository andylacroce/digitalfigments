Paste this into a fresh Claude Code session opened in D:\digitalfigments:

---

I'm migrating digitalfigments.com off self-hosted WordPress (still running in
production at D:\wordpress on my desktop — do not touch it, and do not make any
DNS or production changes without my explicit approval) to a new stack: Astro +
Keystatic (git-backed CMS, no database/server), deployed on Vercel.

Read MIGRATION.md first — it has full context on the decision, what's already
done (all 36 posts, the covers song archive, and remaining static pages are
converted and committed; the build passes locally), and a prioritized list of
what's left. Pick up from the "Known rough edges / not yet done" section.

The highest-priority items, roughly in order:
1. Verify Keystatic's admin UI actually works: `npm run dev`, open /keystatic,
   confirm the posts/covers/pages collections load and that edits save correctly
   against the real content files.
2. Switch Keystatic storage from `local` to `github` mode so content can be
   edited from the deployed site (this is what replaces posting-from-phone via
   the old WordPress app) — needs a GitHub OAuth App, which needs my login, so
   loop me in for that step.
3. Create the Vercel project and deploy to a preview URL (not production).
4. Export the old site's URL redirect list (Redirection plugin, in
   D:\wordpress) and build the equivalent vercel.json redirects.
5. Resolve the two flagged content decisions in MIGRATION.md (job-stuff page,
   obamas-audacity page) with me before finalizing nav.

Don't cut over DNS or decommission the WordPress box until I say so explicitly.
