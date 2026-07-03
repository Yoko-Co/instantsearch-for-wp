---
sidebar_position: 3
---

# SiteSearch Filters

This page lists all filter hooks that can modify Algolia SiteSearch configuration.

## PHP filters (backend)

These run on the server before config is localized to the browser.

### instantsearch_for_wp_algolia_search_only_api_key

Purpose: Override the Algolia search-only API key used by SiteSearch.

Arguments:
- `$search_key` (string): Resolved search-only API key.

Return:
- string API key.

### instantsearch_for_wp_sitesearch_options

Purpose: Modify normalized SiteSearch options before frontend config assembly.

Arguments:
- `$options` (array): Parsed SiteSearch options.
- `$settings` (array): Full plugin settings.
- `$experience` (string): Active SiteSearch experience.

Return:
- array options.

### instantsearch_for_wp_sitesearch_attributes

Purpose: Modify raw SiteSearch attribute mapping before converting to frontend keys.

Arguments:
- `$attributes` (array): Raw SiteSearch attributes.
- `$options` (array): Parsed SiteSearch options.
- `$experience` (string): Active SiteSearch experience.

Return:
- array attributes.

### instantsearch_for_wp_sitesearch_config

Purpose: Final override of the full SiteSearch config payload sent to JS.

Arguments:
- `$config` (array): Final SiteSearch config.
- `$experience` (string): Active SiteSearch experience.

Return:
- array config.

### PHP example

```php
add_filter(
	'instantsearch_for_wp_sitesearch_options',
	function ( $options, $settings, $experience ) {
		$options['hits_per_page'] = 12;
		$options['placeholder_text'] = 'Search docs and posts...';
		return $options;
	},
	10,
	3
);

add_filter(
	'instantsearch_for_wp_sitesearch_config',
	function ( $config, $experience ) {
		$config['triggerSelectors'] = '.my-search-open';
		return $config;
	},
	10,
	2
);
```

## JavaScript filters (frontend)

These run in the browser via `@wordpress/hooks` before SiteSearch initializes.

### instantsearchForWP.siteSearch.config

Purpose: Override localized runtime config object.

Arguments:
- `config` (Object): Localized SiteSearch config.
- `context` (Object): `{ window, document }`.

Return:
- Object config.

### instantsearchForWP.siteSearch.primaryMount

Purpose: Override the selected primary mount element used for SiteSearch init.

Arguments:
- `primaryMount` (Element|null): Derived mount node.
- `context` (Object): `{ config, isSidepanel, blockMounts, rootMount }`.

Return:
- Element mount node.

### instantsearchForWP.siteSearch.initOptions

Purpose: Modify final options passed to `SiteSearch*.init(...)`.

Arguments:
- `options` (Object): Final init options.
- `context` (Object): `{ config, mount, buttonText }`.

Return:
- Object init options.

### instantsearchForWP.siteSearch.triggerSelectors

Purpose: Modify selectors used to proxy legacy triggers to the SiteSearch button.

Arguments:
- `selectors` (Array&lt;string&gt;): Default selector list.
- `context` (Object): `{ config }`.

Return:
- Array&lt;string&gt; or string selector list.

### JavaScript example

```js
wp.hooks.addFilter(
	'instantsearchForWP.siteSearch.initOptions',
	'my-plugin/sitesearch-init-options',
	(options, context) => {
		return {
			...options,
			hitsPerPage: 15,
		};
	}
);

wp.hooks.addFilter(
	'instantsearchForWP.siteSearch.triggerSelectors',
	'my-plugin/sitesearch-triggers',
	(selectors) => [ ...selectors, '.my-search-open' ]
);
```
