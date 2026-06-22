/**
 * Frontend initialization for InstantSearch block instances.
 *
 * Finds all .isfwp-block-instance containers on the page and initializes
 * a separate instantsearch() instance for each one, wiring up any child
 * widget containers found within.
 */

import instantsearch from 'instantsearch.js';
import { algoliasearch } from 'algoliasearch';
import { history as historyRouter } from 'instantsearch.js/es/lib/routers';
import { singleIndex } from 'instantsearch.js/es/lib/stateMappings';
import { applyFilters } from '@wordpress/hooks';
import {
	searchBox,
	hits,
	panel,
	refinementList,
	menuSelect,
	hitsPerPage,
	pagination,
	stats,
	sortBy,
	currentRefinements,
	clearRefinements,
	configure,
} from 'instantsearch.js/es/widgets';

const BLOCK_VISIBILITY_HIDE_CLASS_PREFIX = 'block-visibility-hide-';
const FACET_CLASS_PREFIX = 'facet-';

function parseRouteParamValue( value ) {
	if ( ! value ) {
		return value;
	}

	if ( ( value.startsWith( '{' ) && value.endsWith( '}' ) ) || ( value.startsWith( '[' ) && value.endsWith( ']' ) ) ) {
		try {
			return JSON.parse( value );
		} catch ( e ) {
			return value;
		}
	}

	return value;
}

function serializeRouteState( routeState ) {
	const params = new URLSearchParams();

	if ( ! routeState || typeof routeState !== 'object' ) {
		return params;
	}

	Object.entries( routeState ).forEach( ( [ key, value ] ) => {
		if ( value === undefined || value === null || value === '' ) {
			return;
		}

		if ( Array.isArray( value ) ) {
			value.forEach( ( item ) => {
				if ( item !== undefined && item !== null && item !== '' ) {
					params.append( key, String( item ) );
				}
			} );
			return;
		}

		if ( typeof value === 'object' ) {
			params.set( key, JSON.stringify( value ) );
			return;
		}

		params.set( key, String( value ) );
	} );

	return params;
}

function parseRouteStateFromHash( hash ) {
	const rawHash = typeof hash === 'string' ? hash : '';
	const normalizedHash = rawHash.startsWith( '#' ) ? rawHash.slice( 1 ) : rawHash;
	const hashPath = normalizedHash.startsWith( '/' ) ? normalizedHash.slice( 1 ) : normalizedHash;

	if ( ! hashPath ) {
		return {};
	}

	const params = new URLSearchParams( hashPath );
	const routeState = {};
	const keys = Array.from( new Set( Array.from( params.keys() ) ) );

	keys.forEach( ( key ) => {
		const values = params.getAll( key ).filter( ( value ) => value !== '' );
		if ( values.length === 0 ) {
			return;
		}

		routeState[ key ] = values.length === 1
			? parseRouteParamValue( values[ 0 ] )
			: values.map( ( value ) => parseRouteParamValue( value ) );
	} );

	return routeState;
}

function createHashRouter() {
	return historyRouter( {
		writeDelay: 400,
		createURL( { routeState, location } ) {
			const baseUrl = `${ location.pathname }${ location.search }`;
			const params = serializeRouteState( routeState );
			const hashPath = params.toString();

			return hashPath ? `${ baseUrl }#/${ hashPath }` : baseUrl;
		},
		parseURL( { location } ) {
			return parseRouteStateFromHash( location.hash );
		},
	} );
}

function isHiddenByBlockVisibility( element ) {
	if ( ! element || ! element.classList || typeof window === 'undefined' || ! document.body ) {
		return false;
	}

	const visibilityClasses = Array.from( element.classList ).filter( ( className ) =>
		className.startsWith( BLOCK_VISIBILITY_HIDE_CLASS_PREFIX )
	);

	if ( visibilityClasses.length === 0 ) {
		return false;
	}

	// Block Visibility uses CSS media queries for screen-size controls.
	// Probe those classes on a temporary element to determine current visibility.
	const probe = document.createElement( 'div' );
	probe.className = visibilityClasses.join( ' ' );
	probe.style.position = 'absolute';
	probe.style.visibility = 'hidden';
	probe.style.pointerEvents = 'none';
	document.body.appendChild( probe );

	const isHidden = window.getComputedStyle( probe ).display === 'none';
	probe.remove();

	return isHidden;
}

function getFacetPanelLabelMetadata( container, config, labelTargetSelector = '' ) {
	const instanceId = slugifyFacetClassPart(
		container.closest( '.isfwp-block-instance' )?.dataset.isfwpInstance || 'instance'
	);
	const widgetType = slugifyFacetClassPart( container.dataset.isfwpWidget || 'facet' );
	const attribute = slugifyFacetClassPart( config.attribute || 'attribute' );
	const baseId = [ 'isfwp', instanceId, widgetType, attribute ].filter( Boolean ).join( '-' );

	return {
		controlId: labelTargetSelector ? `${ baseId }-control` : '',
		labelId: `${ baseId }-label`,
		labelTargetSelector,
	};
}

function syncFacetPanelLabelWithControl( container ) {
	const labelTargetSelector = container.dataset.isfwpLabelTargetSelector || '';
	const controlId = container.dataset.isfwpLabelControlId || '';
	const labelId = container.dataset.isfwpLabelId || '';

	if ( ! labelTargetSelector || ! controlId || ! labelId ) {
		return;
	}

	const control = container.querySelector( labelTargetSelector );
	if ( ! control ) {
		return;
	}

	control.id = controlId;
	control.setAttribute( 'aria-labelledby', labelId );
}

function withFacetPanel( widgetFactory, container, config, widgetOptions, labelTargetSelector = '' ) {
	const label = config.label || config.attribute || '';
	const hideWhenEmpty = config.hideWhenEmpty !== false;
	const { controlId, labelId } = getFacetPanelLabelMetadata( container, config, labelTargetSelector );

	container.dataset.isfwpLabelId = labelId;
	container.dataset.isfwpLabelControlId = controlId;
	container.dataset.isfwpLabelTargetSelector = labelTargetSelector;

	return panel( {
		templates: {
			header( options, { html } ) {
				if ( controlId ) {
					return html`<label id="${ labelId }" for="${ controlId }">${ label }</label>`;
				}

				return html`<span id="${ labelId }">${ label }</span>`;
			},
		},
		hidden( options ) {
			return hideWhenEmpty && Array.isArray( options.items ) && options.items.length === 0;
		},
	} )( widgetFactory )( {
		container,
		...widgetOptions,
	} );
}

function hasFacetRefinements( refinements ) {
	if ( ! refinements || typeof refinements !== 'object' ) {
		return false;
	}

	return Object.values( refinements ).some( ( value ) => {
		if ( Array.isArray( value ) ) {
			return value.length > 0;
		}

		if ( value && typeof value === 'object' ) {
			return Object.keys( value ).length > 0;
		}

		return value !== undefined && value !== null && value !== '';
	} );
}

function hasNumericRefinements( refinements ) {
	if ( ! refinements || typeof refinements !== 'object' ) {
		return false;
	}

	return Object.values( refinements ).some( ( operators ) =>
		operators && typeof operators === 'object' && Object.values( operators ).some( ( values ) =>
			Array.isArray( values ) ? values.length > 0 : Boolean( values )
		)
	);
}

function hasActiveRefinements( state ) {
	if ( ! state || typeof state !== 'object' ) {
		return false;
	}

	if ( Array.isArray( state.tagRefinements ) && state.tagRefinements.length > 0 ) {
		return true;
	}

	if ( hasFacetRefinements( state.facetsRefinements ) ) {
		return true;
	}

	if ( hasFacetRefinements( state.disjunctiveFacetsRefinements ) ) {
		return true;
	}

	if ( hasFacetRefinements( state.hierarchicalFacetsRefinements ) ) {
		return true;
	}

	return hasNumericRefinements( state.numericRefinements );
}

function shouldRunSearch( state ) {
	const hasQuery = typeof state?.query === 'string' && state.query.trim().length > 0;

	return hasQuery || hasActiveRefinements( state );
}

function slugifyFacetClassPart( value ) {
	return String( value ?? '' )
		.toLowerCase()
		.trim()
		.replace( /[_\s]+/g, '-' )
		.replace( /[^a-z0-9-]+/g, '-' )
		.replace( /-+/g, '-' )
		.replace( /^-|-$/g, '' );
}

function addFacetClassesFromMap( classes, refinementsMap ) {
	if ( ! refinementsMap || typeof refinementsMap !== 'object' ) {
		return;
	}

	Object.entries( refinementsMap ).forEach( ( [ rawAttribute, rawValues ] ) => {
		const attributeSlug = slugifyFacetClassPart( rawAttribute );
		if ( ! attributeSlug ) {
			return;
		}

		const values = Array.isArray( rawValues ) ? rawValues : [ rawValues ];

		values.forEach( ( rawValue ) => {
			const valueSlug = slugifyFacetClassPart( rawValue );
			if ( valueSlug ) {
				classes.add( `${ FACET_CLASS_PREFIX }${ attributeSlug }-${ valueSlug }` );
			}
		} );
	} );
}

function getFacetRefinementClasses( state ) {
	const classes = new Set();

	addFacetClassesFromMap( classes, state?.facetsRefinements );
	addFacetClassesFromMap( classes, state?.disjunctiveFacetsRefinements );
	addFacetClassesFromMap( classes, state?.hierarchicalFacetsRefinements );

	if ( Array.isArray( state?.tagRefinements ) ) {
		state.tagRefinements.forEach( ( value ) => {
			const valueSlug = slugifyFacetClassPart( value );
			if ( valueSlug ) {
				classes.add( `${ FACET_CLASS_PREFIX }tag-${ valueSlug }` );
			}
		} );
	}

	return classes;
}

function updateFacetClassesOnContainer( container, state ) {
	const previousClasses = container._isfwpFacetClasses instanceof Set
		? container._isfwpFacetClasses
		: new Set();

	previousClasses.forEach( ( className ) => {
		container.classList.remove( className );
	} );

	const nextClasses = getFacetRefinementClasses( state );
	nextClasses.forEach( ( className ) => {
		container.classList.add( className );
	} );

	container._isfwpFacetClasses = nextClasses;
}

function ensureEmptySearchMessageElement( container, message, anchorElement ) {
	let messageEl = container.querySelector( '.isfwp-empty-search-message' );

	if ( ! messageEl ) {
		messageEl = document.createElement( 'div' );
		messageEl.className = 'isfwp-empty-search-message';
		messageEl.hidden = true;
		if ( anchorElement?.parentNode ) {
			anchorElement.parentNode.insertBefore( messageEl, anchorElement );
		} else {
			container.insertBefore( messageEl, container.firstChild );
		}
	}

	messageEl.textContent = message || 'Enter a search or add a filter to see results.';

	return messageEl;
}

function setEmptySearchMessageVisibility( container, isVisible, message, anchorElement ) {
	const messageEl = ensureEmptySearchMessageElement( container, message, anchorElement );

	if ( ! messageEl ) {
		return;
	}

	messageEl.hidden = ! isVisible;
	container.classList.toggle( 'isfwp-empty-search-active', isVisible );
}

/**
 * Widget factory map: data-isfwp-widget value → widget factory function.
 */
const WIDGET_FACTORIES = {
	searchBox( container, config ) {
		const debounce = Number.isFinite( Number( config.debounce ) )
			? Math.max( 0, Number( config.debounce ) )
			: 0;
		const searchBoxConfig = {
			container,
			placeholder: config.placeholder || 'Search…',
			autofocus: config.autofocus || false,
			showSubmit: config.showSubmit !== false,
			showReset: config.showReset !== false,
			searchAsYouType: debounce > 0,
		};

		if ( debounce > 0 ) {
			let debounceTimer;

			searchBoxConfig.queryHook = ( query, search ) => {
				window.clearTimeout( debounceTimer );
				debounceTimer = window.setTimeout( () => search( query ), debounce );
			};
		}

		return searchBox( {
			...searchBoxConfig,
		} );
	},

	hits( container, config ) {
		const instanceId = container.closest( '.isfwp-block-instance' )?.dataset.isfwpInstance || '';

		// Allow themes or companion plugins to augment each hit before templates render.
		// Global hook: isfwp.blockHit
		// Instance hook: isfwp.blockHit.{instanceId}
		const transformItems = ( items, { results } ) => items.map( ( hit, index ) => {
			const filterContext = {
				config,
				container,
				index,
				instanceId,
				results,
			};

			let transformedHit = applyFilters(
				'isfwp.blockHit',
				hit,
				filterContext
			);

			if ( instanceId ) {
				transformedHit = applyFilters(
					`isfwp.blockHit.${ instanceId }`,
					transformedHit,
					filterContext
				);
			}

			return transformedHit;
		} );

		// When a custom Mustache template string is provided, pass it directly —
		// InstantSearch.js natively renders string templates via Hogan/Mustache.
		const templates = config.hitTemplate
			? {
				item: config.hitTemplate,
				empty( results, { html } ) {
					return html`
						<div class="isfwp-hits-empty">
							No results for <strong>${ results.query }</strong>.
						</div>
					`;
				},
			}
			: {
				item( hit, { html, components } ) {
					const image = config.showImage && hit.image
						? html`<img src="${ hit.image }" alt="${ hit.title }" class="isfwp-hit-image" />`
						: '';
					return html`
						<article class="isfwp-hit" itemscope itemtype="https://schema.org/Article">
							${ image }
							<h3 class="isfwp-hit__title">
								<a href="${ hit.url }" itemprop="url">
									${ components.Highlight( { hit, attribute: 'title' } ) }
								</a>
							</h3>
							<p class="isfwp-hit__excerpt">
								${ components.Snippet( { hit, attribute: 'content' } ) }
							</p>
						</article>
					`;
				},
				empty( results, { html } ) {
					return html`
						<div class="isfwp-hits-empty">
							No results for <strong>${ results.query }</strong>.
						</div>
					`;
				},
			};

		return hits( { container, templates, transformItems } );
	},

	refinementList( container, config ) {
		return withFacetPanel( refinementList, container, config, {
			attribute: config.attribute || 'post_type',
			limit: config.limit || 10,
			showMore: config.showMore || false,
			showMoreLimit: config.showMoreLimit || 20,
			showCount: config.showCount !== false,
			sortBy: config.sortBy || [ 'isRefined', 'count:desc', 'name:asc' ],
		} );
	},

	menuSelect( container, config ) {
		return withFacetPanel( menuSelect, container, config, {
			attribute: config.attribute || 'post_type',
			limit: config.limit || 10,
			sortBy: config.sortBy || [ 'name:asc', 'count:desc' ],
		}, 'select' );
	},

	configure( container, config ) {
		if ( ! config || typeof config !== 'object' || Array.isArray( config ) ) {
			return null;
		}

		if ( Object.keys( config ).length === 0 ) {
			return null;
		}

		return configure( config );
	},

	hitsPerPage( container, config ) {
		const optionLabelSuffix = config.appendLabelToOptions && config.label
			? config.label.charAt( 0 ).toLowerCase() + config.label.slice( 1 )
			: '';

		const items = Array.isArray( config.items )
			? config.items.filter( ( item ) => Number.isFinite( Number( item?.value ) ) && Number( item.value ) > 0 ).map( ( item ) => {
				const baseLabel = item.label || String( item.value );

				return {
					label: optionLabelSuffix ? `${ baseLabel } ${ optionLabelSuffix }` : baseLabel,
					value: Number( item.value ),
					default: item.default === true,
				};
			} )
			: [];

		if ( items.length === 0 ) {
			return null;
		}

		return hitsPerPage( {
			container,
			items,
		} );
	},

	pagination( container, config ) {
		const widgetConfig = {
			container,
			padding: config.padding || 3,
		};

		if ( Number.isFinite( Number( config.totalPages ) ) ) {
			widgetConfig.totalPages = Number( config.totalPages );
		}

		return pagination( widgetConfig );
	},

	stats( container ) {
		return stats( { container } );
	},

	sortBy( container, config ) {
		return sortBy( {
			container,
			items: config.items || [],
		} );
	},

	currentRefinements( container, config ) {
		const excludedAttributes = Array.isArray( config.excludedAttributes )
			? config.excludedAttributes
			: [];

		return currentRefinements( {
			container,
			excludedAttributes,
		} );
	},

	clearRefinements( container, config ) {
		const widgetConfig = {
			container,
			templates: {
				resetLabel: config.buttonLabel || 'Clear refinements',
			},
		};

		if ( Array.isArray( config.includedAttributes ) ) {
			widgetConfig.includedAttributes = config.includedAttributes;
		}

		return clearRefinements( {
			...widgetConfig,
		} );
	},
};

/**
 * Initialize a single InstantSearch instance for one container element.
 *
 * @param {HTMLElement} container The .isfwp-block-instance element.
 */
function initInstance( container ) {
	if ( isHiddenByBlockVisibility( container ) ) {
		return;
	}

	const configEl = container.querySelector( '.isfwp-block-config' );
	if ( ! configEl ) return;

	let config;
	try {
		config = JSON.parse( configEl.textContent );
	} catch ( e ) {
		// eslint-disable-next-line no-console
		console.error( '[InstantSearch for WP] Failed to parse block config', e );
		return;
	}

	if ( ! config.appId || ! config.apiKey || ! config.indexName ) {
		// eslint-disable-next-line no-console
		console.warn(
			'[InstantSearch for WP] Missing appId, apiKey, or indexName for block instance:',
			config.instanceId
		);
		return;
	}

	const searchClient = algoliasearch( config.appId, config.apiKey );
	let hideResultsOnEmptySearch = false;
	let emptySearchMessage = 'Enter a search or add a filter to see results.';

	const hitsElements = Array.from( container.querySelectorAll( '[data-isfwp-widget="hits"]' ) );
	hitsElements.forEach( ( el ) => {
		if ( isHiddenByBlockVisibility( el ) || ! el.dataset.isfwpConfig ) {
			return;
		}

		try {
			const hitsConfig = JSON.parse( el.dataset.isfwpConfig );
			if ( hitsConfig.hideResultsOnEmptySearch ) {
				hideResultsOnEmptySearch = true;
				emptySearchMessage = hitsConfig.emptySearchMessage || emptySearchMessage;
			}
		} catch ( e ) {
			// ignore
		}
	} );

	const searchOptions = {
		indexName: config.indexName,
		searchClient,
		future: { preserveSharedStateOnUnmount: true },
	};

	if ( config.enableRouting !== false ) {
		searchOptions.routing = {
			router: createHashRouter(),
			stateMapping: singleIndex( config.indexName ),
		};
	}

	if ( ! hideResultsOnEmptySearch ) {
		const messageEl = container.querySelector( '.isfwp-empty-search-message' );
		if ( messageEl ) {
			messageEl.hidden = true;
		}
		container.classList.remove( 'isfwp-empty-search-active' );
		container.classList.remove( 'isfwp-hits-pending' );
	}

	const search = instantsearch( searchOptions );

	// Allow a child hits widget to override hitsPerPage at the widget level.
	let hitsPerPage = config.hitsPerPage || 20;
	hitsElements.forEach( ( el ) => {
		if ( isHiddenByBlockVisibility( el ) ) {
			return;
		}

		if ( el.dataset.isfwpConfig ) {
			try {
				const hitsConfig = JSON.parse( el.dataset.isfwpConfig );
				if ( hitsConfig.hitsPerPage ) {
					hitsPerPage = hitsConfig.hitsPerPage;
				}
			} catch ( e ) {
				// ignore
			}
		}
	} );

	// Build configure params from block config.
	const configureParams = {
		hitsPerPage,
		distinct: config.distinct !== undefined ? config.distinct : false,
		analytics: config.analytics !== false,
		clickAnalytics: config.clickAnalytics || false,
		highlightPreTag: config.highlightPreTag || '<mark>',
		highlightPostTag: config.highlightPostTag || '</mark>',
		attributesToSnippet: config.snippetAttributes?.length
			? config.snippetAttributes
			: [ 'content:50' ],
		snippetEllipsisText: '…',
	};

	if ( config.filters ) {
		configureParams.filters = config.filters;
	}
	if ( config.attributesToRetrieve?.length ) {
		configureParams.attributesToRetrieve = config.attributesToRetrieve;
	}
	if ( config.restrictSearchableAttributes?.length ) {
		configureParams.restrictSearchableAttributes = config.restrictSearchableAttributes;
	}

	// Base configure widget.
	const widgets = [
		configure( configureParams ),
	];

	// Discover and mount child widget containers.
	container.querySelectorAll( '[data-isfwp-widget]' ).forEach( ( el ) => {
		if ( isHiddenByBlockVisibility( el ) ) {
			return;
		}

		const widgetType = el.dataset.isfwpWidget;
		const factory = WIDGET_FACTORIES[ widgetType ];

		if ( ! factory ) return;

		let widgetConfig = {};
		if ( el.dataset.isfwpConfig ) {
			try {
				widgetConfig = JSON.parse( el.dataset.isfwpConfig );
			} catch ( e ) {
				// fall through with empty config
			}
		}

		const widget = factory( el, widgetConfig );
		if ( widget ) {
			widgets.push( widget );
		}
	} );

	search.addWidgets( widgets );

	search.on( 'render', () => {
		const state = search.helper?.state;
		const shouldHideEmptyState = hideResultsOnEmptySearch && ! shouldRunSearch( state );
		const isPendingRequest = hideResultsOnEmptySearch
			&& ! shouldHideEmptyState
			&& search.helper
			&& typeof search.helper.hasPendingRequests === 'function'
			&& search.helper.hasPendingRequests();
		const hitsAnchor = hitsElements[ 0 ] || null;

		setEmptySearchMessageVisibility( container, shouldHideEmptyState, emptySearchMessage, hitsAnchor );
		container.classList.toggle( 'isfwp-hits-pending', Boolean( isPendingRequest ) );
		container.querySelectorAll( '[data-isfwp-label-target-selector]' ).forEach( syncFacetPanelLabelWithControl );
		updateFacetClassesOnContainer( container, state );
	} );

	search.start();

	// Expose on the element for external access.
	container._isfwpSearch = search;
}

document.addEventListener( 'DOMContentLoaded', () => {
	document.querySelectorAll( '.isfwp-block-instance' ).forEach( initInstance );
} );
