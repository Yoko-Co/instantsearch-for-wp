/**
 * Modal for creating a new search index (isfwp_index CPT post).
 *
 * The server enforces the single-index limit for free plans via the
 * `rest_pre_insert_isfwp_index` filter, so a spoofed client cannot bypass it.
 */
import apiFetch from '@wordpress/api-fetch';
import { useState } from '@wordpress/element';
import { __ } from '@wordpress/i18n';
import { Button, Modal, Notice, TextControl } from '@wordpress/components';
import { useNavigate } from 'react-router-dom';
import { useDispatch } from '@wordpress/data';
import { store as noticesStore } from '@wordpress/notices';

import { useIndexes } from './IndexesContext';

const slugify = ( value ) =>
	value
		.toLowerCase()
		.trim()
		.replace( /[^a-z0-9]+/g, '-' )
		.replace( /^-+|-+$/g, '' );

const CreateIndexModal = ( { onClose } ) => {
	const { refreshIndexes } = useIndexes();
	const navigate = useNavigate();
	const { createSuccessNotice } = useDispatch( noticesStore );

	const [ title, setTitle ] = useState( '' );
	const [ slug, setSlug ] = useState( '' );
	const [ slugTouched, setSlugTouched ] = useState( false );
	const [ saving, setSaving ] = useState( false );
	const [ error, setError ] = useState( null );

	const effectiveSlug = slugTouched ? slug : slugify( title );

	const handleCreate = async () => {
		if ( ! title.trim() || ! effectiveSlug ) {
			setError( __( 'Please provide a name for the index.', 'instantsearch-for-wp' ) );
			return;
		}

		setSaving( true );
		setError( null );

		try {
			const newIndex = await apiFetch( {
				path: '/wp/v2/isfwp_index',
				method: 'POST',
				data: {
					title: title.trim(),
					slug: effectiveSlug,
					content: JSON.stringify( { post_types: [ 'post' ] } ),
					status: 'publish',
				},
			} );

			await refreshIndexes();
			createSuccessNotice(
				__( 'Index created. Configure its content below, then run a full index.', 'instantsearch-for-wp' )
			);
			onClose();
			navigate( `/indexes/${ newIndex.id }` );
		} catch ( e ) {
			setError( e.message || __( 'Could not create the index.', 'instantsearch-for-wp' ) );
		} finally {
			setSaving( false );
		}
	};

	return (
		<Modal
			title={ __( 'Create Index', 'instantsearch-for-wp' ) }
			onRequestClose={ onClose }
			className="instantsearch-admin-v2__create-index-modal"
		>
			{ error && (
				<Notice status="error" isDismissible={ false }>
					{ error }
				</Notice>
			) }
			<p>
				{ __(
					'Each index holds a subset of your content. Posts that match multiple indexes are synced to all of them when saved.',
					'instantsearch-for-wp'
				) }
			</p>
			<TextControl
				label={ __( 'Index Name', 'instantsearch-for-wp' ) }
				value={ title }
				onChange={ setTitle }
				placeholder={ __( 'e.g. Products', 'instantsearch-for-wp' ) }
				__next40pxDefaultSize
			/>
			<TextControl
				label={ __( 'Index Slug', 'instantsearch-for-wp' ) }
				help={
					( window.instantsearchAdmin?.indexPrefix || '' ) +
					( effectiveSlug || __( 'slug', 'instantsearch-for-wp' ) )
				}
				value={ effectiveSlug }
				onChange={ ( value ) => {
					setSlugTouched( true );
					setSlug( slugify( value ) );
				} }
				__next40pxDefaultSize
			/>
			<div className="instantsearch-admin-v2__create-index-actions">
				<Button
					variant="primary"
					onClick={ handleCreate }
					isBusy={ saving }
					disabled={ saving }
					__next40pxDefaultSize
				>
					{ saving
						? __( 'Creating…', 'instantsearch-for-wp' )
						: __( 'Create Index', 'instantsearch-for-wp' ) }
				</Button>
				<Button variant="tertiary" onClick={ onClose } __next40pxDefaultSize>
					{ __( 'Cancel', 'instantsearch-for-wp' ) }
				</Button>
			</div>
		</Modal>
	);
};

export default CreateIndexModal;
