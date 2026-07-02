<?php
/**
 * Admin class for WordPress admin interface
 *
 * @package YokoCo
 */

namespace InstantSearchForWP;

// Exit if accessed directly.
if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Admin class for managing WordPress admin interface
 */
class Admin {

	/**
	 * User meta key storing the per-user v2 dashboard preference.
	 *
	 * @since 1.1.0
	 *
	 * @var string
	 */
	const V2_USER_META_KEY = 'isfwp_dashboard_v2';

	/**
	 * Initialize the admin interface
	 *
	 * @since 1.0.0
	 */
	public function __construct() {
		add_action( 'admin_menu', array( $this, 'add_admin_menu' ) );
		add_action( 'admin_enqueue_scripts', array( $this, 'enqueue_admin_scripts' ) );
	}

	/**
	 * Register the per-user v2 dashboard preference so the admin apps can
	 * toggle it through the core REST API (/wp/v2/users/me).
	 *
	 * Called unconditionally from the Initializer (not only in wp-admin),
	 * because REST requests are not admin context.
	 *
	 * @since 1.1.0
	 *
	 * @return void
	 */
	public static function register_v2_preference_meta() {
		register_meta(
			'user',
			self::V2_USER_META_KEY,
			array(
				'type'          => 'boolean',
				'single'        => true,
				'default'       => false,
				'show_in_rest'  => true,
				'auth_callback' => function () {
					return current_user_can( 'manage_options' );
				},
			)
		);
	}

	/**
	 * Whether the current user has opted into the v2 dashboard.
	 *
	 * @since 1.1.0
	 *
	 * @return bool
	 */
	public function is_v2_enabled() {
		return (bool) get_user_meta( get_current_user_id(), self::V2_USER_META_KEY, true );
	}

	/**
	 * Add admin menu pages
	 *
	 * @since 1.0.0
	 */
	public function add_admin_menu() {
		add_menu_page(
			__( 'InstantSearch Settings', 'yoko-core' ),
			__( 'InstantSearch', 'yoko-core' ),
			'manage_options',
			'instantsearch-settings',
			array( $this, 'render_admin_page' ),
			'dashicons-search',
			30
		);
	}

	/**
	 * Render the main admin page
	 *
	 * @since 1.0.0
	 */
	public function render_admin_page() {
		?>
		<div class="wrap">
			<h1><?php esc_html_e( 'InstantSearch Settings', 'yoko-core' ); ?></h1>
			<div id="instantsearch-admin-app"></div>
		</div>
		<?php
	}

	/**
	 * Enqueue admin scripts and styles
	 *
	 * Enqueues either the v1 (build/admin.js) or v2 (build/admin-v2.js)
	 * dashboard bundle, based on the current user's preference. v1 remains
	 * the default until the user opts into v2.
	 *
	 * @since 1.0.0
	 * @param string $hook_suffix The current admin page hook suffix.
	 */
	public function enqueue_admin_scripts( $hook_suffix ) {
		// Only load on our admin page.
		if ( 'toplevel_page_instantsearch-settings' !== $hook_suffix ) {
			return;
		}

		$use_v2 = $this->is_v2_enabled();
		$handle = 'instantsearch-admin';
		$entry  = 'admin';

		if ( $use_v2 && file_exists( INSTANTSEARCH_FOR_WP_PATH . '/build/admin-v2.js' ) ) {
			$entry = 'admin-v2';
		} else {
			$use_v2 = false;
		}

		// Check if the built admin script exists.
		$admin_script_path = INSTANTSEARCH_FOR_WP_PATH . '/build/' . $entry . '.js';
		if ( ! file_exists( $admin_script_path ) ) {
			return;
		}

		$script_url = INSTANTSEARCH_FOR_WP_URL . 'build/' . $entry . '.js';
		$style_url  = INSTANTSEARCH_FOR_WP_URL . 'build/' . $entry . '.css';

		$asset_file = INSTANTSEARCH_FOR_WP_PATH . '/build/' . $entry . '.asset.php';
		if ( file_exists( $asset_file ) ) {
			$asset = require $asset_file;
		}

		wp_enqueue_script(
			$handle,
			$script_url,
			$asset['dependencies'] ?? array( 'wp-element', 'wp-i18n', 'wp-components', 'wp-api-fetch' ),
			$asset['version'] ?? INSTANTSEARCH_FOR_WP_VERSION,
			true
		);

		// Check if the built admin CSS exists.
		$admin_style_path = INSTANTSEARCH_FOR_WP_PATH . '/build/' . $entry . '.css';
		if ( file_exists( $admin_style_path ) ) {
			wp_enqueue_style(
				$handle,
				$style_url,
				array_filter(
					$asset['dependencies'] ?? array( 'wp-components' ),
					function ( $style ) {
						return wp_style_is( $style, 'registered' );
					}
				),
				$asset['version'] ?? INSTANTSEARCH_FOR_WP_VERSION
			);
		}

		$instantsearch_admin_data = array(
			'apiUrl'       => rest_url( 'instantsearch/v1/' ),
			'nonce'        => wp_create_nonce( 'wp_rest' ),
			'pluginUrl'    => INSTANTSEARCH_FOR_WP_URL,
			'indexPrefix'  => Settings::get_index_name( '' ),
			'dashboardV2'  => array(
				'enabled'     => $use_v2,
				'available'   => file_exists( INSTANTSEARCH_FOR_WP_PATH . '/build/admin-v2.js' ),
				'userMetaKey' => self::V2_USER_META_KEY,
			),
			'licensing'    => Licensing::get_js_data(),
			'provider'     => Settings::get_settings( 'provider' ),
		);

		// Localize script with configuration data.
		wp_localize_script(
			$handle,
			'instantsearchAdmin',
			$instantsearch_admin_data
		);

		wp_set_script_translations( $handle, 'yoko-core' );
	}
}
