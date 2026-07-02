/**
 * Dashboard v2 home page — analytics widgets.
 *
 * Widgets vary by provider; currently implemented for Algolia using the
 * Algolia Analytics API (proxied server-side).
 */
import apiFetch from '@wordpress/api-fetch';
import { useEffect, useMemo, useState } from '@wordpress/element';
import { __, sprintf } from '@wordpress/i18n';
import {
	Card,
	CardBody,
	CardHeader,
	Notice,
	SelectControl,
	Spinner,
} from '@wordpress/components';

import { useAdminContext } from '../../admin/components/AdminContext';
import { useIndexes } from '../components/IndexesContext';
import AreaChart from '../components/AreaChart';

const indexPrefix = window.instantsearchAdmin?.indexPrefix || '';

const StatCard = ( { label, value, help } ) => (
	<Card className="instantsearch-admin-v2__stat-card">
		<CardBody>
			<div className="instantsearch-admin-v2__stat-value">{ value }</div>
			<div className="instantsearch-admin-v2__stat-label">{ label }</div>
			{ help && <div className="instantsearch-admin-v2__stat-help">{ help }</div> }
		</CardBody>
	</Card>
);

const formatNumber = ( value ) =>
	typeof value === 'number' ? value.toLocaleString() : '—';

const HomePage = () => {
	const { provider } = useAdminContext();
	const { indexes, loadingIndexes } = useIndexes();

	const [ selectedIndex, setSelectedIndex ] = useState( '' );
	const [ days, setDays ] = useState( 30 );
	const [ overview, setOverview ] = useState( null );
	const [ loading, setLoading ] = useState( false );
	const [ error, setError ] = useState( null );

	// Default to the first configured index.
	useEffect( () => {
		if ( ! selectedIndex && indexes.length > 0 ) {
			setSelectedIndex( indexes[ 0 ].slug );
		}
	}, [ indexes, selectedIndex ] );

	const fullIndexName = useMemo(
		() => ( selectedIndex ? `${ indexPrefix }${ selectedIndex }` : '' ),
		[ selectedIndex ]
	);

	useEffect( () => {
		if ( ! fullIndexName || provider !== 'algolia' ) {
			return;
		}

		let cancelled = false;
		setLoading( true );
		setError( null );

		apiFetch( {
			path: `/instantsearch-for-wp/v1/analytics/overview?index=${ encodeURIComponent(
				fullIndexName
			) }&days=${ days }`,
		} )
			.then( ( response ) => {
				if ( ! cancelled ) {
					setOverview( response );
				}
			} )
			.catch( ( e ) => {
				if ( ! cancelled ) {
					setOverview( null );
					setError( e.message || __( 'Could not load analytics.', 'instantsearch-for-wp' ) );
				}
			} )
			.finally( () => {
				if ( ! cancelled ) {
					setLoading( false );
				}
			} );

		return () => {
			cancelled = true;
		};
	}, [ fullIndexName, days, provider ] );

	if ( provider && provider !== 'algolia' ) {
		return (
			<Card>
				<CardHeader>
					<h2>{ __( 'InstantSearch Analytics', 'instantsearch-for-wp' ) }</h2>
				</CardHeader>
				<CardBody>
					<Notice status="info" isDismissible={ false }>
						{ sprintf(
							/* translators: %s: provider name. */
							__( 'Analytics widgets are not yet available for the %s provider. Algolia is currently supported.', 'instantsearch-for-wp' ),
							provider
						) }
					</Notice>
				</CardBody>
			</Card>
		);
	}

	const noResultRate = overview?.noResultRate?.rate;

	return (
		<div className="instantsearch-admin-v2__home">
			<Card>
				<CardHeader className="instantsearch-admin-v2__home-header">
					<h2>{ __( 'InstantSearch Analytics', 'instantsearch-for-wp' ) }</h2>
					<div className="instantsearch-admin-v2__home-filters">
						<SelectControl
							label={ __( 'Index', 'instantsearch-for-wp' ) }
							value={ selectedIndex }
							options={ indexes.map( ( index ) => ( {
								label: index.title?.rendered || index.slug,
								value: index.slug,
							} ) ) }
							onChange={ setSelectedIndex }
							__next40pxDefaultSize
							__nextHasNoMarginBottom
						/>
						<SelectControl
							label={ __( 'Period', 'instantsearch-for-wp' ) }
							value={ String( days ) }
							options={ [
								{ label: __( 'Last 7 days', 'instantsearch-for-wp' ), value: '7' },
								{ label: __( 'Last 30 days', 'instantsearch-for-wp' ), value: '30' },
								{ label: __( 'Last 90 days', 'instantsearch-for-wp' ), value: '90' },
							] }
							onChange={ ( value ) => setDays( parseInt( value, 10 ) ) }
							__next40pxDefaultSize
							__nextHasNoMarginBottom
						/>
					</div>
				</CardHeader>
				<CardBody>
					{ loadingIndexes || loading ? (
						<Spinner />
					) : error ? (
						<Notice status="warning" isDismissible={ false }>
							{ error }
						</Notice>
					) : ! indexes.length ? (
						<Notice status="info" isDismissible={ false }>
							{ __( 'Create an index to start collecting search analytics.', 'instantsearch-for-wp' ) }
						</Notice>
					) : (
						<>
							<div className="instantsearch-admin-v2__stat-grid">
								<StatCard
									label={ __( 'Total Searches', 'instantsearch-for-wp' ) }
									value={ formatNumber( overview?.searches?.count ) }
								/>
								<StatCard
									label={ __( 'Total Users', 'instantsearch-for-wp' ) }
									value={ formatNumber( overview?.users?.count ) }
								/>
								<StatCard
									label={ __( 'No-Results Rate', 'instantsearch-for-wp' ) }
									value={
										typeof noResultRate === 'number'
											? `${ ( noResultRate * 100 ).toFixed( 1 ) }%`
											: '—'
									}
									help={
										typeof overview?.noResultRate?.noResultCount === 'number'
											? sprintf(
												/* translators: %s: number of searches with no results. */
												__( '%s searches returned no results', 'instantsearch-for-wp' ),
												formatNumber( overview.noResultRate.noResultCount )
											)
											: undefined
									}
								/>
							</div>

							<h3>{ __( 'Searches Over Time', 'instantsearch-for-wp' ) }</h3>
							<AreaChart data={ overview?.searches?.dates || [] } />
						</>
					) }
				</CardBody>
			</Card>
		</div>
	);
};

export default HomePage;
