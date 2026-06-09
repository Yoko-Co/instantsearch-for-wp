import './instantsearch.scss';

import A11yDialog from 'a11y-dialog';
import instantsearch from 'instantsearch.js';
import { algoliasearch } from 'algoliasearch';
import {
	clearRefinements,
	configure,
	dynamicWidgets,
	infiniteHits,
	panel,
	poweredBy,
	refinementList,
	searchBox,
	stats
} from "instantsearch.js/es/widgets";
import { createAiSummaryController } from './ai-summary';
import { __ } from '@wordpress/i18n';
import { disableBodyScroll, enableBodyScroll } from 'body-scroll-lock'

const container = document.getElementById('isfwp-site-search');
const dialog = new A11yDialog(container);
let isInitialized = false;
let hasSubmittedSearch = false;

const summaryController = createAiSummaryController({
	container: document.getElementById('isfwp-site-search-summary'),
	frontendConfig: instantSearchForWPFrontend,
});

// Initiate InstantSearch instance
const search = instantsearch({
  indexName: instantSearchForWPFrontend.indexName,
  searchClient: algoliasearch(instantSearchForWPFrontend.appId, instantSearchForWPFrontend.apiKey),
  future: {
	preserveSharedStateOnUnmount: true,
  },
  attributesToSnippet: [`content:${instantSearchForWPFrontend?.sitesearchSettings?.snippet_length || 50}`],
});

let timerId;

const searchHitsContainer = container?.querySelector('#isfwp-site-search-hits');
const searchStatsContainer = container?.querySelector('#isfwp-site-search-stats');


const toggleSearchHitsVisibility = (shouldShowHits) => {
	if (searchHitsContainer) {
		searchHitsContainer.hidden = !shouldShowHits;
	}

	if (searchStatsContainer) {
		searchStatsContainer.hidden = !shouldShowHits;
	}
};

const hasActiveSearchState = (searchState) => {
	return Boolean(searchState?.query?.trim()) || hasActiveFacetFilters(searchState);
	};

const hasActiveFacetFilters = (searchState) => {
	if (!searchState) {
		return false;
	}

	return [
		searchState.facetsRefinements,
		searchState.disjunctiveFacetsRefinements,
		searchState.hierarchicalFacetsRefinements,
		searchState.numericRefinements,
		searchState.tagRefinements,
	].some((refinementGroup) => {
		if (Array.isArray(refinementGroup)) {
			return refinementGroup.length > 0;
		}

		if (!refinementGroup || 'object' !== typeof refinementGroup) {
			return false;
		}

		return Object.values(refinementGroup).some((value) => {
			if (Array.isArray(value)) {
				return value.length > 0;
			}

			if (value && 'object' === typeof value) {
				return Object.keys(value).length > 0;
			}

			return Boolean(value);
		});
	});
};

toggleSearchHitsVisibility(false);

// Add widgets and start the search
search.addWidgets([
	configure({
		distinct: true,
		attributesToSnippet: [`content:${instantSearchForWPFrontend?.sitesearchSettings?.snippet_length || 50}`],
		snippetEllipsisText: '…',
	}),
	// Add your widgets here
	infiniteHits({
		container: '#isfwp-site-search-hits',
		templates: {
			item(hit, { html, components }) {
				var response = html`
					<article class="hit-item postid-${hit.postID}" itemscope itemtype="https://schema.org/BlogPosting">
						<h5 class="hit-heading" itemprop="headline">
							<a href="${hit.url}" class="hit-title" itemprop="url">
								${components.Highlight({ attribute: 'title', hit })}
							</a>
						</h5>
						<p class="hit-content">
							${components.Snippet({ attribute: 'content', hit })}
						</p>
					</article>
				`;

				response = wp.hooks.applyFilters('isfwp.searchHitItem', response, hit, components);

				return response;
			}
		}
	}),
	// Add stats widgets.
	stats({
		container: '#isfwp-site-search-stats',
	}),
	// Clear refinements widget.
	clearRefinements({
		container: '#isfwp-site-search-clear-refinements',
		templates: {
			resetLabel: __( 'Clear All Filters', 'instantsearch-for-wp' ),
		}
	}),
	// Sidebar with dynamic widgets for facets controlled from Algolia Dashboard.
	dynamicWidgets({
		container: '#isfwp-site-search-sidebar',
		facets: ['*'], // Use all available facets
		fallbackWidget: ({ container, attribute }) =>
			panel({
				templates: {
					header: instantSearchForWPFrontend?.facetTitles[attribute] || attribute,
				},
				// Hide the widget if there are no items.
				hidden(options) {
					return options.items.length === 0;
				},
			})(refinementList)({
				attribute,
				container,
				showMore: true,
				limit: 10,
				showMoreLimit: 1000,
			}),
		// Widget overrides can be added here in the future.
		widgets: [],
	}),
	searchBox({
		container: '#isfwp-site-search-input',
		placeholder: instantSearchForWPFrontend?.sitesearchSettings?.placeholder_text || 'Search...',
		searchAsYouType: instantSearchForWPFrontend?.sitesearchSettings?.debounce_delay
				&& instantSearchForWPFrontend.sitesearchSettings.debounce_delay > 0 ? true : false, // Disable search as you type if debounce is enabled, we'll handle it in queryHook.
		showSubmit: true,
		showReset: true,
		showLoadingIndicator: true,
		queryHook(query, refine) {
			if (
				instantSearchForWPFrontend?.sitesearchSettings?.debounce_delay
				&& instantSearchForWPFrontend.sitesearchSettings.debounce_delay > 0
			) {
				clearTimeout(timerId);
				timerId = setTimeout(() => refine(query), instantSearchForWPFrontend.sitesearchSettings.debounce_delay);
			} else {
				refine(query);
			}
		},
	})
]);

if ( ! instantSearchForWPFrontend?.hidePoweredBy ) {
	search.addWidgets([
		poweredBy({
			container: '#isfwp-powered-by-algolia',
		})
	]);
}

// On search start, focus the search input.
search.on('render', () => {
	const searchInput = container.querySelector('#isfwp-site-search-input input');
	if (searchInput) {
		searchInput.focus();
	}

	const hasActiveSearch = hasActiveSearchState(search?.helper?.state);

	if (
		!hasSubmittedSearch
		&& hasActiveSearch
	) {
		hasSubmittedSearch = true;
	}

	const shouldShowHits = hasSubmittedSearch && hasActiveSearch;

	toggleSearchHitsVisibility(shouldShowHits);

	if (summaryController.isEnabled && search?.helper?.state) {
		const query = search.helper.state.query || '';
		const searchParameters = typeof search.helper.state.getQueryParams === 'function'
			? search.helper.state.getQueryParams()
			: {};
		const hasHits = Number(search?.helper?.lastResults?.nbHits || 0) > 0;

		if (shouldShowHits && hasHits) {
			summaryController.handleQueryChange(query, searchParameters);
		} else {
			summaryController.reset();
		}
	}
});

// chat widget disabled — not available in installed instantsearch.js version

// Initialize search on dialog show
dialog.on('show', async () => {
	if (!isInitialized) {
		await search.start();
		isInitialized = true;
	} else {
		const searchInput = container.querySelector('#isfwp-site-search-input input');
		if (searchInput) {
			setTimeout(() => {
				searchInput.focus();
			}, 100);
			// Direct focus without timeout doesn't work in some browsers
		}
	}

	disableBodyScroll(container);
});

// Enable body scroll on dialog hide
dialog.on('hide', () => {
	enableBodyScroll(container);
	hasSubmittedSearch = false;
	toggleSearchHitsVisibility(false);
	// Clear search state when dialog is closed
	if (search?.helper) {
		// Clear query + all facet/numeric/tag refinements + page back to 0
		search.helper.setQuery('').clearRefinements().setPage(0).search();
	}

	summaryController.reset();
});

// Bind close button
const closeButton = container.querySelector('.isfwp-site-search-close');
if (closeButton) {
	closeButton.addEventListener('click', () => {
		dialog.hide();
	});
}

container?.addEventListener('submit', (event) => {
	const searchForm = event.target;

	if (!(searchForm instanceof HTMLFormElement) || !searchForm.closest('#isfwp-site-search-input')) {
		return;
	}

	const formData = new FormData(searchForm);
	const query = String(formData.get('query') || '').trim();

	if ('' === query) {
		return;
	}

	hasSubmittedSearch = true;
	toggleSearchHitsVisibility(true);
});

// Bind search trigger elements on click or focus
document.querySelectorAll(instantSearchForWPFrontend.searchTriggerQuerySelectors).forEach((el) => {
	el.addEventListener('click', (e) => {
		e.preventDefault();
		dialog.show();
	});
});

window.isfwpSiteSearch = { dialog, search };

