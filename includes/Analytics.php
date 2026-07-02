<?php
/**
 * Analytics Class
 *
 * Proxies the Algolia Analytics API for the v2 dashboard home page widgets.
 * Requests are made server-side with the admin API key (analytics ACL) so the
 * key is never exposed to the browser.
 *
 * @package InstantSearchForWP
 * @since 1.1.0
 */

namespace InstantSearchForWP;

// Exit if accessed directly.
if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Analytics REST endpoints (Algolia provider).
 */
class Analytics {

	/**
	 * Transient cache lifetime in seconds.
	 *
	 * @var int
	 */
	const CACHE_TTL = 5 * MINUTE_IN_SECONDS;

	/**
	 * Constructor registers REST routes.
	 *
	 * @since 1.1.0
	 */
	public function __construct() {
		add_action( 'rest_api_init', array( $this, 'register_routes' ) );
	}

	/**
	 * Register analytics REST routes.
	 *
	 * @since 1.1.0
	 *
	 * @return void
	 */
	public function register_routes() {
		register_rest_route(
			'instantsearch-for-wp/v1',
			'/analytics/overview',
			array(
				'methods'             => 'GET',
				'callback'            => array( $this, 'get_overview' ),
				'permission_callback' => function () {
					return current_user_can( 'manage_options' );
				},
				'args'                => array(
					'index' => array(
						'required'          => true,
						'type'              => 'string',
						'sanitize_callback' => 'sanitize_text_field',
					),
					'days'  => array(
						'required' => false,
						'type'     => 'integer',
						'default'  => 30,
						'enum'     => array( 7, 30, 90 ),
					),
				),
			)
		);
	}

	/**
	 * Get analytics overview: total searches, total users, no-results rate,
	 * and searches over time for the requested index.
	 *
	 * @since 1.1.0
	 *
	 * @param \WP_REST_Request $request Request instance.
	 *
	 * @return \WP_REST_Response|\WP_Error
	 */
	public function get_overview( $request ) {
		$provider = Settings::get_settings( 'provider' );
		if ( 'algolia' !== $provider ) {
			return new \WP_Error(
				'instantsearch_for_wp_analytics_provider_not_supported',
				__( 'Analytics widgets are currently only available for the Algolia provider.', 'instantsearch-for-wp' ),
				array( 'status' => 400 )
			);
		}

		$credentials = $this->get_credentials();
		if ( is_wp_error( $credentials ) ) {
			return $credentials;
		}

		$index = $request->get_param( 'index' );
		$days  = (int) $request->get_param( 'days' );

		$end_date   = gmdate( 'Y-m-d' );
		$start_date = gmdate( 'Y-m-d', strtotime( '-' . $days . ' days' ) );

		$cache_key = 'isfwp_analytics_' . md5( $index . $start_date . $end_date );
		$cached    = get_transient( $cache_key );
		if ( false !== $cached ) {
			return rest_ensure_response( $cached );
		}

		$query_args = array(
			'index'     => $index,
			'startDate' => $start_date,
			'endDate'   => $end_date,
		);

		$searches       = $this->fetch( '/2/searches/count', $query_args, $credentials );
		$users          = $this->fetch( '/2/users/count', $query_args, $credentials );
		$no_result_rate = $this->fetch( '/2/searches/noResultRate', $query_args, $credentials );

		// Surface a hard failure only when everything failed (e.g. bad key).
		if ( is_wp_error( $searches ) && is_wp_error( $users ) && is_wp_error( $no_result_rate ) ) {
			return $searches;
		}

		$overview = array(
			'index'        => $index,
			'startDate'    => $start_date,
			'endDate'      => $end_date,
			'searches'     => is_wp_error( $searches ) ? null : $searches,
			'users'        => is_wp_error( $users ) ? null : $users,
			'noResultRate' => is_wp_error( $no_result_rate ) ? null : $no_result_rate,
		);

		set_transient( $cache_key, $overview, self::CACHE_TTL );

		return rest_ensure_response( $overview );
	}

	/**
	 * Fetch a path from the Algolia Analytics API.
	 *
	 * @since 1.1.0
	 *
	 * @param string $path        Analytics API path (e.g. '/2/searches/count').
	 * @param array  $query_args  Query string arguments.
	 * @param array  $credentials Array with app_id and api_key.
	 *
	 * @return array|\WP_Error Decoded JSON body or error.
	 */
	private function fetch( $path, array $query_args, array $credentials ) {
		/**
		 * Filters the Algolia Analytics API base URL.
		 *
		 * Use the region-specific host (e.g. https://analytics.de.algolia.com)
		 * if your Algolia application is pinned to a region.
		 *
		 * @since 1.1.0
		 *
		 * @param string $base_url Analytics API base URL.
		 */
		$base_url = apply_filters( 'instantsearch_for_wp_analytics_base_url', 'https://analytics.algolia.com' );

		$url = add_query_arg( array_map( 'rawurlencode', $query_args ), $base_url . $path );

		$response = wp_remote_get(
			$url,
			array(
				'timeout' => 15,
				'headers' => array(
					'X-Algolia-Application-Id' => $credentials['app_id'],
					'X-Algolia-API-Key'        => $credentials['api_key'],
				),
			)
		);

		if ( is_wp_error( $response ) ) {
			return new \WP_Error(
				'instantsearch_for_wp_analytics_request_failed',
				$response->get_error_message(),
				array( 'status' => 502 )
			);
		}

		$status = wp_remote_retrieve_response_code( $response );
		$body   = json_decode( wp_remote_retrieve_body( $response ), true );

		if ( 200 !== $status ) {
			return new \WP_Error(
				'instantsearch_for_wp_analytics_upstream_error',
				! empty( $body['message'] )
					? $body['message']
					: sprintf(
						/* translators: %d: HTTP status code. */
						__( 'Algolia Analytics API returned HTTP %d.', 'instantsearch-for-wp' ),
						$status
					),
				array( 'status' => 502 )
			);
		}

		return is_array( $body ) ? $body : array();
	}

	/**
	 * Get Algolia credentials for the Analytics API.
	 *
	 * Analytics requires a key with the `analytics` ACL — the admin API key
	 * has it by default.
	 *
	 * @since 1.1.0
	 *
	 * @return array|\WP_Error
	 */
	private function get_credentials() {
		$settings = Settings::get_settings();
		$algolia  = isset( $settings['algolia'] ) && is_array( $settings['algolia'] ) ? $settings['algolia'] : array();

		$app_id = ! empty( $algolia['app_id'] ) ? $algolia['app_id'] : '';
		if ( defined( 'ALGOLIA_APP_ID' ) && ALGOLIA_APP_ID ) {
			$app_id = ALGOLIA_APP_ID;
		}

		$api_key = ! empty( $algolia['admin_api_key'] ) ? $algolia['admin_api_key'] : '';
		if ( defined( 'ALGOLIA_ADMIN_API_KEY' ) && ALGOLIA_ADMIN_API_KEY ) {
			$api_key = ALGOLIA_ADMIN_API_KEY;
		} elseif ( ! $api_key && defined( 'ALGOLIA_API_KEY' ) && ALGOLIA_API_KEY ) {
			$api_key = ALGOLIA_API_KEY;
		}

		if ( ! $app_id || ! $api_key ) {
			return new \WP_Error(
				'instantsearch_for_wp_analytics_missing_config',
				__( 'Algolia Application ID and Admin API Key are required for analytics.', 'instantsearch-for-wp' ),
				array( 'status' => 400 )
			);
		}

		return array(
			'app_id'  => $app_id,
			'api_key' => $api_key,
		);
	}
}
