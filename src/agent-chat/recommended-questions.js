/**
 * Fetches the Algolia "Recommended Questions" configured for an assistant.
 *
 * Algolia stores questions published from the dashboard in the special
 * `algolia_ask_ai_suggested_questions` index, filtered by assistant ID —
 * the same source the official SiteSearch bundles read.
 *
 * DEBUG: verify what the index returns for an agent with:
 *   curl -s "https://<APP_ID>-dsn.algolia.net/1/indexes/algolia_ask_ai_suggested_questions/query" \
 *     -H "X-Algolia-Application-Id: <APP_ID>" -H "X-Algolia-API-Key: <SEARCH_KEY>" \
 *     -d '{"params":"filters=state%3Apublished%20AND%20assistantId%3A<AGENT_ID>"}'
 */

const QUESTIONS_INDEX = 'algolia_ask_ai_suggested_questions';

/**
 * Fetch published recommended questions for an agent.
 *
 * Resolves to an array of `{ id, question }`. Failures resolve to an empty
 * array — recommended questions are an enhancement, never worth breaking
 * the chat over.
 *
 * @param {Object}      options
 * @param {string}      options.appId   Algolia application ID.
 * @param {string}      options.apiKey  Search-only API key.
 * @param {string}      options.agentId Agent/assistant ID the questions belong to.
 * @param {number}      options.limit   Maximum questions to return.
 * @param {AbortSignal} options.signal  Optional abort signal.
 * @return {Promise<Array<{id: string, question: string}>>} Questions.
 */
export const fetchRecommendedQuestions = async ( {
	appId,
	apiKey,
	agentId,
	limit = 4,
	signal,
} ) => {
	if ( ! appId || ! apiKey || ! agentId ) {
		return [];
	}

	const endpoint = `https://${ encodeURIComponent(
		appId
	) }-dsn.algolia.net/1/indexes/${ QUESTIONS_INDEX }/query`;

	const params = new URLSearchParams( {
		query: '',
		hitsPerPage: String( limit ),
		filters: `state:published AND assistantId:${ agentId }`,
	} );

	try {
		const response = await fetch( endpoint, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				'X-Algolia-Application-Id': appId,
				'X-Algolia-API-Key': apiKey,
			},
			body: JSON.stringify( { params: params.toString() } ),
			signal,
		} );

		if ( ! response.ok ) {
			return [];
		}

		const data = await response.json();

		return ( Array.isArray( data?.hits ) ? data.hits : [] )
			.map( ( hit ) => ( {
				id: String( hit.objectID || hit.question || '' ),
				question:
					typeof hit.question === 'string' ? hit.question.trim() : '',
			} ) )
			.filter( ( item ) => item.question );
	} catch ( error ) {
		if ( error?.name !== 'AbortError' ) {
			// eslint-disable-next-line no-console
			console.error(
				'[instantsearch-for-wp] recommended questions fetch failed',
				error
			);
		}

		return [];
	}
};
