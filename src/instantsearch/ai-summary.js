import { marked } from 'marked';
import { __ } from '@wordpress/i18n';

const ASK_AI_BASE_URL = 'https://askai.algolia.com';
const SUMMARY_PREFERENCE_KEY = 'isfwp_ai_summaries_enabled';

const extractSummaryText = (payload) => {
	if (!payload) {
		return '';
	}

	if (typeof payload === 'string') {
		return payload;
	}

	if (Array.isArray(payload)) {
		return payload.map(extractSummaryText).filter(Boolean).join(' ');
	}

	if (typeof payload !== 'object') {
		return '';
	}

	if (payload.type === 'text' && typeof payload.text === 'string') {
		return payload.text;
	}

	if (payload.type === 'text-delta' && typeof payload.delta === 'string') {
		return payload.delta;
	}

	if (payload.type === 'text' && typeof payload.content === 'string') {
		return payload.content;
	}

	if (typeof payload.text === 'string' && !payload.type) {
		return payload.text;
	}

	if (typeof payload.delta === 'string' && !payload.type) {
		return payload.delta;
	}

	if (typeof payload.textDelta === 'string' && !payload.type) {
		return payload.textDelta;
	}

	if (payload.message) {
		return extractSummaryText(payload.message);
	}

	if (payload.part) {
		return extractSummaryText(payload.part);
	}

	if (payload.parts) {
		return extractSummaryText(payload.parts);
	}

	return '';
};

const getErrorMessage = (error, fallback) => {
	if (error && typeof error === 'object' && typeof error.message === 'string' && error.message.trim()) {
		return error.message;
	}

	return fallback;
};

const escapeHtml = (value = '') => value
	.replaceAll('&', '&amp;')
	.replaceAll('<', '&lt;')
	.replaceAll('>', '&gt;')
	.replaceAll('"', '&quot;')
	.replaceAll("'", '&#039;');

const sanitizeSummaryHtml = (html) => {
	const template = document.createElement('template');
	template.innerHTML = html;

	const allowedTags = new Set([
		'P', 'BR', 'UL', 'OL', 'LI', 'STRONG', 'EM', 'B', 'I', 'CODE', 'PRE',
		'BLOCKQUOTE', 'A', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6',
	]);
	const allowedAttributes = {
		A: new Set(['href', 'target', 'rel']),
	};

	const walker = document.createTreeWalker(template.content, NodeFilter.SHOW_ELEMENT);
	const elements = [];

	while (walker.nextNode()) {
		elements.push(walker.currentNode);
	}

	for (const node of elements) {
		const element = node;
		const tagName = element.tagName;

		if (!allowedTags.has(tagName)) {
			const parent = element.parentNode;
			if (!parent) {
				continue;
			}

			while (element.firstChild) {
				parent.insertBefore(element.firstChild, element);
			}

			parent.removeChild(element);
			continue;
		}

		const allowedForTag = allowedAttributes[tagName] || new Set();
		for (const attr of [...element.attributes]) {
			if (!allowedForTag.has(attr.name)) {
				element.removeAttribute(attr.name);
			}
		}

		if (tagName === 'A') {
			const href = (element.getAttribute('href') || '').trim();
			if (!/^https?:\/\//i.test(href) && !href.startsWith('/') && !href.startsWith('#')) {
				element.removeAttribute('href');
			}

			element.setAttribute('target', '_blank');
			element.setAttribute('rel', 'noopener noreferrer');
		}
	}

	return template.innerHTML;
};

const formatSummaryMarkup = (text) => {
	if (!text) {
		return '';
	}

	try {
		const rendered = marked.parse(text, {
			breaks: true,
			gfm: true,
		});

		if (typeof rendered !== 'string') {
			return `<p>${escapeHtml(text)}</p>`;
		}

		return sanitizeSummaryHtml(rendered);
	} catch (error) {
		return `<p>${escapeHtml(text)}</p>`;
	}
};

const appendSummaryChunk = (chunk, currentText) => {
	if (!chunk) {
		return currentText;
	}

	let nextText = currentText;

	const appendText = (text) => {
		if (typeof text === 'string' && text.length > 0) {
			nextText += text;
		}
	};

	const lines = chunk.split('\n');

	for (const rawLine of lines) {
		const line = rawLine.trim();

		if (!line || line === '[DONE]' || line.startsWith(':') || line.startsWith('event:')) {
			continue;
		}

		if (line.startsWith('data:')) {
			const data = line.replace(/^data:\s*/, '').trim();
			if (!data || data === '[DONE]') {
				continue;
			}

			try {
				appendText(extractSummaryText(JSON.parse(data)));
			} catch (error) {
				// Ignore non-JSON protocol fragments.
			}

			continue;
		}

		const numericPrefixMatch = line.match(/^(\d+):(.*)$/);
		if (numericPrefixMatch) {
			const channel = parseInt(numericPrefixMatch[1], 10);
			const tokenChunk = numericPrefixMatch[2].trim();

			if (channel !== 0) {
				continue;
			}

			try {
				const parsedToken = JSON.parse(tokenChunk);
				appendText(typeof parsedToken === 'string' ? parsedToken : extractSummaryText(parsedToken));
			} catch (error) {
				// Ignore unparsable protocol chunks.
			}

			continue;
		}

		const alphaPrefixMatch = line.match(/^([a-zA-Z]):(.*)$/);
		if (alphaPrefixMatch) {
			const prefix = alphaPrefixMatch[1].toLowerCase();
			const payloadText = alphaPrefixMatch[2].trim();

			if (['a', 'd', 'e', 'f'].includes(prefix)) {
				continue;
			}

			if (prefix === 't') {
				try {
					const parsedToken = JSON.parse(payloadText);
					appendText(typeof parsedToken === 'string' ? parsedToken : extractSummaryText(parsedToken));
				} catch (error) {
					// Ignore unparsable protocol chunks.
				}
			}

			continue;
		}

		try {
			appendText(extractSummaryText(JSON.parse(line)));
		} catch (error) {
			// Ignore unknown lines to avoid tool payload leakage.
		}
	}

	return nextText;
};

const appendSummaryFromBuffer = (buffer, currentText, flush = false) => {
	if (!buffer) {
		return { nextText: currentText, remainder: '' };
	}

	const normalizedBuffer = flush && !buffer.endsWith('\n') ? `${buffer}\n` : buffer;
	const parts = normalizedBuffer.split('\n');
	const remainder = flush ? '' : (parts.pop() || '');

	let nextText = currentText;
	for (const part of parts) {
		nextText = appendSummaryChunk(part, nextText);
	}

	return { nextText, remainder };
};

export const createAiSummaryController = ({ container, frontendConfig }) => {
	const aiSummariesConfig = frontendConfig?.aiSummaries || {};
	const summaryDisclaimer = typeof aiSummariesConfig?.disclaimer === 'string'
		? aiSummariesConfig.disclaimer.trim()
		: '';
	const isEnabled =
		frontendConfig?.provider === 'algolia'
		&& !!aiSummariesConfig?.enabled
		&& !!aiSummariesConfig?.agentId
		&& !!frontendConfig?.appId
		&& !!frontendConfig?.apiKey
		&& !!frontendConfig?.indexName
		&& !!container;

	let summaryAbortController = null;
	let lastSummaryQuery = '';
	let summaryTimer = null;
	let summaryExpanded = false;
	let currentSummaryText = '';
	let activeQuery = '';
	let currentSummaryQuery = '';
	let userSummariesDisabled = false;

	try {
		userSummariesDisabled = window.localStorage.getItem(SUMMARY_PREFERENCE_KEY) === 'false';
	} catch (error) {
		userSummariesDisabled = false;
	}

	const setUserSummariesEnabled = (enabled) => {
		userSummariesDisabled = !enabled;

		try {
			window.localStorage.setItem(SUMMARY_PREFERENCE_KEY, enabled ? 'true' : 'false');
		} catch (error) {
			// Ignore storage errors in private browsing modes.
		}
	};

	const bindSummaryPreferenceToggles = () => {
		if (!container) {
			return;
		}

		const enableButton = container.querySelector('[data-isfwp-summary-enable]');
		if (enableButton) {
			enableButton.addEventListener('click', () => {
				setUserSummariesEnabled(true);
				summaryExpanded = false;
				lastSummaryQuery = '';

				if (activeQuery.trim().length >= 3 && currentSummaryQuery !== activeQuery) {
					requestSummary(activeQuery);
					return;
				}

				setSummaryState({ text: currentSummaryText });
			});
		}

		const disableButton = container.querySelector('[data-isfwp-summary-disable]');
		if (disableButton) {
			disableButton.addEventListener('click', () => {
				setUserSummariesEnabled(false);
				summaryExpanded = false;
				if (summaryAbortController) {
					summaryAbortController.abort();
					summaryAbortController = null;
				}
				setSummaryState();
			});
		}
	};

	const setSummaryState = ({ loading = false, text = '', error = '' } = {}) => {
		if (!container) {
			return;
		}

		if (userSummariesDisabled) {
			container.removeAttribute('hidden');
			container.innerHTML = `
				<div class="isfwp-site-search-summary__header">
					<p class="isfwp-site-search-summary__label">${__('AI Summary', 'instantsearch-for-wp')}</p>
					<button type="button" class="isfwp-site-search-summary__power-toggle" data-isfwp-summary-enable>
						${__('Turn summaries on', 'instantsearch-for-wp')}
					</button>
				</div>
				<div class="isfwp-site-search-summary__body">
					<p class="isfwp-site-search-summary__status">${__('AI summaries are turned off for this browser.', 'instantsearch-for-wp')}</p>
				</div>
			`;
			bindSummaryPreferenceToggles();
			return;
		}

		if (!loading && !text && !error) {
			summaryExpanded = false;
			currentSummaryText = '';
			currentSummaryQuery = '';
			container.innerHTML = '';
			container.setAttribute('hidden', 'hidden');
			return;
		}

		container.removeAttribute('hidden');

		if (loading) {
			summaryExpanded = false;
			currentSummaryText = '';
			currentSummaryQuery = '';
			container.innerHTML = `
				<p class="isfwp-site-search-summary__status">
					<span>${__('Generating summary', 'instantsearch-for-wp')}</span>
					<span class="isfwp-site-search-summary__dots" aria-hidden="true">
						<span></span><span></span><span></span>
					</span>
				</p>
			`;
			return;
		}

		if (error) {
			summaryExpanded = false;
			currentSummaryText = '';
			currentSummaryQuery = '';
			container.innerHTML = `<p class="isfwp-site-search-summary__status isfwp-site-search-summary__status--error">${error}</p>`;
			return;
		}

		currentSummaryText = text;
		currentSummaryQuery = activeQuery;
		const renderedText = formatSummaryMarkup(text);
		const contentStateClass = summaryExpanded
			? 'isfwp-site-search-summary__content--expanded'
			: 'isfwp-site-search-summary__content--collapsed';
		const toggleLabel = summaryExpanded
			? __('Collapse summary', 'instantsearch-for-wp')
			: __('Read full summary', 'instantsearch-for-wp');
		const disableLabel = __('Turn summaries off', 'instantsearch-for-wp');
		const disclaimerMarkup = summaryDisclaimer
			? `<p class="isfwp-site-search-summary__disclaimer">${escapeHtml(summaryDisclaimer)}</p>`
			: '';

		container.innerHTML = `
			<div class="isfwp-site-search-summary__header">
				<p class="isfwp-site-search-summary__label">${__('AI Summary', 'instantsearch-for-wp')}</p>
				<button
					type="button"
					class="isfwp-site-search-summary__power-toggle"
					data-isfwp-summary-disable
				>
					${disableLabel}
				</button>
			</div>
			<div class="isfwp-site-search-summary__body">
				<div class="isfwp-site-search-summary__content ${contentStateClass}">${renderedText}</div>
				${disclaimerMarkup}
				<div class="isfwp-site-search-summary__actions">
					<button
						type="button"
						class="isfwp-site-search-summary__toggle"
						aria-expanded="${summaryExpanded ? 'true' : 'false'}"
					>
						${toggleLabel}
					</button>
				</div>
			</div>
		`;

		const toggleButton = container.querySelector('.isfwp-site-search-summary__toggle');
		if (toggleButton) {
			toggleButton.addEventListener('click', () => {
				summaryExpanded = !summaryExpanded;
				setSummaryState({ text: currentSummaryText });
			});
		}

		bindSummaryPreferenceToggles();
	};

	const fetchToken = async (signal) => {
		const tokenResponse = await fetch(`${ASK_AI_BASE_URL}/chat/token`, {
			method: 'POST',
			headers: {
				'X-Algolia-Assistant-Id': aiSummariesConfig.agentId,
			},
			signal,
		});

		if (!tokenResponse.ok) {
			throw new Error(__('Unable to fetch Ask AI token.', 'instantsearch-for-wp'));
		}

		const tokenData = await tokenResponse.json();
		if (!tokenData?.success || !tokenData?.token) {
			throw new Error(tokenData?.message || __('Invalid Ask AI token response.', 'instantsearch-for-wp'));
		}

		return tokenData.token;
	};

	const requestSummary = async (query) => {
		if (!isEnabled) {
			return;
		}

		if (userSummariesDisabled) {
			setSummaryState();
			return;
		}

		if (summaryAbortController) {
			summaryAbortController.abort();
		}

		if (!query || query.trim().length < 3) {
			setSummaryState();
			return;
		}

		summaryAbortController = new AbortController();
		setSummaryState({ loading: true });

		try {
			const token = await fetchToken(summaryAbortController.signal);
			const now = Date.now();
			const chatId = `search-${now}`;

			const response = await fetch(`${ASK_AI_BASE_URL}/chat`, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					'Accept': 'text/event-stream',
					'X-Algolia-Application-Id': frontendConfig.appId,
					'X-Algolia-API-Key': frontendConfig.apiKey,
					'X-Algolia-Index-Name': frontendConfig.indexName,
					'X-Algolia-Assistant-Id': aiSummariesConfig.agentId,
					'X-AI-SDK-Version': 'v4',
					'Authorization': `TOKEN ${token}`,
				},
				body: JSON.stringify({
					id: chatId,
					messages: [
						{
							id: `message-${now}`,
							role: 'user',
							content: query,
						}
					],
					searchParameters: {
						distinct: true,
					},
				}),
				signal: summaryAbortController.signal,
			});

			if (!response.ok || !response.body) {
				throw new Error(__('Unable to fetch AI summary.', 'instantsearch-for-wp'));
			}

			let summaryText = '';
			let pendingBuffer = '';
			const reader = response.body.getReader();
			const decoder = new TextDecoder();

			while (true) {
				const { done, value } = await reader.read();
				if (done) {
					break;
				}

				pendingBuffer += decoder.decode(value, { stream: true });
				const parsed = appendSummaryFromBuffer(pendingBuffer, summaryText, false);
				summaryText = parsed.nextText;
				pendingBuffer = parsed.remainder;

				if (summaryText.trim()) {
					setSummaryState({ text: summaryText.trim() });
				}
			}

			pendingBuffer += decoder.decode();
			const finalParsed = appendSummaryFromBuffer(pendingBuffer, summaryText, true);
			summaryText = finalParsed.nextText;

			if (!summaryText.trim()) {
				setSummaryState({ error: __('No summary generated for this query.', 'instantsearch-for-wp') });
				return;
			}

			setSummaryState({ text: summaryText.trim() });
		} catch (error) {
			if (error?.name === 'AbortError') {
				return;
			}

			setSummaryState({
				error: getErrorMessage(error, __('Unable to generate AI summary right now.', 'instantsearch-for-wp')),
			});
		}
	};

	const handleQueryChange = (query) => {
		if (!isEnabled) {
			return;
		}

		activeQuery = query || '';

		if (userSummariesDisabled) {
			setSummaryState();
			return;
		}

		if (query === lastSummaryQuery) {
			if (currentSummaryQuery !== query) {
				requestSummary(query);
			}
			return;
		}

		summaryExpanded = false;
		lastSummaryQuery = query;

		if (summaryTimer) {
			clearTimeout(summaryTimer);
		}

		summaryTimer = setTimeout(() => {
			requestSummary(query);
		}, 250);
	};

	const reset = () => {
		if (summaryTimer) {
			clearTimeout(summaryTimer);
			summaryTimer = null;
		}

		if (summaryAbortController) {
			summaryAbortController.abort();
			summaryAbortController = null;
		}

		setSummaryState();
		lastSummaryQuery = '';
		activeQuery = '';
	};

	return {
		isEnabled,
		handleQueryChange,
		reset,
	};
};
