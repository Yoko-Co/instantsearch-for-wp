/**
 * Shared InspectorControls panels for the two agent-chat blocks.
 */

import { __ } from '@wordpress/i18n';
import {
	PanelBody,
	TextControl,
	ToggleControl,
	SelectControl,
} from '@wordpress/components';

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
