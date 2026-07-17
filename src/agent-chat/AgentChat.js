/**
 * Assistant UI chat surface for Algolia Agent Studio agents.
 *
 * Wires @assistant-ui/react's LocalRuntime to the Agent Studio completions
 * endpoint (see ./stream.js) and layers on the two plugin modes:
 *
 * - `single`:       every question starts a fresh thread — one answer, no
 *                   ongoing conversation context.
 * - `conversation`: full back-and-forth; the whole visible thread is sent
 *                   with each request, and Algolia Recommended Questions are
 *                   offered as follow-ups after every answer.
 *
 * DEBUG: set `window.ISFWP_AGENT_CHAT_DEBUG = true` to log stream parts.
 */

import {
	useCallback,
	useEffect,
	useMemo,
	useRef,
	useState,
} from '@wordpress/element';
import { __ } from '@wordpress/i18n';
import {
	AssistantRuntimeProvider,
	ThreadPrimitive,
	MessagePrimitive,
	useAssistantRuntime,
	useLocalRuntime,
	useMessage,
	useMessagePartText,
	useThread,
} from '@assistant-ui/react';

import { streamAgentCompletion } from './stream';
import { fetchRecommendedQuestions } from './recommended-questions';
import { renderMarkdown, escapeHtml } from './markdown';

/**
 * Convert an assistant-ui ThreadMessage to the UI message shape the Agent
 * Studio completions endpoint expects.
 *
 * @param {Object} message ThreadMessage.
 * @param {number} index   Position in the history (id fallback).
 * @return {Object|null} UI message, or null when it has no text.
 */
const toUiMessage = ( message, index ) => {
	const parts = ( message.content || [] )
		.filter( ( part ) => part.type === 'text' && part.text )
		.map( ( part ) => ( { type: 'text', text: part.text } ) );

	if ( ! parts.length ) {
		return null;
	}

	return {
		id: message.id || `isfwp-message-${ index }`,
		role: message.role,
		parts,
	};
};

/**
 * Build the ChatModelAdapter that streams from Agent Studio.
 *
 * @param {Object} config Frontend config (appId, apiKey, agentId, mode).
 * @return {Object} ChatModelAdapter.
 */
const createAgentStudioAdapter = ( config ) => ( {
	async *run( { messages, abortSignal } ) {
		const history = messages
			.filter(
				( message ) =>
					message.role === 'user' || message.role === 'assistant'
			)
			.map( toUiMessage )
			.filter( Boolean );

		// Single mode is stateless by design: only the newest user question
		// leaves the browser, even if older messages are still on screen.
		const payload =
			config.mode === 'single' ? history.slice( -1 ) : history;

		let finalText = '';

		for await ( const update of streamAgentCompletion( {
			appId: config.appId,
			apiKey: config.apiKey,
			agentId: config.agentId,
			messages: payload,
			signal: abortSignal,
		} ) ) {
			finalText = update.text;
			yield { content: [ { type: 'text', text: update.text } ] };
		}

		if ( ! finalText.trim() ) {
			throw new Error(
				__(
					'The assistant returned an empty response. Please try again.',
					'instantsearch-for-wp'
				)
			);
		}
	},
} );

/**
 * Send helper shared by the composer and the recommended-question chips.
 *
 * In single mode every send swaps to a fresh thread first, which is what
 * clears the previous answer and keeps context singular.
 *
 * @param {string} mode 'single' or 'conversation'.
 * @return {Function} send( text ).
 */
const useSendMessage = ( mode ) => {
	const runtime = useAssistantRuntime();

	return useCallback(
		async ( text ) => {
			const clean = ( text || '' ).trim();
			if ( ! clean || runtime.thread.getState().isRunning ) {
				return;
			}

			if (
				mode === 'single' &&
				runtime.thread.getState().messages.length > 0
			) {
				await runtime.threads.switchToNewThread();
			}

			runtime.thread.append( {
				role: 'user',
				content: [ { type: 'text', text: clean } ],
			} );
		},
		[ runtime, mode ]
	);
};

/**
 * Assistant text part rendered as sanitized markdown.
 */
const MarkdownText = () => {
	const { text } = useMessagePartText();
	const html = useMemo( () => renderMarkdown( text ), [ text ] );

	return (
		<div
			className="isfwp-agent-chat__markdown"
			// eslint-disable-next-line react/no-danger
			dangerouslySetInnerHTML={ { __html: html } }
		/>
	);
};

const UserMessage = () => (
	<MessagePrimitive.Root className="isfwp-agent-chat__message isfwp-agent-chat__message--user">
		<div className="isfwp-agent-chat__bubble isfwp-agent-chat__bubble--user">
			<MessagePrimitive.Parts />
		</div>
	</MessagePrimitive.Root>
);

const AssistantMessage = () => {
	const status = useMessage( ( m ) => m.status );
	const isError = status?.type === 'incomplete' && status?.reason === 'error';

	let errorText = __(
		'Something went wrong while generating a response.',
		'instantsearch-for-wp'
	);
	if ( isError ) {
		const rawError = status?.error;
		if ( typeof rawError === 'string' && rawError.trim() ) {
			errorText = rawError;
		} else if (
			typeof rawError?.message === 'string' &&
			rawError.message.trim()
		) {
			errorText = rawError.message;
		}
	}

	return (
		<MessagePrimitive.Root className="isfwp-agent-chat__message isfwp-agent-chat__message--assistant">
			<div className="isfwp-agent-chat__bubble isfwp-agent-chat__bubble--assistant">
				<MessagePrimitive.Parts components={ { Text: MarkdownText } } />
				{ isError && (
					<p className="isfwp-agent-chat__error" role="alert">
						{ errorText }
					</p>
				) }
			</div>
		</MessagePrimitive.Root>
	);
};

/**
 * Recommended Questions chips.
 *
 * On the welcome screen every published question shows; once a conversation
 * is under way only questions that have not been asked yet are offered as
 * follow-ups.
 *
 * @param {Object}   props
 * @param {Array}    props.questions  Published questions.
 * @param {Function} props.onAsk      Called with the question text.
 * @param {boolean}  props.isFollowUp Render in follow-up placement.
 */
const RecommendedQuestions = ( { questions, onAsk, isFollowUp = false } ) => {
	const isRunning = useThread( ( t ) => t.isRunning );
	// Select the stable messages reference; deriving inside the selector would
	// return a fresh array every store check and re-render forever.
	const messages = useThread( ( t ) => t.messages );

	const available = useMemo( () => {
		const asked = messages
			.filter( ( message ) => message.role === 'user' )
			.map( ( message ) =>
				( message.content || [] )
					.filter( ( part ) => part.type === 'text' )
					.map( ( part ) => part.text )
					.join( ' ' )
					.trim()
					.toLowerCase()
			);

		return questions.filter(
			( item ) => ! asked.includes( item.question.trim().toLowerCase() )
		);
	}, [ messages, questions ] );

	if ( ! available.length || ( isFollowUp && isRunning ) ) {
		return null;
	}

	return (
		<div
			className={ `isfwp-agent-chat__questions${
				isFollowUp ? ' isfwp-agent-chat__questions--follow-up' : ''
			}` }
		>
			{ isFollowUp && (
				<p className="isfwp-agent-chat__questions-label">
					{ __( 'Recommended questions', 'instantsearch-for-wp' ) }
				</p>
			) }
			{ available.map( ( item ) => (
				<button
					key={ item.id }
					type="button"
					className="isfwp-agent-chat__question"
					disabled={ isRunning }
					onClick={ () => onAsk( item.question ) }
				>
					{ item.question }
				</button>
			) ) }
		</div>
	);
};

/**
 * Composer: textarea + send/stop. A controlled form (rather than
 * ComposerPrimitive) so single mode can reset the thread before appending.
 *
 * @param {Object}   props
 * @param {string}   props.placeholder Input placeholder.
 * @param {Function} props.onSend      Called with the typed question.
 */
const Composer = ( { placeholder, onSend } ) => {
	const runtime = useAssistantRuntime();
	const isRunning = useThread( ( t ) => t.isRunning );
	const [ value, setValue ] = useState( '' );
	const inputRef = useRef( null );

	const submit = () => {
		if ( ! value.trim() || isRunning ) {
			return;
		}

		onSend( value );
		setValue( '' );
		inputRef.current?.focus();
	};

	return (
		<form
			className="isfwp-agent-chat__composer"
			onSubmit={ ( event ) => {
				event.preventDefault();
				submit();
			} }
		>
			<textarea
				ref={ inputRef }
				className="isfwp-agent-chat__input"
				rows={ 1 }
				value={ value }
				placeholder={ placeholder }
				aria-label={ placeholder }
				onChange={ ( event ) => setValue( event.target.value ) }
				onKeyDown={ ( event ) => {
					if ( event.key === 'Enter' && ! event.shiftKey ) {
						event.preventDefault();
						submit();
					}
				} }
			/>
			{ isRunning ? (
				<button
					type="button"
					className="isfwp-agent-chat__send isfwp-agent-chat__send--stop"
					aria-label={ __(
						'Stop generating',
						'instantsearch-for-wp'
					) }
					onClick={ () => runtime.thread.cancelRun() }
				>
					<svg
						viewBox="0 0 24 24"
						width="18"
						height="18"
						aria-hidden="true"
					>
						<rect
							x="6"
							y="6"
							width="12"
							height="12"
							rx="2"
							fill="currentColor"
						/>
					</svg>
				</button>
			) : (
				<button
					type="submit"
					className="isfwp-agent-chat__send"
					aria-label={ __( 'Send question', 'instantsearch-for-wp' ) }
					disabled={ ! value.trim() }
				>
					<svg
						viewBox="0 0 24 24"
						width="18"
						height="18"
						fill="none"
						stroke="currentColor"
						strokeWidth="2"
						strokeLinecap="round"
						strokeLinejoin="round"
						aria-hidden="true"
					>
						<path d="M22 2 11 13" />
						<path d="M22 2 15 22 11 13 2 9z" />
					</svg>
				</button>
			) }
		</form>
	);
};

/**
 * Thread layout: welcome/empty state, messages, follow-up questions, composer.
 *
 * @param {Object} props
 * @param {Object} props.config    Frontend config.
 * @param {Array}  props.questions Recommended questions.
 */
const ChatThread = ( { config, questions } ) => {
	const send = useSendMessage( config.mode );
	const showQuestions =
		config.showRecommendedQuestions && questions.length > 0;

	return (
		<ThreadPrimitive.Root className="isfwp-agent-chat__thread">
			<ThreadPrimitive.Viewport
				className="isfwp-agent-chat__viewport"
				autoScroll
			>
				<ThreadPrimitive.Empty>
					<div className="isfwp-agent-chat__welcome">
						{ config.welcomeTitle && (
							<p className="isfwp-agent-chat__welcome-title">
								{ config.welcomeTitle }
							</p>
						) }
						{ config.welcomeMessage && (
							<p className="isfwp-agent-chat__welcome-message">
								{ config.welcomeMessage }
							</p>
						) }
						{ showQuestions && (
							<RecommendedQuestions
								questions={ questions }
								onAsk={ send }
							/>
						) }
					</div>
				</ThreadPrimitive.Empty>

				<ThreadPrimitive.Messages
					components={ { UserMessage, AssistantMessage } }
				/>

				{ showQuestions && (
					<ThreadPrimitive.If empty={ false } running={ false }>
						<RecommendedQuestions
							questions={ questions }
							onAsk={ send }
							isFollowUp
						/>
					</ThreadPrimitive.If>
				) }
			</ThreadPrimitive.Viewport>

			<Composer
				placeholder={
					config.placeholder ||
					__( 'Ask a question…', 'instantsearch-for-wp' )
				}
				onSend={ send }
			/>

			{ config.disclaimer && (
				<p
					className="isfwp-agent-chat__disclaimer"
					// eslint-disable-next-line react/no-danger
					dangerouslySetInnerHTML={ {
						__html: escapeHtml( config.disclaimer ),
					} }
				/>
			) }
		</ThreadPrimitive.Root>
	);
};

/**
 * Root chat component. Mount with a validated config object (see mount.js).
 *
 * @param {Object} props
 * @param {Object} props.config Frontend config from the block's render.php.
 */
const AgentChat = ( { config } ) => {
	const adapter = useMemo(
		() => createAgentStudioAdapter( config ),
		[ config ]
	);
	const runtime = useLocalRuntime( adapter );
	const [ questions, setQuestions ] = useState( [] );

	useEffect( () => {
		if ( ! config.showRecommendedQuestions ) {
			return undefined;
		}

		const controller = new AbortController();

		fetchRecommendedQuestions( {
			appId: config.appId,
			apiKey: config.apiKey,
			agentId: config.agentId,
			signal: controller.signal,
		} ).then( ( items ) => {
			if ( ! controller.signal.aborted ) {
				setQuestions( items );
			}
		} );

		return () => controller.abort();
	}, [ config ] );

	return (
		<AssistantRuntimeProvider runtime={ runtime }>
			<div
				className={ `isfwp-agent-chat isfwp-agent-chat--${
					config.mode === 'single' ? 'single' : 'conversation'
				}` }
			>
				<ChatThread config={ config } questions={ questions } />
			</div>
		</AssistantRuntimeProvider>
	);
};

export default AgentChat;
