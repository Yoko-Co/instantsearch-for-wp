/**
 * Editor preview and controls for the Ask AI block.
 */
import { __ } from '@wordpress/i18n';
import { useBlockProps, InspectorControls } from '@wordpress/block-editor';
import {
	PanelBody,
	TextControl,
	ToggleControl,
	SelectControl,
	Notice,
} from '@wordpress/components';

const previewStyles = {
	button: {
		display: 'inline-flex',
		alignItems: 'center',
		gap: '8px',
		padding: '10px 14px',
		border: '1px solid #d0d0d0',
		borderRadius: '8px',
		background: '#ffffff',
		color: '#1f2937',
		font: '13px/1.2 -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
		cursor: 'default',
	},
	pill: {
		display: 'inline-block',
		padding: '2px 6px',
		borderRadius: '999px',
		background: '#eef2ff',
		color: '#3730a3',
		fontSize: '11px',
		fontWeight: 600,
	},
};

const Edit = ( { attributes, setAttributes } ) => {
	const {
		buttonText,
		themeMode,
		placement,
		useGlobalAgentId,
		customAgentId,
		useGlobalApiKey,
		customApiKey,
	} = attributes;

	const blockProps = useBlockProps( {
		className: `isfwp-ask-ai-editor isfwp-ask-ai-editor--${ placement }`,
	} );

	let placementLabel = __( 'Bottom Right', 'instantsearch-for-wp' );
	if ( 'inline' === placement ) {
		placementLabel = __( 'Inline', 'instantsearch-for-wp' );
	} else if ( 'floating-left' === placement ) {
		placementLabel = __( 'Bottom Left', 'instantsearch-for-wp' );
	}

	return (
		<>
			<InspectorControls>
				<PanelBody
					title={ __( 'Ask AI Settings', 'instantsearch-for-wp' ) }
					initialOpen
				>
					<SelectControl
						label={ __(
							'Button placement',
							'instantsearch-for-wp'
						) }
						value={ placement }
						options={ [
							{
								label: __(
									'Floating button (bottom right)',
									'instantsearch-for-wp'
								),
								value: 'floating-right',
							},
							{
								label: __(
									'Floating button (bottom left)',
									'instantsearch-for-wp'
								),
								value: 'floating-left',
							},
							{
								label: __(
									'Inline button (inside content)',
									'instantsearch-for-wp'
								),
								value: 'inline',
							},
						] }
						onChange={ ( value ) =>
							setAttributes( { placement: value } )
						}
						__next40pxDefaultSize
						__nextHasNoMarginBottom
					/>

					<TextControl
						label={ __( 'Button text', 'instantsearch-for-wp' ) }
						help={ __(
							'Leave empty to use Ask AI.',
							'instantsearch-for-wp'
						) }
						value={ buttonText }
						onChange={ ( value ) =>
							setAttributes( { buttonText: value } )
						}
						__next40pxDefaultSize
						__nextHasNoMarginBottom
					/>

					<SelectControl
						label={ __( 'Theme', 'instantsearch-for-wp' ) }
						value={ themeMode }
						options={ [
							{
								label: __( 'Light', 'instantsearch-for-wp' ),
								value: 'light',
							},
							{
								label: __( 'Dark', 'instantsearch-for-wp' ),
								value: 'dark',
							},
							{
								label: __(
									"User's System Setting",
									'instantsearch-for-wp'
								),
								value: 'system',
							},
						] }
						onChange={ ( value ) =>
							setAttributes( { themeMode: value } )
						}
						__next40pxDefaultSize
						__nextHasNoMarginBottom
					/>
				</PanelBody>

				<PanelBody
					title={ __( 'Agent ID', 'instantsearch-for-wp' ) }
					initialOpen={ false }
				>
					<ToggleControl
						label={ __(
							'Use global Ask AI Agent ID',
							'instantsearch-for-wp'
						) }
						checked={ useGlobalAgentId }
						onChange={ ( value ) =>
							setAttributes( { useGlobalAgentId: value } )
						}
						help={ __(
							'When disabled, this block uses the custom Agent ID below.',
							'instantsearch-for-wp'
						) }
						__nextHasNoMarginBottom
					/>

					{ ! useGlobalAgentId && (
						<TextControl
							label={ __(
								'Custom Agent ID',
								'instantsearch-for-wp'
							) }
							value={ customAgentId }
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
						checked={ useGlobalApiKey }
						onChange={ ( value ) =>
							setAttributes( { useGlobalApiKey: value } )
						}
						help={ __(
							'Disable to provide a block-level API key override.',
							'instantsearch-for-wp'
						) }
						__nextHasNoMarginBottom
					/>

					{ ! useGlobalApiKey && (
						<TextControl
							label={ __(
								'Custom API key',
								'instantsearch-for-wp'
							) }
							type="password"
							value={ customApiKey }
							onChange={ ( value ) =>
								setAttributes( { customApiKey: value } )
							}
							placeholder="Search-only API key"
							__next40pxDefaultSize
							__nextHasNoMarginBottom
						/>
					) }
				</PanelBody>
			</InspectorControls>

			<div { ...blockProps }>
				<div style={ previewStyles.button } aria-hidden="true">
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
						<path d="M12 3l1.9 3.9L18 8l-3 2.9.7 4.1L12 13l-3.7 2 .7-4.1L6 8l4.1-1.1L12 3z" />
					</svg>
					{ buttonText || __( 'Ask AI', 'instantsearch-for-wp' ) }
					<span style={ previewStyles.pill }>{ placementLabel }</span>
				</div>
				<Notice status="info" isDismissible={ false }>
					{ __(
						'This block renders only when Algolia is the selected provider and valid Ask AI settings are available.',
						'instantsearch-for-wp'
					) }
				</Notice>
			</div>
		</>
	);
};

export default Edit;
