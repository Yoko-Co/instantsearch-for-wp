/**
 * Shared state for the list of search indexes (isfwp_index CPT posts).
 */
import apiFetch from '@wordpress/api-fetch';
import { createContext, useCallback, useContext, useEffect, useState } from '@wordpress/element';

const IndexesContext = createContext( {} );

const licensing = window.instantsearchAdmin?.licensing || {};

const IndexesProvider = ( { children } ) => {
	const [ indexes, setIndexes ] = useState( [] );
	const [ loadingIndexes, setLoadingIndexes ] = useState( true );

	const refreshIndexes = useCallback( async () => {
		try {
			const results = await apiFetch( {
				path: '/wp/v2/isfwp_index?context=edit&per_page=100&status=publish',
			} );
			setIndexes( Array.isArray( results ) ? results : [] );
		} catch ( e ) {
			setIndexes( [] );
		} finally {
			setLoadingIndexes( false );
		}
	}, [] );

	useEffect( () => {
		refreshIndexes();
	}, [ refreshIndexes ] );

	const canCreateIndex =
		licensing.canUseMultipleIndexes || indexes.length === 0;

	const value = {
		indexes,
		loadingIndexes,
		refreshIndexes,
		canCreateIndex,
		licensing,
	};

	return (
		<IndexesContext.Provider value={ value }>
			{ children }
		</IndexesContext.Provider>
	);
};

const useIndexes = () => useContext( IndexesContext );

export { IndexesProvider, useIndexes };
