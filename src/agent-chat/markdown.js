/**
 * Markdown → sanitized HTML for agent responses.
 *
 * Same approach as the AI summary feature: render with `marked`, then strip
 * everything outside a small allow-list so streamed model output can never
 * inject markup, styles, or scripts into the page.
 */

import { marked } from 'marked';

const ALLOWED_TAGS = new Set( [
	'P',
	'BR',
	'UL',
	'OL',
	'LI',
	'STRONG',
	'EM',
	'B',
	'I',
	'CODE',
	'PRE',
	'BLOCKQUOTE',
	'A',
	'H1',
	'H2',
	'H3',
	'H4',
	'H5',
	'H6',
	'TABLE',
	'THEAD',
	'TBODY',
	'TR',
	'TH',
	'TD',
] );

const ALLOWED_ATTRIBUTES = {
	A: new Set( [ 'href', 'target', 'rel' ] ),
};

/**
 * Escape a plain-text string for HTML output.
 *
 * @param {string} value Raw text.
 * @return {string} Escaped text.
 */
export const escapeHtml = ( value = '' ) =>
	value
		.replaceAll( '&', '&amp;' )
		.replaceAll( '<', '&lt;' )
		.replaceAll( '>', '&gt;' )
		.replaceAll( '"', '&quot;' )
		.replaceAll( "'", '&#039;' );

const sanitizeHtml = ( html ) => {
	const template = document.createElement( 'template' );
	template.innerHTML = html;

	const walker = document.createTreeWalker(
		template.content,
		window.NodeFilter.SHOW_ELEMENT
	);
	const elements = [];

	while ( walker.nextNode() ) {
		elements.push( walker.currentNode );
	}

	for ( const element of elements ) {
		const tagName = element.tagName;

		if ( ! ALLOWED_TAGS.has( tagName ) ) {
			// Unwrap: keep the children, drop the disallowed element itself.
			const parent = element.parentNode;
			if ( ! parent ) {
				continue;
			}

			while ( element.firstChild ) {
				parent.insertBefore( element.firstChild, element );
			}

			parent.removeChild( element );
			continue;
		}

		const allowedForTag = ALLOWED_ATTRIBUTES[ tagName ] || new Set();
		for ( const attr of [ ...element.attributes ] ) {
			if ( ! allowedForTag.has( attr.name ) ) {
				element.removeAttribute( attr.name );
			}
		}

		if ( tagName === 'A' ) {
			const href = ( element.getAttribute( 'href' ) || '' ).trim();
			if (
				! /^https?:\/\//i.test( href ) &&
				! href.startsWith( '/' ) &&
				! href.startsWith( '#' )
			) {
				element.removeAttribute( 'href' );
			}

			element.setAttribute( 'target', '_blank' );
			element.setAttribute( 'rel', 'noopener noreferrer' );
		}
	}

	return template.innerHTML;
};

/**
 * Render markdown to sanitized HTML.
 *
 * @param {string} text Markdown source.
 * @return {string} Sanitized HTML ('' for empty input).
 */
export const renderMarkdown = ( text ) => {
	if ( ! text ) {
		return '';
	}

	try {
		const rendered = marked.parse( text, {
			breaks: true,
			gfm: true,
		} );

		if ( typeof rendered !== 'string' ) {
			return `<p>${ escapeHtml( text ) }</p>`;
		}

		return sanitizeHtml( rendered );
	} catch ( error ) {
		return `<p>${ escapeHtml( text ) }</p>`;
	}
};
