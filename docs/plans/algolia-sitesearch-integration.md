# Plan: Add Algolia SiteSearch as a search-experience option

Status: **Phases 1–2 implemented** (2026-07-02); Phase 3 (Dropdown) deferred pending an upstream vanilla bundle
Author: Claude (research + plan), 2026-07-02

> Implementation notes (2026-07-02): `search_experience` + `sitesearch_options` shipped in `Settings.php` (with `get_search_experience()` runtime validation and `get_sitesearch_bundle()` mapping); bundles vendored via CopyWebpackPlugin to `build/sitesearch/` pinned at `@algolia/sitesearch@1.0.14` (`INSTANTSEARCH_FOR_WP_SITESEARCH_VERSION`); `SiteSearch.php` branches all three hooks and localizes `instantSearchForWPSiteSearch` for the glue script `src/sitesearch/frontend.js`; block `instantsearch-for-wp/search-button` conditionally registered in `Blocks.php`. Decisions taken: Ask-AI experiences **downgrade** to `sitesearch_modal` when no agent ID (a sanitize-callback `WP_Error` on the core settings endpoint corrupts the stored option — the pre-existing `ai_summaries` WP_Error path has the same latent bug and should be revisited); sidepanel initializes **alone** on the root mount (not paired with the modal); blocks render empty (not "missing") when the experience is switched off. Verified on a live sandbox WP install: settings round-trips, per-experience bundle enqueue + config, block gating/rendering, scaffold restoration on revert, and no admin-key leakage. Fast rebuild: `npx wp-scripts build --webpack-copy-php --config webpack.sitesearch.config.js`.
Context: add https://sitesearch.algolia.com/ experiences as alternatives to the plugin's current custom InstantSearch.js UI, selectable when "Enable Instant Search for WP site search" is on and the provider is Algolia.

## Decisions (resolved 2026-07-02)

| Question | Decision |
|---|---|
| Freemius gating | **Free for everyone.** No premium gating on search experiences. |
| Experiences in scope | **All four**: Search (Cmd+K modal), Search with Ask AI, Sidepanel Ask AI, Dropdown Search. Phased — see below. |
| Bundling | **Self-hosted.** Ship `@algolia/sitesearch` dist bundles from `build/`, never unpkg at runtime (version-locked, no third-party runtime dependency, wp.org-friendly). |

## Background

### What Algolia SiteSearch is (verified against `@algolia/sitesearch@1.0.14`)

Not a hosted service — an open-source library (github.com/algolia/sitesearch) of pre-built, opinionated search UIs on top of `react-instantsearch` 7 + Ask AI (`@ai-sdk/react`). Two consumption models:

1. **Vanilla/prebuilt bundles** (npm `@algolia/sitesearch`, `dist/`): standalone UMD bundles + CSS, React included, initialized with a single call. Verified contents of v1.0.14:
   - `search.min.js` / `.css` — global `SiteSearch`, `SiteSearch.init({...})` / `.destroy()`
   - `search-askai.min.js` / `.css` — global `SiteSearchAskAI`
   - `sidepanel-askai.min.js` / `.css` — global `SiteSearchSidepanelAskAI`
   - **There is no `dropdown-search` bundle** — Dropdown Search is currently shadcn/React-source-only (`npx shadcn add @algolia/dropdown-search`). Supporting it requires vendoring the component into our own React bundle (Phase 3).
2. **shadcn/React source components** — copy-into-your-repo model; requires React + Tailwind toolchain. Not our default path; only needed for Dropdown Search or deep customization.

Init API (all experiences share this shape; verified from docs + dist typings):

```js
SiteSearch.init( {
	container: '#isfwp-sitesearch-root',
	applicationId: 'APP_ID',
	apiKey: 'SEARCH_ONLY_KEY',       // must be the search-only key — public in page source
	indexName: 'localhost_search',
	attributes: {                     // HitsAttributesMapping
		primaryText: 'title',
		secondaryText: 'excerpt',
		tertiaryText: 'post_type',
		url: 'permalink',
		image: 'image',
	},
	placeholder: 'Search…',           // optional
	hitsPerPage: 10,                  // optional
	buttonText: 'Search',             // optional (modal experiences render their own trigger button)
	darkMode: false,                  // optional
	insights: true,                   // optional — Algolia Insights events
	searchParameters: {},             // optional — any Algolia search params (e.g. filters)
} );
```

`SiteSearchAskAI.init()` additionally takes `assistantId` (required — maps to our existing `algolia.ask_ai_agent_id`), `agentStudio?` (use Agent Studio completions instead of Ask AI endpoints), and `suggestedQuestionsEnabled?`. Behavior: Cmd+K/Ctrl+K shortcut, arrow-key navigation, WCAG-compliant. The default experiences have **no facet sidebar** — flatter than our current custom UI.

### Current codebase (verified 2026-07-02)

- `src/admin/components/SearchConfiguration.js` — shared by v1 admin and v2 admin (`src/admin-v2/pages/SearchSettingsPage.js` imports it), so one edit covers both dashboards. Owns the `use_as_sitesearch` toggle and the `sitesearch_settings` fields (placeholder, snippet length, sidebar position, badge, trigger selectors, debounce).
- `includes/Settings.php` — registers `instantsearch_for_wp_settings` with REST schema (`instantsearch_for_wp_settings()`), defaults (`get_default_settings()`), and `sanitize_settings()`.
- `includes/SiteSearch.php` — **naming collision**: this class implements the plugin's own site-search overlay, unrelated to Algolia's product. Hooks: `wp_footer` → `add_instantsearch_root_div()` (prints `#isfwp-site-search` scaffold: topbar/input/sidebar/hits/AI-summary + `#algolia-chat`) and `add_search_trigger_button()`; `wp_enqueue_scripts` → `enqueue_scripts()` (enqueues `build/instantsearch.js`, localizes `instantSearchForWPFrontend` from `get_instantsearch_config()`); filter `instantsearch_for_wp_search_trigger_query_selectors`.
- `src/instantsearch/index.js` — the hand-rolled widget tree (searchBox, infiniteHits, dynamicWidgets facet sidebar, stats, clearRefinements, poweredBy, custom `ai-summary.js`, a11y-dialog modal).
- `webpack.config.js` — entries: `admin`, `admin-v2`, `instantsearch`, `post-exclusion` (+ blocks via `getWebpackEntryPoints`). `webpack.admin-only.config.js` exists for fast admin iteration.
- Frontend Algolia credentials: `AlgoliaConnector::filter_instantsearch_config()` injects `appId` + **search-only** key from settings into the frontend config. SiteSearch experiences must use the same search-only key (never the admin key — the init options are visible in page source).
- Multi-index (added 2026-07-02): `use_as_sitesearch` may be a bool or an index slug; `Settings::get_index_name( $settings['use_as_sitesearch'] )` already resolves the right index. SiteSearch experiences target exactly one `indexName` — reuse this resolution untouched.

## Naming

Avoid "SiteSearch" for new PHP/JS identifiers — the name is taken by our own class. Setting key: `search_experience`, values:

- `instant_search` (default — current custom UI)
- `sitesearch_modal` (Search)
- `sitesearch_askai` (Search with Ask AI)
- `sitesearch_sidepanel` (Sidepanel Ask AI; can coexist conceptually with dropdown later)
- `sitesearch_dropdown` (Dropdown Search — Phase 3)

## Implementation

### Phase 1 — Search (Cmd+K modal) + plumbing

1. **Vendor the bundles.** `npm i @algolia/sitesearch --save-exact`. Add a `CopyWebpackPlugin` step (or `copy-sitesearch` npm script run inside `build`) copying `node_modules/@algolia/sitesearch/dist/{search,search-askai,sidepanel-askai}.min.{js,css}` (+ `.map` excluded) into `build/sitesearch/`. These are prebuilt UMDs — they are **not** webpack entries. Pin the version; upgrades are an explicit package.json bump.

2. **Settings schema (`includes/Settings.php`).**
   - `search_experience`: string enum (`instant_search`, `sitesearch_modal`, `sitesearch_askai`, `sitesearch_sidepanel`, `sitesearch_dropdown`), default `instant_search`.
   - `sitesearch_options` (object, applies to all SiteSearch experiences):
     - `placeholder_text` (string, default "Search…")
     - `button_text` (string, default "Search")
     - `hits_per_page` (int, default 10)
     - `dark_mode` (string enum `light|dark|auto`, default `light` — map `auto` to `prefers-color-scheme` at init time)
     - `insights` (bool, default true)
     - `suggested_questions_enabled` (bool, default true — Ask AI variants only)
     - `attributes` (object): `primary_text` (default `title`), `secondary_text` (default `excerpt`), `tertiary_text` (default `post_type`), `url` (default `permalink`), `image` (default `image`). Defaults must match the record shape produced by `AlgoliaConnector::format_post()` — **verify actual record field names during implementation** (e.g. whether the URL field is `permalink` or `url`, and the featured-image field name).
   - Leave existing `sitesearch_settings` untouched (only used by `instant_search` mode). Update defaults, REST schema, and `sanitize_settings()`.

3. **Admin UI (`src/admin/components/SearchConfiguration.js`).**
   - Under the existing enable toggle, add a "Search Experience" `SelectControl` bound to `search_experience`, rendered only when `provider === 'algolia'` (non-Algolia providers stay on `instant_search`; the option list should state this).
   - Existing "Sidebar Settings" block renders only for `instant_search`.
   - New "Algolia SiteSearch Options" block renders for `sitesearch_*` values: placeholder, button text, hits per page, dark mode, insights toggle, and an "Advanced: attribute mapping" panel (five text fields with sensible help text). For Ask AI variants, show the suggested-questions toggle plus a notice that the Ask AI Agent ID from Provider Setup is required (link to that screen if empty).
   - Note in the UI that facets/sidebar and AI summaries are features of the built-in experience and don't apply to SiteSearch modes.
   - No v2-specific work — v2 reuses this component.

4. **Frontend rendering (`includes/SiteSearch.php`).**
   - In the constructor (or an early `wp` hook), read `search_experience` and branch:
     - `instant_search`: current behavior, unchanged.
     - `sitesearch_*`: skip `add_instantsearch_root_div()` and the `instantsearch.js` enqueue entirely; instead print `<div id="isfwp-sitesearch-root"></div>` in `wp_footer` and enqueue `build/sitesearch/<experience>.min.js` + `.css` (no wp-scripts asset file — version with the pinned package version constant).
   - Build the init config server-side (new method `get_sitesearch_config()`): `applicationId` + search-only `apiKey` (reuse the same sourcing as `filter_instantsearch_config()`, constants override included), `indexName` via `Settings::get_index_name( $settings['use_as_sitesearch'] )`, snake→camel-mapped `sitesearch_options`, `assistantId` for Ask AI variants. Filter: `instantsearch_for_wp_sitesearch_config`.
   - Init via `wp_add_inline_script()` after the bundle: call `SiteSearch.init( config )` / `SiteSearchAskAI.init( config )` / `SiteSearchSidepanelAskAI.init( config )` depending on experience (guard with `typeof` check).
   - Hard fallback: if the experience is a `sitesearch_*` value but the provider isn't Algolia or the bundle file is missing, fall back to `instant_search` behavior and log a `_doing_it_wrong()`-style notice.

5. **Search Button Gutenberg block (primary trigger).** When a SiteSearch experience is active, editors place the library's *native* trigger button — the "Search ⌘K" button the vanilla bundle renders into its container — anywhere in their content via a new block:
   - New block `src/blocks/search-button/` following the existing block conventions (`block.json` apiVersion 3, `index.js`, `edit.js`, `render.php`). Name: `instantsearch-for-wp/search-button`, title "InstantSearch Search Button", icon `search`, category `instantsearch-for-wp`. Blocks auto-register from `build/blocks/*` (`includes/Blocks.php` scans the build dir), so no extra registration wiring is needed beyond the availability gate below.
   - Availability gate ("if SiteSearch is on"): only expose the block when `search_experience` is a `sitesearch_*` value. Implement in `Blocks.php` by skipping registration for this block when the experience is `instant_search` (per spec). Tradeoff to confirm during review: unregistered blocks already placed in content render as "missing block" in the editor if the admin later switches back — the safer alternative is to always register but have `render.php` degrade to a plain `.isfwp-search-trigger` button that opens the built-in dialog. Recommendation: graceful degradation; decide at implementation review.
   - `render.php` outputs an empty mount node, e.g. `<div class="isfwp-sitesearch-button" data-isfwp-sitesearch="button" data-button-text="…"></div>` (plus `useBlockProps` wrapper attrs). The frontend init script calls `SiteSearch.init()` / `SiteSearchAskAI.init()` **once per mount node**, so the library renders its own accessible button + ⌘K/Ctrl+K shortcut chip and modal — no synthetic events, no custom button markup to maintain.
   - Attributes (minimal): `buttonText` (string, default from `sitesearch_options.button_text`); block `supports`: spacing, alignment. `edit.js` renders a static, non-interactive preview of the button (search icon + text + `⌘K` kbd) with an InspectorControls text field — do not init the real bundle in the editor.
   - Fallback container: if a page contains no search-button block, `wp_footer` prints the default `#isfwp-sitesearch-root` mount (step 4) so the modal + shortcut still work site-wide. If one or more blocks are present, skip the footer button-only mount or init it headless — verify whether multiple `init()` calls create duplicate modals; if so, init only the first mount node and have additional block instances proxy-click the first button (`.click()` on the library's rendered button — same-library element, not a synthetic keyboard event).
   - Keyboard shortcut note: ⌘K/Ctrl+K binding ships inside the library bundle and works regardless of where the button lives.

6. **Legacy trigger-selector wiring.** The existing CSS-selector system (`.isfwp-search-trigger`, `trigger_selectors`) must keep working for theme buttons that can't become blocks (nav menus, page builders):
   - Keep `add_search_trigger_button()` (floating button) suppressed in SiteSearch modes — the block and/or footer mount replaces it.
   - Map clicks on configured trigger selectors to a `.click()` on the SiteSearch-rendered button element inside the nearest mount node. **Implementation risk — verify the rendered button is reliably targetable across bundle versions; if brittle, document that legacy selectors are unsupported in SiteSearch modes for v1 and steer users to the block.**

### Phase 2 — Ask AI variants (Search with Ask AI, Sidepanel Ask AI)

7. Mostly config: same plumbing, different bundle + global + `assistantId` (required — reuse `algolia.ask_ai_agent_id`; the admin UI should block selecting these experiences when it's empty). Expose `agent_studio` (bool, default false) in `sitesearch_options` for Agent Studio users. The search-button block from step 5 works unchanged — same mount-node contract, different init global.
8. The bundles call `askai.algolia.com` directly from the browser (unlike our existing server-side `/instantsearch-for-wp/v1/ask-ai` streaming proxy, which stays untouched for the `instant_search` experience). Ask AI validates request origins — **document that the site's origin must be allowlisted in the Algolia Ask AI dashboard config**, and add this to the admin help text.
9. Sidepanel Ask AI is not a search replacement; when selected, decide whether it renders **alongside** the default search experience or alone. Proposal: `sitesearch_sidepanel` renders the sidepanel plus the plain `sitesearch_modal` search, keeping "site search" functional. Confirm during implementation review.

### Phase 3 — Dropdown Search (custom bundle; optional, larger)

10. No vanilla dist exists. Options, in order of preference:
   1. Check newer `@algolia/sitesearch` releases for a `dropdown-search.min.js` (the library is young; this may appear upstream — cheapest path).
   2. Vendor the shadcn source (`dropdown-search.tsx` + hooks) into `src/sitesearch-dropdown/` as our own webpack entry with React externals to `wp-element` where possible; strip Tailwind/shadcn deps or compile them scoped. Nontrivial: the component assumes Tailwind tokens.
   3. Contribute a vanilla bundle upstream (PR to algolia/sitesearch) and consume it once released.
   - Dropdown targets an existing input in the theme (nav bar), so it also needs a "container selector" setting. Ship Phases 1–2 first; revisit scope before starting this.

### Compatibility & migration

- Default `search_experience = instant_search`: zero behavior change for existing installs.
- All experiences available on the free plan (per decision). If a paid differentiation is wanted later, gate via `Licensing::can_use_premium_code()` behind the `instantsearch_for_wp_allow_multiple_indexes`-style filter pattern — do not use `__premium_only` methods here since the code ships in both builds.
- The existing AI-summary controller, conversational `#algolia-chat`, facet sidebar, and `poweredBy` badge are features of the `instant_search` widget tree only. SiteSearch bundles include their own Algolia attribution; the `hide_algolia_badge` setting does not apply (note in UI help text).
- `readme.txt` / documentation site: document the new experiences and the search-only-key requirement.

### Testing

- **Sandbox/live:** use the sandbox WP recipe (static PHP + SQLite + symlinked plugin + real `.env` Algolia keys — see `sandbox-wp-testing` memory / `dev/` docs). Verify: settings round-trip via `/wp/v2/settings`; correct bundle + inline init in page source per experience; fallback path when bundle missing or provider ≠ algolia; search-only key (never admin key) in page source.
- **Docker:** extend `dev/fixtures/configure-plugin.sh` with a `SEARCH_EXPERIENCE` env toggle so `./dev.sh up` can boot into any mode.
- **e2e (Playwright, `tests/e2e`):** per experience — open modal (button + Cmd+K), type query, assert hits render from the real index, keyboard navigation, Escape closes; Ask AI variants smoke-tested only if the test app has an assistant configured (skip otherwise).
- **Search-button block:** insert the block in a test page (extend `gutenberg-blocks.spec.js` patterns); assert the library-rendered button + shortcut chip appears, opens the modal on click and on Cmd+K, and that a page with two block instances doesn't produce duplicate modals. Verify block availability follows the `search_experience` gate (or degrades gracefully, per the step 5 decision) and editor preview renders without initializing the bundle.
- **Regression:** full run of existing e2e to confirm `instant_search` mode untouched; `npm run build` (full) and PHPCS clean.

### Acceptance criteria

1. A site admin with Algolia configured can switch "Search Experience" to any of the three vanilla experiences from either dashboard (v1 or v2) and get a working search UI on the frontend without touching code.
2. Existing sites see no change until they opt in.
3. No runtime requests to unpkg/CDNs; all assets served from the plugin.
4. Admin API key never appears in frontend output.
5. Ask AI variants show a clear admin error state when the agent ID is missing.
6. When a SiteSearch experience is on, the "InstantSearch Search Button" block is available in the editor and renders the library's native button (with the ⌘K/Ctrl+K shortcut chip) wherever it is placed; multiple instances on one page don't create duplicate modals.

### Remaining open questions

- Block availability semantics (step 5): hard-unregister when `instant_search` is active (per spec) vs always-register with graceful degradation to a `.isfwp-search-trigger` button — decide at implementation review.
- Duplicate-mount behavior (step 5): confirm whether multiple `init()` calls yield independent modals or conflicts; pick the init-once + proxy-click strategy if needed.
- Legacy trigger selectors (step 6): confirm the SiteSearch-rendered button is reliably targetable for `.click()` proxying; otherwise document selectors as unsupported in SiteSearch modes for v1.
- Sidepanel pairing (step 9): sidepanel alone vs sidepanel + modal.
- Attribute defaults (step 2): confirm exact record field names from `AlgoliaConnector::format_post()` before setting defaults.
- Dropdown (Phase 3): reassess after Phases 1–2 ship; check upstream for a vanilla bundle first.

## Sources

- https://sitesearch.algolia.com/docs (Quickstart)
- https://sitesearch.algolia.com/docs/getting-started/vanilla
- https://sitesearch.algolia.com/docs/experiences/search
- https://sitesearch.algolia.com/docs/experiences/search-askai
- https://sitesearch.algolia.com/docs/experiences/dropdown-search
- https://github.com/algolia/sitesearch
- npm `@algolia/sitesearch@1.0.14` (dist contents + package.json verified locally, 2026-07-02)
- https://www.algolia.com/blog/product/introducing-sitesearch
