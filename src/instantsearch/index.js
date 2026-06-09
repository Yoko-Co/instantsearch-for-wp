import './instantsearch.scss';

import A11yDialog from 'a11y-dialog';
import instantsearch from 'instantsearch.js';
import { algoliasearch } from 'algoliasearch';
import {
	chat,
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
			})(refinementList)({ container, attribute }),
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

	if (summaryController.isEnabled && search?.helper?.state) {
		const query = search.helper.state.query || '';
		const searchParameters = typeof search.helper.state.getQueryParams === 'function'
			? search.helper.state.getQueryParams()
			: {};
		const hasHits = Number(search?.helper?.lastResults?.nbHits || 0) > 0;

		if (hasHits) {
			summaryController.handleQueryChange(query, searchParameters);
		} else {
			summaryController.reset();
		}
	}
});

if ( instantSearchForWPFrontend.conversationalSearch ) {
	search.addWidgets([
		chat({
			container: '#algolia-chat',
			agentId: instantSearchForWPFrontend.conversationalSearch,
			templates: {
				item(hit, { html, components }) {
					return html`
						<p><strong><a href="${hit.url}">${hit.title}</a></strong><br />${components.Snippet({ attribute: 'content', hit })}</p>
					`;
				},
			},
			getSearchPageURL: () => {
				dialog.show();
				return '#search';
			},
		})
	]);
}

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

// Bind search trigger elements on click or focus
document.querySelectorAll(instantSearchForWPFrontend.searchTriggerQuerySelectors).forEach((el) => {
	el.addEventListener('click', (e) => {
		e.preventDefault();
		dialog.show();
	});
});

window.isfwpSiteSearch = { dialog, search };

