/**
 * Editor preview for the InstantSearch Search Button block.
 *
 * Renders a static, non-interactive lookalike of the native Algolia
 * SiteSearch trigger button (search icon, label, ⌘K shortcut chip). The real
 * bundle is intentionally NOT initialized in the editor.
 */
import { __ } from '@wordpress/i18n';
import { useBlockProps, InspectorControls } from '@wordpress/block-editor';
import { PanelBody, TextControl } from '@wordpress/components';

const previewStyles = {
	button: {
		display: 'inline-flex',
		alignItems: 'center',
		gap: '8px',
		padding: '8px 12px',
		border: '1px solid #d0d0d0',
		borderRadius: '8px',
		background: '#fff',
		color: '#444',
		font: '13px/1.2 -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
		cursor: 'default',
	},
	kbd: {
		display: 'inline-flex',
		gap: '2px',
		padding: '2px 5px',
		border: '1px solid #d0d0d0',
		borderRadius: '4px',
		background: '#f6f6f6',
		fontSize: '11px',
	},
};

const Edit = ( { attributes, setAttributes } ) => {
	const { buttonText } = attributes;
	const blockProps = useBlockProps();

	return (
		<>
			<InspectorControls>
				<PanelBody title={ __( 'Button Settings', 'instantsearch-for-wp' ) }>
					<TextControl
						label={ __( 'Button Text', 'instantsearch-for-wp' ) }
						help={ __( 'Leave empty to use the label from InstantSearch → Search Configuration.', 'instantsearch-for-wp' ) }
						value={ buttonText }
						onChange={ ( value ) => setAttributes( { buttonText: value } ) }
						__next40pxDefaultSize
						__nextHasNoMarginBottom
					/>
				</PanelBody>
			</InspectorControls>
			<div { ...blockProps }>
				<span style={ previewStyles.button } aria-hidden="true">
					<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
						<circle cx="11" cy="11" r="8"></circle>
						<line x1="21" y1="21" x2="16.65" y2="16.65"></line>
					</svg>
					{ buttonText || __( 'Search', 'instantsearch-for-wp' ) }
					<span style={ previewStyles.kbd }>
						<kbd>⌘</kbd>
						<kbd>K</kbd>
					</span>
				</span>
			</div>
		</>
	);
};

export default Edit;
