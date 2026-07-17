/**
 * Shared InspectorControls panels for the two agent-chat blocks.
 */

import { __ } from '@wordpress/i18n';
import { InspectorControls, PanelColorSettings } from '@wordpress/block-editor';
import {
	PanelBody,
	TextControl,
	ToggleControl,
	SelectControl,
	RangeControl,
} from '@wordpress/components';

/**
 * Send icon choices shared by the editor control and the frontend component.
 */
export const SEND_ICON_OPTIONS = [
	{
		label: __( 'Paper plane', 'instantsearch-for-wp' ),
		value: 'paper-plane',
	},
	{ label: __( 'Arrow up', 'instantsearch-for-wp' ), value: 'arrow-up' },
	{
		label: __( 'Chat bubble', 'instantsearch-for-wp' ),
		value: 'chat-bubble',
	},
	{ label: __( 'Sparkle', 'instantsearch-for-wp' ), value: 'sparkle' },
];

/**
 * Chat behavior panel: mode, welcome copy, placeholder, recommended questions.
 *
 * @param {Object}   props
 * @param {Object}   props.attributes    Block attributes.
 * @param {Function} props.setAttributes Attribute setter.
 */
export const ChatSettingsPanel = ( { attributes, setAttributes } ) => (
	<PanelBody
		title={ __( 'Chat Settings', 'instantsearch-for-wp' ) }
		initialOpen
	>
		<SelectControl
			label={ __( 'Mode', 'instantsearch-for-wp' ) }
			value={ attributes.mode === 'single' ? 'single' : 'conversation' }
			options={ [
				{
					label: __(
						'Conversation (ongoing back and forth)',
						'instantsearch-for-wp'
					),
					value: 'conversation',
				},
				{
					label: __(
						'Single answer (one question, one response)',
						'instantsearch-for-wp'
					),
					value: 'single',
				},
			] }
			help={
				attributes.mode === 'single'
					? __(
							'Each question starts fresh — the agent receives no prior context.',
							'instantsearch-for-wp'
					  )
					: __(
							'The full conversation is sent with each question, and recommended questions are offered as follow-ups.',
							'instantsearch-for-wp'
					  )
			}
			onChange={ ( value ) => setAttributes( { mode: value } ) }
			__next40pxDefaultSize
			__nextHasNoMarginBottom
		/>

		<TextControl
			label={ __( 'Welcome title', 'instantsearch-for-wp' ) }
			value={ attributes.welcomeTitle }
			onChange={ ( value ) => setAttributes( { welcomeTitle: value } ) }
			__next40pxDefaultSize
			__nextHasNoMarginBottom
		/>

		<TextControl
			label={ __( 'Welcome message', 'instantsearch-for-wp' ) }
			value={ attributes.welcomeMessage }
			onChange={ ( value ) => setAttributes( { welcomeMessage: value } ) }
			__next40pxDefaultSize
			__nextHasNoMarginBottom
		/>

		<TextControl
			label={ __( 'Input placeholder', 'instantsearch-for-wp' ) }
			help={ __(
				'Leave empty for “Ask a question…”.',
				'instantsearch-for-wp'
			) }
			value={ attributes.placeholder }
			onChange={ ( value ) => setAttributes( { placeholder: value } ) }
			__next40pxDefaultSize
			__nextHasNoMarginBottom
		/>

		<ToggleControl
			label={ __( 'Show recommended questions', 'instantsearch-for-wp' ) }
			help={ __(
				'Shows the Recommended Questions published for this agent in Algolia.',
				'instantsearch-for-wp'
			) }
			checked={ attributes.showRecommendedQuestions }
			onChange={ ( value ) =>
				setAttributes( { showRecommendedQuestions: value } )
			}
			__nextHasNoMarginBottom
		/>
	</PanelBody>
);

/**
 * Agent ID and API key override panels, matching the Ask AI block pattern.
 *
 * @param {Object}   props
 * @param {Object}   props.attributes    Block attributes.
 * @param {Function} props.setAttributes Attribute setter.
 */
export const AgentOverridesPanels = ( { attributes, setAttributes } ) => (
	<>
		<PanelBody
			title={ __( 'Agent ID', 'instantsearch-for-wp' ) }
			initialOpen={ false }
		>
			<ToggleControl
				label={ __(
					'Use global Agent Studio Agent ID',
					'instantsearch-for-wp'
				) }
				checked={ attributes.useGlobalAgentId }
				onChange={ ( value ) =>
					setAttributes( { useGlobalAgentId: value } )
				}
				help={ __(
					'When disabled, this block uses the custom Agent ID below.',
					'instantsearch-for-wp'
				) }
				__nextHasNoMarginBottom
			/>

			{ ! attributes.useGlobalAgentId && (
				<TextControl
					label={ __( 'Custom Agent ID', 'instantsearch-for-wp' ) }
					value={ attributes.customAgentId }
					onChange={ ( value ) =>
						setAttributes( { customAgentId: value } )
					}
					placeholder="agent_123"
					__next40pxDefaultSize
					__nextHasNoMarginBottom
				/>
			) }
		</PanelBody>

		<PanelBody
			title={ __( 'API Key Override', 'instantsearch-for-wp' ) }
			initialOpen={ false }
		>
			<ToggleControl
				label={ __(
					'Use global Algolia Search API key',
					'instantsearch-for-wp'
				) }
				checked={ attributes.useGlobalApiKey }
				onChange={ ( value ) =>
					setAttributes( { useGlobalApiKey: value } )
				}
				help={ __(
					'Disable to provide a block-level API key override.',
					'instantsearch-for-wp'
				) }
				__nextHasNoMarginBottom
			/>

			{ ! attributes.useGlobalApiKey && (
				<TextControl
					label={ __( 'Custom API key', 'instantsearch-for-wp' ) }
					type="password"
					value={ attributes.customApiKey }
					onChange={ ( value ) =>
						setAttributes( { customApiKey: value } )
					}
					placeholder={ __(
						'Search-only API key',
						'instantsearch-for-wp'
					) }
					__next40pxDefaultSize
					__nextHasNoMarginBottom
				/>
			) }
		</PanelBody>
	</>
);

/**
 * Styles-tab appearance controls, shared by both agent-chat blocks.
 *
 * Values are emitted by render.php as --isfwp-agent-chat-* custom properties
 * on the block wrapper; anything left unset falls back to the active theme's
 * design tokens (see src/agent-chat/_chat.scss). The color pickers surface
 * the theme palette, so choices stay on-brand for block themes.
 *
 * @param {Object}   props
 * @param {Object}   props.attributes    Block attributes.
 * @param {Function} props.setAttributes Attribute setter.
 */
export const ChatStylePanels = ( { attributes, setAttributes } ) => (
	<InspectorControls group="styles">
		<PanelColorSettings
			title={ __( 'Chat Colors', 'instantsearch-for-wp' ) }
			initialOpen
			enableAlpha
			colorSettings={ [
				{
					value: attributes.backgroundColor,
					onChange: ( value ) =>
						setAttributes( { backgroundColor: value || '' } ),
					label: __( 'Background', 'instantsearch-for-wp' ),
				},
				{
					value: attributes.textColor,
					onChange: ( value ) =>
						setAttributes( { textColor: value || '' } ),
					label: __( 'Text', 'instantsearch-for-wp' ),
				},
				{
					value: attributes.accentColor,
					onChange: ( value ) =>
						setAttributes( { accentColor: value || '' } ),
					label: __(
						'Accent (buttons & your messages)',
						'instantsearch-for-wp'
					),
				},
				{
					value: attributes.accentTextColor,
					onChange: ( value ) =>
						setAttributes( { accentTextColor: value || '' } ),
					label: __( 'Text on accent', 'instantsearch-for-wp' ),
				},
				{
					value: attributes.borderColor,
					onChange: ( value ) =>
						setAttributes( { borderColor: value || '' } ),
					label: __( 'Border', 'instantsearch-for-wp' ),
				},
			] }
		/>

		<PanelBody
			title={ __( 'Chat Shape & Spacing', 'instantsearch-for-wp' ) }
			initialOpen={ false }
		>
			<RangeControl
				label={ __( 'Corner radius (px)', 'instantsearch-for-wp' ) }
				value={ attributes.borderRadius }
				onChange={ ( value ) =>
					setAttributes( { borderRadius: value } )
				}
				min={ 0 }
				max={ 40 }
				allowReset
				__next40pxDefaultSize
				__nextHasNoMarginBottom
			/>

			<RangeControl
				label={ __( 'Chat padding (px)', 'instantsearch-for-wp' ) }
				value={ attributes.chatPadding }
				onChange={ ( value ) =>
					setAttributes( { chatPadding: value } )
				}
				min={ 4 }
				max={ 48 }
				allowReset
				__next40pxDefaultSize
				__nextHasNoMarginBottom
			/>

			<SelectControl
				label={ __( 'Send button icon', 'instantsearch-for-wp' ) }
				value={ attributes.sendIcon || 'paper-plane' }
				options={ SEND_ICON_OPTIONS }
				onChange={ ( value ) => setAttributes( { sendIcon: value } ) }
				__next40pxDefaultSize
				__nextHasNoMarginBottom
			/>
		</PanelBody>
	</InspectorControls>
);
