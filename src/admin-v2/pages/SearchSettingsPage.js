/**
 * Search Configuration page — reuses the v1 SearchConfiguration component
 * for full parity, passing the primary index for the Algolia dashboard links.
 */
import { Card, CardBody, CardHeader, Notice, Spinner } from '@wordpress/components';
import { __ } from '@wordpress/i18n';

import SearchConfiguration from '../../admin/components/SearchConfiguration';
import { useIndexes } from '../components/IndexesContext';

const SearchSettingsPage = () => {
	const { indexes, loadingIndexes } = useIndexes();

	const primaryIndex = indexes.length ? indexes[ 0 ] : null;
	let parsedIndex = {};

	try {
		parsedIndex = primaryIndex?.content?.raw
			? JSON.parse( primaryIndex.content.raw )
			: {};
	} catch ( e ) {
		parsedIndex = {};
	}

	return (
		<Card>
			<CardHeader>
				<h2>{ __( 'Search Configuration', 'instantsearch-for-wp' ) }</h2>
			</CardHeader>
			<CardBody>
				{ loadingIndexes ? (
					<Spinner />
				) : ! primaryIndex ? (
					<Notice status="info" isDismissible={ false }>
						{ __( 'Create an index before configuring site search.', 'instantsearch-for-wp' ) }
					</Notice>
				) : (
					<SearchConfiguration index={ parsedIndex } indexCpt={ primaryIndex } />
				) }
			</CardBody>
		</Card>
	);
};

export default SearchSettingsPage;
