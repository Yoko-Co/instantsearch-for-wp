/**
 * Per-index configuration page — reuses the v1 IndexOptions component
 * (post types, taxonomies, reindexing, per-index search configuration).
 */
import apiFetch from '@wordpress/api-fetch';
import { useState } from '@wordpress/element';
import { __ } from '@wordpress/i18n';
import {
	Button,
	Card,
	CardBody,
	CardHeader,
	Notice,
	Spinner,
} from '@wordpress/components';
import { useNavigate, useParams } from 'react-router-dom';
import { useDispatch } from '@wordpress/data';
import { store as noticesStore } from '@wordpress/notices';

import IndexOptions from '../../admin/components/IndexOptions';
import { useIndexes } from '../components/IndexesContext';

const IndexPage = () => {
	const { indexId } = useParams();
	const navigate = useNavigate();
	const { indexes, loadingIndexes, refreshIndexes } = useIndexes();
	const { createSuccessNotice, createErrorNotice } = useDispatch( noticesStore );

	const [ deleting, setDeleting ] = useState( false );
	const [ confirmingDelete, setConfirmingDelete ] = useState( false );

	const numericId = parseInt( indexId, 10 );
	const indexCpt = indexes.find( ( index ) => index.id === numericId );

	const handleDelete = async () => {
		setDeleting( true );
		try {
			await apiFetch( {
				path: `/wp/v2/isfwp_index/${ numericId }?force=true`,
				method: 'DELETE',
			} );
			await refreshIndexes();
			createSuccessNotice(
				__( 'Index deleted. The remote search index has been removed as well.', 'instantsearch-for-wp' )
			);
			navigate( '/' );
		} catch ( e ) {
			createErrorNotice(
				__( 'Error deleting index: ', 'instantsearch-for-wp' ) + e.message,
				{ type: 'snackbar' }
			);
			setDeleting( false );
			setConfirmingDelete( false );
		}
	};

	if ( loadingIndexes ) {
		return (
			<Card>
				<CardBody>
					<Spinner />
				</CardBody>
			</Card>
		);
	}

	if ( ! indexCpt ) {
		return (
			<Card>
				<CardBody>
					<Notice status="warning" isDismissible={ false }>
						{ __( 'This index could not be found.', 'instantsearch-for-wp' ) }
					</Notice>
				</CardBody>
			</Card>
		);
	}

	return (
		<Card>
			<CardHeader>
				<h2>{ indexCpt.title?.rendered || indexCpt.slug }</h2>
			</CardHeader>
			<CardBody>
				{ /* Key forces a remount (and refetch) when switching between indexes. */ }
				<IndexOptions key={ numericId } index={ {} } indexId={ numericId } />

				<hr />
				<h3>{ __( 'Danger Zone', 'instantsearch-for-wp' ) }</h3>
				{ confirmingDelete ? (
					<>
						<Notice status="warning" isDismissible={ false }>
							{ __( 'This permanently deletes the index configuration and removes the index from your search provider. Posts themselves are not affected.', 'instantsearch-for-wp' ) }
						</Notice>
						<Button
							variant="primary"
							isDestructive
							disabled={ deleting }
							isBusy={ deleting }
							onClick={ handleDelete }
							__next40pxDefaultSize
						>
							{ deleting
								? __( 'Deleting…', 'instantsearch-for-wp' )
								: __( 'Yes, delete this index', 'instantsearch-for-wp' ) }
						</Button>{ ' ' }
						<Button
							variant="tertiary"
							disabled={ deleting }
							onClick={ () => setConfirmingDelete( false ) }
							__next40pxDefaultSize
						>
							{ __( 'Cancel', 'instantsearch-for-wp' ) }
						</Button>
					</>
				) : (
					<Button
						variant="secondary"
						isDestructive
						onClick={ () => setConfirmingDelete( true ) }
						__next40pxDefaultSize
					>
						{ __( 'Delete Index', 'instantsearch-for-wp' ) }
					</Button>
				) }
			</CardBody>
		</Card>
	);
};

export default IndexPage;
