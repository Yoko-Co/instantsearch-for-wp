/**
 * Algolia SiteSearch glue script.
 *
 * Responsibilities:
 * - Initialize the vendored SiteSearch experience bundle exactly once, on the
 *   first Search Button block mount if present, otherwise on the footer root.
 * - Mirror the library-rendered native button (with its ⌘K/Ctrl+K shortcut
 *   chip) into any additional block mounts; clicks proxy to the real button.
 * - Map legacy trigger selectors (`.isfwp-search-trigger` + the configured
 *   CSS selectors) to the real button.
 * - Resolve `darkMode: "auto"` via prefers-color-scheme.
 *
 * The library bundle (global `SiteSearch`, `SiteSearchAskAI`, or
 * `SiteSearchSidepanelAskAI`) is enqueued as a dependency of this script.
 */

import './override.css';
import { applyFilters } from '@wordpress/hooks';

const config = window.instantSearchForWPSiteSearch || null;

const BLOCK_MOUNT_SELECTOR = '[data-isfwp-sitesearch="button"]';
const ROOT_MOUNT_SELECTOR = '[data-isfwp-sitesearch="root"]';
const LEGACY_TRIGGER_SELECTOR = '.isfwp-search-trigger';

/**
 * Resolve the library global for the active experience.
 *
 * @return {Object|null} The experience module with an init() method.
 */
const getLibrary = ( runtimeConfig ) => {
	const lib = runtimeConfig?.jsGlobal ? window[ runtimeConfig.jsGlobal ] : null;
	return lib && typeof lib.init === 'function' ? lib : null;
};

/**
 * Resolve darkMode setting to the boolean the library expects.
 *
 * @return {boolean} Whether dark mode should be enabled.
 */
const resolveDarkMode = ( runtimeConfig ) => {
	if ( runtimeConfig.darkMode === 'auto' ) {
		return !! window.matchMedia?.( '(prefers-color-scheme: dark)' )?.matches;
	}
	return runtimeConfig.darkMode === 'dark';
};

/**
 * Build the init options for the library from localized config.
 *
 * @param {Element} mount      Mount node to render into.
 * @param {string}  buttonText Button label for this mount.
 * @return {Object} Init options.
 */
const buildInitOptions = ( runtimeConfig, mount, buttonText ) => {
	const options = {
		container: mount,
		applicationId: runtimeConfig.applicationId,
		apiKey: runtimeConfig.apiKey,
		indexName: runtimeConfig.indexName,
		attributes: runtimeConfig.attributes,
		placeholder: runtimeConfig.placeholder || undefined,
		// wp_localize_script stringifies top-level scalars.
		hitsPerPage: parseInt( runtimeConfig.hitsPerPage, 10 ) || undefined,
		buttonText: buttonText || runtimeConfig.buttonText || undefined,
		darkMode: resolveDarkMode( runtimeConfig ),
		insights: !! runtimeConfig.insights,
	};

	if ( runtimeConfig.assistantId ) {
		options.assistantId = runtimeConfig.assistantId;
		options.agentStudio = !! runtimeConfig.agentStudio;
		options.suggestedQuestionsEnabled = !! runtimeConfig.suggestedQuestionsEnabled;
	}

	return applyFilters(
		'instantsearchForWP.siteSearch.initOptions',
		options,
		{
			config: runtimeConfig,
			mount,
			buttonText,
		}
	);
};

/**
 * Find the library-rendered trigger button inside the initialized mount.
 *
 * @param {Element} mount Initialized mount node.
 * @return {HTMLButtonElement|null} The native SiteSearch button.
 */
const findNativeButton = ( mount ) => mount.querySelector( 'button' );

/**
 * Mirror the native button into an extra block mount; clicking the mirror
 * proxies to the real button so only one modal instance ever exists.
 *
 * @param {Element} mount         Extra block mount node.
 * @param {Element} nativeButton  The real library-rendered button.
 */
const mirrorButton = ( mount, nativeButton ) => {
	const clone = nativeButton.cloneNode( true );
	const label = mount.getAttribute( 'data-button-text' );

	if ( label ) {
		// Replace the first text node inside the clone with the per-block label.
		const walker = document.createTreeWalker( clone, NodeFilter.SHOW_TEXT );
		const textNode = walker.nextNode();
		if ( textNode ) {
			textNode.textContent = label;
		}
	}

	clone.addEventListener( 'click', ( event ) => {
		event.preventDefault();
		nativeButton.click();
	} );

	mount.appendChild( clone );
};

/**
 * Wire legacy trigger selectors to the native button via event delegation.
 *
 * @param {Function} getButton Lazily resolves the native button.
 */
const wireLegacyTriggers = ( runtimeConfig, getButton ) => {
	const custom = ( runtimeConfig.triggerSelectors || '' )
		.split( ',' )
		.map( ( selector ) => selector.trim() )
		.filter( Boolean );

	const filteredSelectors = applyFilters(
		'instantsearchForWP.siteSearch.triggerSelectors',
		[ LEGACY_TRIGGER_SELECTOR, ...custom ],
		{
			config: runtimeConfig,
		}
	);

	const selectors = Array.isArray( filteredSelectors )
		? filteredSelectors.filter( Boolean ).join( ',' )
		: String( filteredSelectors || '' );

	if ( ! selectors ) {
		return;
	}

	document.addEventListener( 'click', ( event ) => {
		const trigger = event.target?.closest?.( selectors );
		if ( ! trigger ) {
			return;
		}

		// Ignore clicks inside SiteSearch's own UI.
		if ( trigger.closest( BLOCK_MOUNT_SELECTOR ) || trigger.closest( ROOT_MOUNT_SELECTOR ) ) {
			return;
		}

		const button = getButton();
		if ( button ) {
			event.preventDefault();
			button.click();
		}
	} );
};

const init = () => {
	const runtimeConfig = applyFilters(
		'instantsearchForWP.siteSearch.config',
		config || {},
		{
			window,
			document,
		}
	);

	const library = getLibrary( runtimeConfig );
	if ( ! runtimeConfig || ! library || ! runtimeConfig.applicationId || ! runtimeConfig.apiKey || ! runtimeConfig.indexName ) {
		return;
	}

	const blockMounts = Array.from( document.querySelectorAll( BLOCK_MOUNT_SELECTOR ) );
	const rootMount = document.querySelector( ROOT_MOUNT_SELECTOR );

	// The sidepanel experience renders a floating panel; always init it on
	// the root mount and leave button mounts to the search experiences.
	const isSidepanel = runtimeConfig.experience === 'sitesearch_sidepanel';

	const derivedPrimaryMount = isSidepanel
		? rootMount
		: blockMounts[ 0 ] || rootMount;

	const primaryMount = applyFilters(
		'instantsearchForWP.siteSearch.primaryMount',
		derivedPrimaryMount,
		{
			config: runtimeConfig,
			isSidepanel,
			blockMounts,
			rootMount,
		}
	);

	if ( ! primaryMount ) {
		return;
	}

	// Hide the fallback root when a block hosts the button instead.
	if ( ! isSidepanel && blockMounts.length > 0 && rootMount ) {
		rootMount.hidden = true;
	}

	library.init(
		buildInitOptions(
			runtimeConfig,
			primaryMount,
			primaryMount.getAttribute?.( 'data-button-text' ) || ''
		)
	);

	const getNativeButton = () => findNativeButton( primaryMount );

	// Mirror the native button into any additional block mounts.
	if ( ! isSidepanel ) {
		const nativeButton = getNativeButton();
		if ( nativeButton ) {
			blockMounts.slice( 1 ).forEach( ( mount ) => mirrorButton( mount, nativeButton ) );
		}
	}

	wireLegacyTriggers( runtimeConfig, getNativeButton );
};

if ( document.readyState === 'loading' ) {
	document.addEventListener( 'DOMContentLoaded', init );
} else {
	init();
}
