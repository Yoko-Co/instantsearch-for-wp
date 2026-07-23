<?php
/**
 * Licensing Class
 *
 * Central place for Freemius-based feature gating. Multiple indexes are a
 * paid (Professional) feature; the free version is locked to a single index.
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
 * Licensing gates premium features via the Freemius SDK.
 */
class Licensing {

	/**
	 * Get the Freemius SDK instance, if available.
	 *
	 * @since 1.1.0
	 *
	 * @return \Freemius|null
	 */
	public static function freemius() {
		if ( function_exists( '\InstantSearchForWP\instantsearchforwp_fs' ) ) {
			return instantsearchforwp_fs();
		}
		return null;
	}

	/**
	 * Whether the current install may use premium code (paying or in trial).
	 *
	 * Uses can_use_premium_code() rather than is_paying() so trials and
	 * "features enabled after expiration" licenses are honored.
	 *
	 * @since 1.1.0
	 *
	 * @return bool
	 */
	public static function can_use_premium_code() {
		$fs = self::freemius();

		$can = $fs ? $fs->can_use_premium_code() : false;

		// Allow dev environments (e.g. Docker) to unlock premium features.
		if ( defined( 'INSTANTSEARCH_FOR_WP_UNLOCK_PREMIUM' ) && INSTANTSEARCH_FOR_WP_UNLOCK_PREMIUM ) {
			$can = true;
		}

		/**
		 * Filters whether premium code can be used.
		 *
		 * @since 1.1.0
		 *
		 * @param bool $can Whether premium features are unlocked.
		 */
		return (bool) apply_filters( 'instantsearch_for_wp_can_use_premium_code', $can );
	}

	/**
	 * Whether this install may create/use multiple indexes.
	 *
	 * The free version is locked to a single search index.
	 *
	 * @since 1.1.0
	 *
	 * @return bool
	 */
	public static function can_use_multiple_indexes() {
		/**
		 * Filters whether multiple indexes are allowed.
		 *
		 * @since 1.1.0
		 *
		 * @param bool $allowed Whether multiple indexes are allowed.
		 */
		return (bool) apply_filters( 'instantsearch_for_wp_allow_multiple_indexes', self::can_use_premium_code() );
	}

	/**
	 * Count published index CPT posts.
	 *
	 * @since 1.1.0
	 *
	 * @return int
	 */
	public static function get_index_count() {
		$counts = wp_count_posts( Index::$cpt_slug );
		return isset( $counts->publish ) ? (int) $counts->publish : 0;
	}

	/**
	 * Get Freemius licensing state formatted for the admin JS app.
	 *
	 * All flags are UI hints only — server-side enforcement happens in
	 * `enforce_index_limit()`.
	 *
	 * @since 1.1.0
	 *
	 * @return array
	 */
	public static function get_js_data() {
		$fs = self::freemius();

		return array(
			'canUseMultipleIndexes' => self::can_use_multiple_indexes(),
			'canUsePremiumCode'     => self::can_use_premium_code(),
			'isPremiumBuild'        => $fs ? $fs->is_premium() : false,
			'isTrial'               => $fs ? $fs->is_trial() : false,
			'isTrialUtilized'       => $fs ? $fs->is_trial_utilized() : false,
			'planName'              => $fs && $fs->is_registered() ? $fs->get_plan_name() : '',
			'upgradeUrl'            => $fs ? $fs->get_upgrade_url() : '',
			'trialUrl'              => $fs ? $fs->get_trial_url() : '',
		);
	}

	/**
	 * Register enforcement hooks.
	 *
	 * @since 1.1.0
	 *
	 * @return void
	 */
	public static function init() {
		add_filter( 'rest_pre_insert_' . Index::$cpt_slug, array( __CLASS__, 'enforce_index_limit' ), 10, 2 );
	}

	/**
	 * Block creation of more than one index on free plans (REST layer).
	 *
	 * @since 1.1.0
	 *
	 * @param \stdClass        $prepared_post Post object about to be inserted.
	 * @param \WP_REST_Request $request       Request object.
	 *
	 * @return \stdClass|\WP_Error
	 */
	public static function enforce_index_limit( $prepared_post, $request ) {
		// Updates to an existing index are always allowed.
		if ( ! empty( $prepared_post->ID ) ) {
			return $prepared_post;
		}

		if ( self::can_use_multiple_indexes() ) {
			return $prepared_post;
		}

		if ( self::get_index_count() >= 1 ) {
			return new \WP_Error(
				'instantsearch_for_wp_premium_required',
				__( 'Multiple indexes are a Professional feature. Upgrade InstantSearch for WP to create additional indexes.', 'instantsearch-for-wp' ),
				array( 'status' => 403 )
			);
		}

		return $prepared_post;
	}
}
