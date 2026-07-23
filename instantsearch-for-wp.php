<?php // phpcs:ignore WordPress.Files.FileName.InvalidClassFileName
/**
 * Plugin Name:       InstantSearch for WP
 * Plugin URI:        https://www.yokoco.com
 * Description:       A provider agnostic implementation of InstantSearch.js for WordPress with Gutenberg Blocks.
 * Author:            Konstantin Brazhnik <konst@ntin.solutions>
 * Author URI:        https://www.yokoco.com
 * Text Domain:       instantsearch-for-wp
 * Domain Path:       /languages
 * Version:           1.0.1
 * GitHub Plugin URI: https://github.com/Yoko-Co/instantsearch-for-wp
 * Release Asset:     true
 * Primary Branch:    main
 *
 * @package         YokoCo
 */

namespace InstantSearchForWP;

define( 'INSTANTSEARCH_FOR_WP_PATH', __DIR__ );
define( 'INSTANTSEARCH_FOR_WP_FILE', __FILE__ );
define( 'INSTANTSEARCH_FOR_WP_VERSION', '1.0.1' );
define( 'INSTANTSEARCH_FOR_WP_URL', plugin_dir_url( __FILE__ ) );
// Pinned @algolia/sitesearch package version (vendored bundles in build/sitesearch).
define( 'INSTANTSEARCH_FOR_WP_SITESEARCH_VERSION', '1.0.14' );

if ( is_dir( plugin_dir_path( __FILE__ ) . '/vendor' ) ) {
	require_once __DIR__ . '/vendor/woocommerce/action-scheduler/action-scheduler.php';
	require_once plugin_dir_path( __FILE__ ) . '/vendor/autoload.php';
}


if ( function_exists( '\InstantSearchForWP\instantsearchforwp_fs' ) ) {
	instantsearchforwp_fs()->set_basename( true, __FILE__ );
} else {
	/**
	 * DO NOT REMOVE THIS IF, IT IS ESSENTIAL FOR THE
	 * `function_exists` CALL ABOVE TO PROPERLY WORK.
	 */
	if ( ! function_exists( '\InstantSearchForWP\instantsearchforwp_fs' ) ) {

		/**
		 * Create a helper function for easy SDK access.
		 *
		 * @return \Freemius
		 */
		function instantsearchforwp_fs() {
			global $instantsearchforwp_fs;

			if ( ! isset( $instantsearchforwp_fs ) ) {
				// Activate multisite network integration.
				if ( ! defined( 'WP_FS__PRODUCT_22607_MULTISITE' ) ) {
					define( 'WP_FS__PRODUCT_22607_MULTISITE', true );
				}

				// Include Freemius SDK.
				// SDK is auto-loaded through Composer

				$instantsearchforwp_fs = fs_dynamic_init(
					array(
						'id'                  => '22607',
						'slug'                => 'instantsearch-for-wordpress',
						'premium_slug'        => 'instantsearch-for-wp-premium',
						'type'                => 'plugin',
						'public_key'          => 'pk_8d3a77ebf22299568e8290ce29711',
						'is_premium'          => true,
						'premium_suffix'      => 'Professional',
						// If your plugin is a serviceware, set this option to false.
						'has_premium_version' => true,
						'has_addons'          => false,
						'has_paid_plans'      => true,
						// Automatically removed in the free version. If you're not using the
						// auto-generated free version, delete this line before uploading to wp.org.
						'wp_org_gatekeeper'   => 'OA7#BoRiBNqdf52FvzEf!!074aRLPs8fspif$7K1#4u4Csys1fQlCecVcUTOs2mcpeVHi#C2j9d09fOTvbC0HloPT7fFee5WdS3G',
						'trial'               => array(
							'days'               => 14,
							'is_require_payment' => false,
						),
						'menu'                => array(
							'slug'           => 'instantsearch-settings',
							'network'        => true,
						),
					)
				);
			}

			return $instantsearchforwp_fs;
		}

		// Init Freemius.
		instantsearchforwp_fs();
		// Signal that SDK was initiated.
		do_action( 'instantsearchforwp_fs_loaded' );
	}

	/**
	 * InstantSearch for WP Class
	 *
	 * @since 1.0.0
	 */
	class InstantSearchForWP {

		/**
		 * Holds the class instance.
		 *
		 * @var InstantSearchForWP $instance
		 */
		private static $instance = null;

		/**
		 * Return an instance of the class
		 *
		 * Return an instance of the InstantSearchForWP Class.
		 *
		 * @since 1.0.0
		 *
		 * @return InstantSearchForWP class instance.
		 */
		public static function get_instance() {
			if ( null === self::$instance ) {
				self::$instance = new self();
			}
			return self::$instance;
		}

		/**
		 * Init all the things.
		 */
		public function init() {
			add_action(
				'init',
				function () {
					load_plugin_textdomain(
						'instantsearch-for-wp',
						false,
						basename( __DIR__ ) . '/languages'
					);
				},
				1
			);

			$activated_plugin_setting = 'instantsearch_for_wp_version';
			$activated_plugin_version = get_option( $activated_plugin_setting, '1.0.0' );
			if ( version_compare( $activated_plugin_version, INSTANTSEARCH_FOR_WP_VERSION, '<' ) ) {
				update_option( $activated_plugin_setting, INSTANTSEARCH_FOR_WP_VERSION );
				do_action( 'instantsearch_for_wp_plugin_updated', $activated_plugin_version, INSTANTSEARCH_FOR_WP_VERSION );
			}

			new Initializer();

			// Run plugin init code here.
			do_action( 'instantsearch_for_wp_plugin_init' );
		}

		 /**
		  * Load plugin textdomain for translations.
		  *
		  * @since 1.0.0
		  *
		  * @return void
		  */
		public function load_textdomain() {
			load_plugin_textdomain(
				'instantsearch-for-wp',
				false,
				basename( __DIR__ ) . '/languages'
			);
		}
	}

	add_action(
		'plugins_loaded',
		function () {
			$instantsearch_for_wp = InstantSearchForWP::get_instance();
			$instantsearch_for_wp->init();
		}
	);

	add_action(
		'init',
		function () {
			$instantsearch_for_wp = InstantSearchForWP::get_instance();
			$instantsearch_for_wp->load_textdomain();
		}
	);
}
