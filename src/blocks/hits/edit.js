import { useBlockProps, InspectorControls } from '@wordpress/block-editor';
import {
	PanelBody,
	TextControl,
	TextareaControl,
	ToggleControl,
	SelectControl,
	RangeControl,
	DropdownMenu,
	Button,
	Flex,
	FlexItem,
	__experimentalText as Text,
} from '@wordpress/components';
import { useRef, useState } from '@wordpress/element';
import { __ } from '@wordpress/i18n';

const TOKEN_CONTROLS = [
	{ title: __( 'Title', 'instantsearch-for-wp' ), icon: 'heading', field: 'title' },
	{ title: __( 'Title (highlighted)', 'instantsearch-for-wp' ), icon: 'editor-textcolor', field: '_highlightResult.title.value', isHtml: true },
	{ title: __( 'Excerpt', 'instantsearch-for-wp' ), icon: 'editor-paragraph', field: 'excerpt' },
	{ title: __( 'Excerpt (highlighted)', 'instantsearch-for-wp' ), icon: 'editor-textcolor', field: '_highlightResult.excerpt.value', isHtml: true },
	{ title: __( 'Content', 'instantsearch-for-wp' ), icon: 'text-page', field: 'content' },
	{ title: __( 'Permalink', 'instantsearch-for-wp' ), icon: 'admin-links', field: 'permalink' },
	{ title: __( 'Image URL', 'instantsearch-for-wp' ), icon: 'format-image', field: 'image' },
	{ title: __( 'Author', 'instantsearch-for-wp' ), icon: 'admin-users', field: 'author' },
	{ title: __( 'Date', 'instantsearch-for-wp' ), icon: 'calendar', field: 'date' },
	{ title: __( 'Post Type', 'instantsearch-for-wp' ), icon: 'admin-post', field: 'post_type' },
	{ title: __( 'Categories', 'instantsearch-for-wp' ), icon: 'category', field: 'categories' },
	{ title: __( 'Tags', 'instantsearch-for-wp' ), icon: 'tag', field: 'tags' },
];

const TOKEN_REFERENCE = [
	{ token: '{{title}}', description: __( 'Post title (escaped)', 'instantsearch-for-wp' ) },
	{ token: '{{{_highlightResult.title.value}}}', description: __( 'Title with search highlights (HTML)', 'instantsearch-for-wp' ) },
	{ token: '{{excerpt}}', description: __( 'Post excerpt (escaped)', 'instantsearch-for-wp' ) },
	{ token: '{{{_highlightResult.excerpt.value}}}', description: __( 'Excerpt with highlights (HTML)', 'instantsearch-for-wp' ) },
	{ token: '{{content}}', description: __( 'Post content snippet (escaped)', 'instantsearch-for-wp' ) },
	{ token: '{{permalink}}', description: __( 'Post URL', 'instantsearch-for-wp' ) },
	{ token: '{{image}}', description: __( 'Featured image URL', 'instantsearch-for-wp' ) },
	{ token: '{{author}}', description: __( 'Author display name', 'instantsearch-for-wp' ) },
	{ token: '{{date}}', description: __( 'Post date', 'instantsearch-for-wp' ) },
	{ token: '{{post_type}}', description: __( 'Post type slug', 'instantsearch-for-wp' ) },
	{ token: '{{categories}}', description: __( 'Comma-separated categories', 'instantsearch-for-wp' ) },
	{ token: '{{tags}}', description: __( 'Comma-separated tags', 'instantsearch-for-wp' ) },
];

export default function Edit( { attributes, setAttributes } ) {
	const {
		showImage,
		imageSize,
		hitsPerPage,
		tabletColumns,
		columns,
		hitTemplate,
		hideResultsOnEmptySearch,
		emptySearchMessage,
	} = attributes;
	const [ customField, setCustomField ] = useState( '' );
	const templateWrapRef = useRef( null );

	function getTextarea() {
		return templateWrapRef.current?.querySelector( 'textarea' );
	}

	function insertToken( field, isHtml = false ) {
		const token = isHtml ? `{{{${ field }}}}` : `{{${ field }}}`;
		const current = hitTemplate || '';
		const textarea = getTextarea();

		if ( textarea ) {
			const start = textarea.selectionStart;
			const end = textarea.selectionEnd;
			const newVal = current.slice( 0, start ) + token + current.slice( end );
			setAttributes( { hitTemplate: newVal } );
			setTimeout( () => {
				textarea.focus();
				textarea.selectionStart = start + token.length;
				textarea.selectionEnd = start + token.length;
			}, 0 );
		} else {
			setAttributes( { hitTemplate: current + token } );
		}
	}

	function insertCustomField() {
		if ( ! customField.trim() ) return;
		insertToken( customField.trim() );
		setCustomField( '' );
	}

	const dropdownControls = TOKEN_CONTROLS.map( ( { title, icon, field, isHtml } ) => ( {
		title,
		icon,
		onClick: () => insertToken( field, isHtml ),
	} ) );

	return (
		<>
			<InspectorControls>
				<PanelBody title={ __( 'Hit Template', 'instantsearch-for-wp' ) } initialOpen={ true }>
					<div className="isfwp-template-editor">
						<p className="components-base-control__help">
							{ __( 'Use tokens like ', 'instantsearch-for-wp' ) }
							<code>{ '{{title}}' }</code>
							{ __( ' to insert field values. Triple braces ', 'instantsearch-for-wp' ) }
							<code>{ '{{{field}}}' }</code>
							{ __( ' render HTML (for highlights).', 'instantsearch-for-wp' ) }
						</p>

						<div className="isfwp-token-toolbar">
							<DropdownMenu
								icon="plus-alt2"
								label={ __( 'Insert Token', 'instantsearch-for-wp' ) }
								controls={ dropdownControls }
							/>
							<Flex align="flex-end" gap={ 2 } className="isfwp-custom-token-row">
								<FlexItem isBlock>
									<TextControl
										label={ __( 'Custom Field', 'instantsearch-for-wp' ) }
										placeholder="acf_field_name"
										value={ customField }
										onChange={ setCustomField }
										onKeyDown={ ( e ) => {
											if ( e.key === 'Enter' ) {
												e.preventDefault();
												insertCustomField();
											}
										} }
										className="isfwp-custom-token-input"
									/>
								</FlexItem>
								<FlexItem>
									<Button
										variant="secondary"
										onClick={ insertCustomField }
										disabled={ ! customField.trim() }
										className="isfwp-custom-token-btn"
									>
										{ __( 'Insert', 'instantsearch-for-wp' ) }
									</Button>
								</FlexItem>
							</Flex>
						</div>

						<div ref={ templateWrapRef }>
							<TextareaControl
								label={ __( 'Template HTML', 'instantsearch-for-wp' ) }
								help={ __( 'Mustache template. Use {{field}} for escaped text, {{{field}}} for HTML.', 'instantsearch-for-wp' ) }
								value={ hitTemplate }
								onChange={ ( val ) => setAttributes( { hitTemplate: val } ) }
								rows={ 12 }
								className="isfwp-template-textarea code"
							/>
						</div>
					</div>
				</PanelBody>

				<PanelBody title={ __( 'Display Options', 'instantsearch-for-wp' ) } initialOpen={ false }>
					<ToggleControl
						label={ __( 'Hide search results for empty search', 'instantsearch-for-wp' ) }
						checked={ hideResultsOnEmptySearch }
						onChange={ ( val ) => setAttributes( { hideResultsOnEmptySearch: val } ) }
						help={ __( 'Do not run search until a query is entered or a filter is selected.', 'instantsearch-for-wp' ) }
					/>
					{ hideResultsOnEmptySearch && (
						<TextControl
							label={ __( 'Empty Search message', 'instantsearch-for-wp' ) }
							value={ emptySearchMessage }
							onChange={ ( val ) => setAttributes( { emptySearchMessage: val } ) }
							placeholder={ __( 'Enter a search or add a filter to see results.', 'instantsearch-for-wp' ) }
							help={ __( 'Shown before the first query or filter is applied.', 'instantsearch-for-wp' ) }
						/>
					) }
					<ToggleControl
						label={ __( 'Show featured image', 'instantsearch-for-wp' ) }
						checked={ showImage }
						onChange={ ( val ) => setAttributes( { showImage: val } ) }
					/>
					{ showImage && (
						<SelectControl
							label={ __( 'Image size', 'instantsearch-for-wp' ) }
							value={ imageSize }
							options={ [
								{ label: __( 'Thumbnail', 'instantsearch-for-wp' ), value: 'thumbnail' },
								{ label: __( 'Medium', 'instantsearch-for-wp' ), value: 'medium' },
								{ label: __( 'Large', 'instantsearch-for-wp' ), value: 'large' },
								{ label: __( 'Full', 'instantsearch-for-wp' ), value: 'full' },
							] }
							onChange={ ( val ) => setAttributes( { imageSize: val } ) }
						/>
					) }
					<RangeControl
						label={ __( 'Hits per page', 'instantsearch-for-wp' ) }
						value={ hitsPerPage }
						onChange={ ( val ) => setAttributes( { hitsPerPage: val } ) }
						min={ 1 }
						max={ 100 }
						step={ 1 }
					/>
					<RangeControl
						label={ __( 'Tablet columns', 'instantsearch-for-wp' ) }
						value={ tabletColumns }
						onChange={ ( val ) => setAttributes( { tabletColumns: val } ) }
						min={ 1 }
						max={ 4 }
						step={ 1 }
						help={ __( 'Controls how many result columns render on tablet screens.', 'instantsearch-for-wp' ) }
					/>
					<RangeControl
						label={ __( 'Desktop columns', 'instantsearch-for-wp' ) }
						value={ columns }
						onChange={ ( val ) => setAttributes( { columns: val } ) }
						min={ 1 }
						max={ 6 }
						step={ 1 }
						help={ __( 'Controls how many result columns render on desktop screens.', 'instantsearch-for-wp' ) }
					/>
				</PanelBody>

				<PanelBody title={ __( 'Token Reference', 'instantsearch-for-wp' ) } initialOpen={ false }>
					<div className="isfwp-token-reference">
						{ TOKEN_REFERENCE.map( ( { token, description } ) => (
							<div key={ token } className="isfwp-token-reference__item">
								<code className="isfwp-token-reference__token">{ token }</code>
								<Text className="isfwp-token-reference__desc">{ description }</Text>
							</div>
						) ) }
					</div>
				</PanelBody>
			</InspectorControls>

			<div { ...useBlockProps() }>
				<div className="isfwp-widget-preview">
					<div className="isfwp-widget-preview__label">
						{ __( 'Search Results (Hits)', 'instantsearch-for-wp' ) }
					</div>
					<div
						style={ {
							display: 'grid',
							gap: '1rem',
							gridTemplateColumns: `repeat(${ columns || 3 }, minmax(0, 1fr))`,
						} }
					>
						{ [ 1, 2, 3 ].map( ( i ) => (
							<div key={ i } className="isfwp-hit-preview">
							{ showImage && (
								<div className="isfwp-hit-preview__image" />
							) }
							<div className="isfwp-hit-preview__body">
								<div className="isfwp-widget-preview__mock-hit isfwp-widget-preview__mock-hit--medium" style={ { background: '#3182ce', height: '0.875rem', width: i === 2 ? '55%' : '75%', marginBottom: '0.375rem' } } />
								<div className="isfwp-widget-preview__mock-hit" style={ { height: '0.75rem', marginBottom: '0.25rem' } } />
								<div className="isfwp-widget-preview__mock-hit isfwp-widget-preview__mock-hit--short" />
							</div>
						</div>
						) ) }
					</div>
					<div className="isfwp-hit-preview__template-notice">
						{ __( 'Custom template active', 'instantsearch-for-wp' ) }
					</div>
				</div>
			</div>
		</>
	);
}
