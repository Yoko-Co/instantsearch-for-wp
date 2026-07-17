/**
 * Streaming client for the Algolia Agent Studio completions endpoint.
 *
 * The endpoint speaks the ai-sdk v5 UI message stream over SSE when called
 * with `compatibilityMode=ai-sdk-5` (same protocol the AI summary feature in
 * src/instantsearch/ai-summary.js consumes). Auth is the search-only API key —
 * there is no Ask AI-style token handshake.
 *
 * DEBUG: set `window.ISFWP_AGENT_CHAT_DEBUG = true` before sending a message
 * to log every parsed stream part to the console.
 */

/**
 * Extract the appendable text from a single parsed stream part.
 *
 * Only `text-delta` parts contribute to the visible answer; reasoning and
 * tool parts are intentionally skipped so internal agent traffic never leaks
 * into the rendered response.
 *
 * @param {Object} part Parsed stream part.
 * @return {string} Text to append ('' when the part carries none).
 */
const getTextDelta = ( part ) => {
	if ( ! part || typeof part !== 'object' ) {
		return '';
	}

	if ( part.type === 'text-delta' && typeof part.delta === 'string' ) {
		return part.delta;
	}

	// Some protocol revisions emit whole-text parts instead of deltas.
	if ( part.type === 'text' && typeof part.text === 'string' ) {
		return part.text;
	}

	return '';
};

/**
 * Stream a completion from an Agent Studio agent.
 *
 * Async generator yielding `{ text }` snapshots where `text` is the full
 * accumulated answer so far — callers re-render with each snapshot rather
 * than stitching deltas themselves.
 *
 * @param {Object}      options
 * @param {string}      options.appId    Algolia application ID.
 * @param {string}      options.apiKey   Search-only API key.
 * @param {string}      options.agentId  Agent Studio agent ID.
 * @param {Array}       options.messages UI messages: { role, parts: [ { type: 'text', text } ] }.
 * @param {AbortSignal} options.signal   Abort signal for cancellation.
 */
export async function* streamAgentCompletion( {
	appId,
	apiKey,
	agentId,
	messages,
	signal,
} ) {
	const endpoint = `https://${ encodeURIComponent(
		appId
	) }.algolia.net/agent-studio/1/agents/${ encodeURIComponent(
		agentId
	) }/completions?stream=true&compatibilityMode=ai-sdk-5`;

	const response = await fetch( endpoint, {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
			Accept: 'text/event-stream',
			'X-Algolia-Application-Id': appId,
			'X-Algolia-API-Key': apiKey,
		},
		// The completions endpoint validates `algolia.searchParameters` against
		// a strict allow-list; send messages only and let the agent apply its
		// own configured search settings.
		body: JSON.stringify( { messages } ),
		signal,
	} );

	if ( ! response.ok || ! response.body ) {
		let detail = '';
		try {
			const errorBody = await response.json();
			detail = errorBody?.message || '';
		} catch ( e ) {
			// Non-JSON error body — the status code is all we have.
		}

		const error = new Error(
			detail || `Agent request failed (${ response.status }).`
		);
		error.status = response.status;
		throw error;
	}

	const isDebug = window?.ISFWP_AGENT_CHAT_DEBUG === true;
	const reader = response.body.getReader();
	const decoder = new TextDecoder();

	let buffer = '';
	let text = '';

	const consumeLine = ( rawLine ) => {
		const line = rawLine.trim();

		if ( ! line || ! line.startsWith( 'data:' ) ) {
			return null;
		}

		const data = line.replace( /^data:\s*/, '' ).trim();
		if ( ! data || data === '[DONE]' ) {
			return null;
		}

		try {
			return JSON.parse( data );
		} catch ( e ) {
			// Tolerate non-JSON protocol fragments rather than killing the stream.
			return null;
		}
	};

	const processBuffer = ( flush = false ) => {
		const normalized =
			flush && buffer && ! buffer.endsWith( '\n' )
				? `${ buffer }\n`
				: buffer;
		const lines = normalized.split( '\n' );
		buffer = flush ? '' : lines.pop() || '';

		let appended = false;
		for ( const rawLine of lines ) {
			const part = consumeLine( rawLine );
			if ( ! part ) {
				continue;
			}

			if ( isDebug ) {
				// eslint-disable-next-line no-console
				console.info(
					'[instantsearch-for-wp] agent stream part',
					part
				);
			}

			if ( part.type === 'error' ) {
				throw new Error(
					typeof part.errorText === 'string' && part.errorText
						? part.errorText
						: 'The agent reported an error.'
				);
			}

			const delta = getTextDelta( part );
			if ( delta ) {
				text += delta;
				appended = true;
			}
		}

		return appended;
	};

	while ( true ) {
		const { done, value } = await reader.read();
		if ( done ) {
			break;
		}

		buffer += decoder.decode( value, { stream: true } );
		if ( processBuffer( false ) ) {
			yield { text };
		}
	}

	buffer += decoder.decode();
	if ( processBuffer( true ) ) {
		yield { text };
	}
}
