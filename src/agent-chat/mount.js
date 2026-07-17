/**
 * Shared DOM-mount helper for the agent-chat blocks.
 *
 * Each block's render.php outputs a wrapper carrying a JSON config script;
 * both view scripts call this with their root component. Config is validated
 * before mounting and exposed to themes through a JS filter.
 */

import { createRoot, createElement } from '@wordpress/element';
import { applyFilters } from '@wordpress/hooks';

const CONFIG_SELECTOR = '.isfwp-agent-chat-config';

const parseConfig = ( mount ) => {
	const node = mount.querySelector( CONFIG_SELECTOR );
	if ( ! node ) {
		return null;
	}

	try {
		return JSON.parse( node.textContent || '{}' );
	} catch ( e ) {
		return null;
	}
};

const canInitialize = ( config ) =>
	!! (
		config &&
		typeof config === 'object' &&
		config.appId &&
		config.apiKey &&
		config.agentId
	);

/**
 * Mount a chat component on every matching wrapper on the page.
 *
 * @param {Object}   options
 * @param {string}   options.selector  Wrapper selector (data attribute).
 * @param {Function} options.Component Root React component ({ config }).
 */
export const mountAgentChat = ( { selector, Component } ) => {
	const boot = () => {
		document.querySelectorAll( selector ).forEach( ( mount ) => {
			if ( mount.dataset.isfwpAgentChatInitialized === '1' ) {
				return;
			}

			let config = parseConfig( mount );

			/**
			 * EXTENSION POINT: 'instantsearchForWP.agentChat.config'
			 * Filters the frontend config before the chat mounts. Return a
			 * falsy value to prevent mounting.
			 */
			config = applyFilters(
				'instantsearchForWP.agentChat.config',
				config,
				{ mount }
			);

			if ( ! canInitialize( config ) ) {
				// DEBUG: a wrapper that renders but never mounts means the
				// config JSON is missing appId/apiKey/agentId.
				return;
			}

			mount.dataset.isfwpAgentChatInitialized = '1';

			createRoot( mount ).render(
				createElement( Component, { config } )
			);
		} );
	};

	if ( document.readyState === 'loading' ) {
		document.addEventListener( 'DOMContentLoaded', boot );
	} else {
		boot();
	}
};
