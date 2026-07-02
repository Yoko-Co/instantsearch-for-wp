/**
 * Prompt shown in the v1 dashboard inviting users to try Dashboard v2.
 *
 * Toggling stores a per-user preference (user meta) via the core REST API
 * and reloads the page so the v2 bundle is enqueued instead.
 */
import apiFetch from '@wordpress/api-fetch';
import { useState } from '@wordpress/element';
import { __ } from '@wordpress/i18n';
import { Button, Notice } from '@wordpress/components';

const TryV2Notice = () => {
	const [ switching, setSwitching ] = useState( false );
	const [ dismissed, setDismissed ] = useState( false );
	const [ error, setError ] = useState( false );

	const dashboardV2 = window.instantsearchAdmin?.dashboardV2;

	// Only offer the prompt when the v2 bundle is built and not already active.
	if ( ! dashboardV2?.available || dashboardV2?.enabled || dismissed ) {
		return null;
	}

	const handleTryV2 = async () => {
		setSwitching( true );
		setError( false );
		try {
			await apiFetch( {
				path: '/wp/v2/users/me',
				method: 'POST',
				data: {
					meta: {
						[ dashboardV2.userMetaKey || 'isfwp_dashboard_v2' ]: true,
					},
				},
			} );
			window.location.hash = '';
			window.location.reload();
		} catch ( e ) {
			setError( true );
			setSwitching( false );
		}
	};

	return (
		<Notice
			status="info"
			className="instantsearch-admin__try-v2"
			onRemove={ () => setDismissed( true ) }
		>
			{ error
				? __( 'Could not switch dashboards. Please try again.', 'instantsearch-for-wp' )
				: __( 'A new dashboard experience is available — analytics, multiple indexes, and improved navigation.', 'instantsearch-for-wp' ) }{ ' ' }
			<Button
				variant="link"
				disabled={ switching }
				onClick={ handleTryV2 }
			>
				{ switching
					? __( 'Switching…', 'instantsearch-for-wp' )
					: __( 'Try v2 of the InstantSearch for WP Dashboard', 'instantsearch-for-wp' ) }
			</Button>
		</Notice>
	);
};

export default TryV2Notice;
