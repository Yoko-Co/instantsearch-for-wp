/**
 * Floating chatbot wrapper around the AgentChat surface.
 *
 * Renders a fixed launcher button; clicking it opens a panel containing the
 * same chat component the inline block uses. Escape and the header button
 * close it. Runtime state (the conversation) survives open/close because the
 * panel is hidden, not unmounted.
 */

import { useEffect, useRef, useState } from '@wordpress/element';
import { __ } from '@wordpress/i18n';

import AgentChat from './AgentChat';

const ChatIcon = () => (
	<svg
		viewBox="0 0 24 24"
		width="22"
		height="22"
		fill="none"
		stroke="currentColor"
		strokeWidth="2"
		strokeLinecap="round"
		strokeLinejoin="round"
		aria-hidden="true"
	>
		<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
	</svg>
);

const CloseIcon = () => (
	<svg
		viewBox="0 0 24 24"
		width="20"
		height="20"
		fill="none"
		stroke="currentColor"
		strokeWidth="2"
		strokeLinecap="round"
		strokeLinejoin="round"
		aria-hidden="true"
	>
		<path d="M18 6 6 18" />
		<path d="m6 6 12 12" />
	</svg>
);

/**
 * @param {Object} props
 * @param {Object} props.config Frontend config; adds `buttonText`,
 *                              `panelTitle`, and `position` on top of the
 *                              shared chat config.
 */
const AgentChatPopup = ( { config } ) => {
	const [ isOpen, setIsOpen ] = useState( false );
	const panelRef = useRef( null );
	const triggerRef = useRef( null );

	const buttonText =
		config.buttonText || __( 'Ask AI', 'instantsearch-for-wp' );
	const panelTitle = config.panelTitle || buttonText;
	const position =
		config.position === 'bottom-left' ? 'bottom-left' : 'bottom-right';

	useEffect( () => {
		if ( ! isOpen ) {
			return undefined;
		}

		const onKeyDown = ( event ) => {
			if ( event.key === 'Escape' ) {
				setIsOpen( false );
				triggerRef.current?.focus();
			}
		};

		document.addEventListener( 'keydown', onKeyDown );

		// Hand focus to the chat input when the panel opens.
		const input = panelRef.current?.querySelector(
			'.isfwp-agent-chat__input'
		);
		input?.focus();

		return () => document.removeEventListener( 'keydown', onKeyDown );
	}, [ isOpen ] );

	return (
		<div className={ `isfwp-agent-popup isfwp-agent-popup--${ position }` }>
			<button
				ref={ triggerRef }
				type="button"
				className="isfwp-agent-popup__trigger"
				aria-expanded={ isOpen }
				onClick={ () => setIsOpen( ( open ) => ! open ) }
			>
				<ChatIcon />
				<span>{ buttonText }</span>
			</button>

			<div
				ref={ panelRef }
				className="isfwp-agent-popup__panel"
				role="dialog"
				aria-modal="false"
				aria-label={ panelTitle }
				hidden={ ! isOpen }
			>
				<div className="isfwp-agent-popup__header">
					<p className="isfwp-agent-popup__title">{ panelTitle }</p>
					<button
						type="button"
						className="isfwp-agent-popup__close"
						aria-label={ __(
							'Close chat',
							'instantsearch-for-wp'
						) }
						onClick={ () => {
							setIsOpen( false );
							triggerRef.current?.focus();
						} }
					>
						<CloseIcon />
					</button>
				</div>
				<AgentChat config={ config } />
			</div>
		</div>
	);
};

export default AgentChatPopup;
