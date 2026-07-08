/**
 * Frontend initializer for Ask AI block instances.
 */
import { applyFilters } from '@wordpress/hooks';

const BLOCK_SELECTOR = '[data-isfwp-ask-ai="mount"]';
const CONFIG_SELECTOR = '.isfwp-ask-ai-config';
const LIB_GLOBAL = 'SiteSearchSidepanelAskAI';

const parseConfig = ( mount ) => {
	const configNode = mount.querySelector( CONFIG_SELECTOR );
	if ( ! configNode ) {
		return null;
	}

	try {
		return JSON.parse( configNode.textContent || '{}' );
	} catch ( e ) {
		return null;
	}
};

const getLibrary = () => {
	const maybeLib = window?.[ LIB_GLOBAL ];
	return maybeLib && typeof maybeLib.init === 'function' ? maybeLib : null;
};

const buildInitOptions = ( config, mount ) => {
	let darkMode;
	if ( config.themeMode === 'dark' ) {
		darkMode = true;
	} else if ( config.themeMode === 'light' ) {
		darkMode = false;
	}

	const options = {
		container: mount,
		applicationId: config.applicationId,
		apiKey: config.apiKey,
		indexName: config.indexName,
		assistantId: config.assistantId,
		buttonText: config.buttonText || undefined,
		suggestedQuestionsEnabled: !! config.suggestedQuestionsEnabled,
		agentStudio: !! config.agentStudio,
		darkMode,
		triggerPosition:
			config.triggerPosition === 'inline' ? 'inline' : 'fixed',
	};

	return applyFilters( 'instantsearchForWP.askAIBlock.initOptions', options, {
		config,
		mount,
	} );
};

const canInitialize = ( config ) => {
	if ( ! config || typeof config !== 'object' ) {
		return false;
	}

	return !! (
		config.applicationId &&
		config.apiKey &&
		config.indexName &&
		config.assistantId
	);
};

const initMount = ( mount, library ) => {
	if ( mount.dataset.isfwpAskAiInitialized === '1' ) {
		return;
	}

	const config = parseConfig( mount );
	if ( ! canInitialize( config ) ) {
		return;
	}

	library.init( buildInitOptions( config, mount ) );
	mount.dataset.isfwpAskAiInitialized = '1';
};

const initializeAll = () => {
	const library = getLibrary();
	if ( ! library ) {
		return false;
	}

	const mounts = document.querySelectorAll( BLOCK_SELECTOR );
	mounts.forEach( ( mount ) => initMount( mount, library ) );

	return true;
};

const initializeWithRetry = ( triesLeft = 40 ) => {
	if ( initializeAll() || triesLeft <= 0 ) {
		return;
	}

	setTimeout( () => initializeWithRetry( triesLeft - 1 ), 100 );
};

const boot = () => {
	initializeWithRetry();
};

if ( document.readyState === 'loading' ) {
	document.addEventListener( 'DOMContentLoaded', boot );
} else {
	boot();
}
