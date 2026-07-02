/**
 * Per-user dashboard version preference, stored in user meta and updated
 * through the core REST API.
 */
import apiFetch from '@wordpress/api-fetch';

const META_KEY =
	window.instantsearchAdmin?.dashboardV2?.userMetaKey || 'isfwp_dashboard_v2';

export const setDashboardV2Preference = async ( enabled ) => {
	try {
		await apiFetch( {
			path: '/wp/v2/users/me',
			method: 'POST',
			data: {
				meta: {
					[ META_KEY ]: !! enabled,
				},
			},
		} );
		return true;
	} catch ( e ) {
		// eslint-disable-next-line no-console
		console.error( 'Failed to save dashboard preference', e );
		return false;
	}
};
