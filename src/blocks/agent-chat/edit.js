/**
 * Editor preview and controls for the inline AI Agent Chat block.
 */
import { __ } from '@wordpress/i18n';
import { useBlockProps, InspectorControls } from '@wordpress/block-editor';
import { Notice } from '@wordpress/components';

import {
	ChatSettingsPanel,
	AgentOverridesPanels,
	ChatStylePanels,
} from '../../agent-chat/inspector';

const Edit = ( { attributes, setAttributes } ) => {
	const { mode, welcomeTitle, welcomeMessage, placeholder } = attributes;

	const blockProps = useBlockProps( {
		className: 'isfwp-agent-chat-editor',
	} );

	// Mirror the Styles-tab choices in the preview card.
	const previewStyle = {
		background: attributes.backgroundColor || undefined,
		color: attributes.textColor || undefined,
		borderColor: attributes.borderColor || undefined,
		borderRadius:
			typeof attributes.borderRadius === 'number'
				? `${ attributes.borderRadius }px`
				: undefined,
		padding:
			typeof attributes.chatPadding === 'number'
				? `${ attributes.chatPadding }px`
				: undefined,
	};

	return (
		<>
			<InspectorControls>
				<ChatSettingsPanel
					attributes={ attributes }
					setAttributes={ setAttributes }
				/>
				<AgentOverridesPanels
					attributes={ attributes }
					setAttributes={ setAttributes }
				/>
			</InspectorControls>

			<ChatStylePanels
				attributes={ attributes }
				setAttributes={ setAttributes }
			/>

			<div { ...blockProps }>
				<div
					className="isfwp-agent-chat-editor__preview"
					style={ previewStyle }
					aria-hidden="true"
				>
					<p className="isfwp-agent-chat-editor__title">
						{ welcomeTitle ||
							__( 'AI Agent Chat', 'instantsearch-for-wp' ) }
						<span className="isfwp-agent-chat-editor__pill">
							{ mode === 'single'
								? __( 'Single answer', 'instantsearch-for-wp' )
								: __( 'Conversation', 'instantsearch-for-wp' ) }
						</span>
					</p>
					{ welcomeMessage && (
						<p className="isfwp-agent-chat-editor__message">
							{ welcomeMessage }
						</p>
					) }
					<div className="isfwp-agent-chat-editor__input">
						{ placeholder ||
							__( 'Ask a question…', 'instantsearch-for-wp' ) }
					</div>
				</div>
				<Notice status="info" isDismissible={ false }>
					{ __(
						'Renders on the frontend when Algolia is the provider and an Agent Studio agent is configured.',
						'instantsearch-for-wp'
					) }
				</Notice>
			</div>
		</>
	);
};

export default Edit;
