/**
 * Editor preview and controls for the AI Agent Chatbot (Popup) block.
 */
import { __ } from '@wordpress/i18n';
import { useBlockProps, InspectorControls } from '@wordpress/block-editor';
import {
	Notice,
	PanelBody,
	TextControl,
	SelectControl,
} from '@wordpress/components';

import {
	ChatSettingsPanel,
	AgentOverridesPanels,
} from '../../agent-chat/inspector';

const Edit = ( { attributes, setAttributes } ) => {
	const { buttonText, position, mode } = attributes;

	const blockProps = useBlockProps( {
		className: 'isfwp-agent-popup-editor',
	} );

	const positionLabel =
		position === 'bottom-left'
			? __( 'Bottom Left', 'instantsearch-for-wp' )
			: __( 'Bottom Right', 'instantsearch-for-wp' );

	return (
		<>
			<InspectorControls>
				<PanelBody
					title={ __( 'Popup Settings', 'instantsearch-for-wp' ) }
					initialOpen
				>
					<TextControl
						label={ __( 'Button text', 'instantsearch-for-wp' ) }
						help={ __(
							'Leave empty to use “Ask AI”.',
							'instantsearch-for-wp'
						) }
						value={ buttonText }
						onChange={ ( value ) =>
							setAttributes( { buttonText: value } )
						}
						__next40pxDefaultSize
						__nextHasNoMarginBottom
					/>

					<TextControl
						label={ __( 'Panel title', 'instantsearch-for-wp' ) }
						help={ __(
							'Leave empty to reuse the button text.',
							'instantsearch-for-wp'
						) }
						value={ attributes.panelTitle }
						onChange={ ( value ) =>
							setAttributes( { panelTitle: value } )
						}
						__next40pxDefaultSize
						__nextHasNoMarginBottom
					/>

					<SelectControl
						label={ __( 'Position', 'instantsearch-for-wp' ) }
						value={
							position === 'bottom-left'
								? 'bottom-left'
								: 'bottom-right'
						}
						options={ [
							{
								label: __(
									'Bottom right',
									'instantsearch-for-wp'
								),
								value: 'bottom-right',
							},
							{
								label: __(
									'Bottom left',
									'instantsearch-for-wp'
								),
								value: 'bottom-left',
							},
						] }
						onChange={ ( value ) =>
							setAttributes( { position: value } )
						}
						__next40pxDefaultSize
						__nextHasNoMarginBottom
					/>
				</PanelBody>

				<ChatSettingsPanel
					attributes={ attributes }
					setAttributes={ setAttributes }
				/>
				<AgentOverridesPanels
					attributes={ attributes }
					setAttributes={ setAttributes }
				/>
			</InspectorControls>

			<div { ...blockProps }>
				<div
					className="isfwp-agent-popup-editor__button"
					aria-hidden="true"
				>
					<svg
						xmlns="http://www.w3.org/2000/svg"
						viewBox="0 0 24 24"
						width="16"
						height="16"
						fill="none"
						stroke="currentColor"
						strokeWidth="2"
						strokeLinecap="round"
						strokeLinejoin="round"
					>
						<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
					</svg>
					{ buttonText || __( 'Ask AI', 'instantsearch-for-wp' ) }
					<span className="isfwp-agent-popup-editor__pill">
						{ positionLabel }
					</span>
					<span className="isfwp-agent-popup-editor__pill">
						{ mode === 'single'
							? __( 'Single answer', 'instantsearch-for-wp' )
							: __( 'Conversation', 'instantsearch-for-wp' ) }
					</span>
				</div>
				<Notice status="info" isDismissible={ false }>
					{ __(
						'The floating chatbot renders on the frontend when Algolia is the provider and an Agent Studio agent is configured.',
						'instantsearch-for-wp'
					) }
				</Notice>
			</div>
		</>
	);
};

export default Edit;
