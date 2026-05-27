<?php

namespace InstantSearchForWP;

class SiteSearch {

	/**
	 * Constructor to set up hooks for site search functionality.
	 *
	 * @since 1.0.0
	 */
	public function __construct() {
		// Add the root DOM <div> for InstantSearch.js.
		add_action( 'wp_footer', array( $this, 'add_instantsearch_root_div' ) );

		// Add the floating search trigger button.
		add_action( 'wp_footer', array( $this, 'add_search_trigger_button' ) );

		// Enqueue frontend scripts and styles.
		add_action( 'wp_enqueue_scripts', array( $this, 'enqueue_scripts' ) );

		// Connect CSS Selector option to the search trigger query selectors filter.
		add_filter(
			'instantsearch_for_wp_search_trigger_query_selectors',
			array( $this, 'connect_css_selector_option_to_filter' ),
			9
		);
	}

	/**
	 * Check if conversational search is enabled in settings.
	 *
	 * @return bool True if conversational search is enabled, false otherwise.
	 */
	public function is_conversational_search_enabled() {
		$settings = Settings::get_settings();
		return apply_filters( 'instantsearch_for_wp_conversational_search_enabled', $settings['conversational_search'] ?? true );
	}

	/**
	 * Check if AI summaries are enabled and valid for Algolia.
	 *
	 * @return bool
	 */
	public function is_ai_summaries_enabled() {
		$settings = Settings::get_settings();

		if ( empty( $settings['provider'] ) || 'algolia' !== $settings['provider'] ) {
			return false;
		}

		$algolia = isset( $settings['algolia'] ) && is_array( $settings['algolia'] ) ? $settings['algolia'] : array();

		return ! empty( $algolia['ai_summaries_enabled'] ) && ! empty( $algolia['ask_ai_agent_id'] );
	}

	/**
	 * Check whether the Powered by Algolia badge should be rendered.
	 *
	 * @return bool
	 */
	public function should_render_powered_by_algolia() {
		$settings = Settings::get_settings();
		$algolia  = isset( $settings['algolia'] ) && is_array( $settings['algolia'] ) ? $settings['algolia'] : array();

		return empty( $algolia['hide_algolia_badge'] );
	}

	/**
	 * Add the root DOM <div> for InstantSearch.js
	 *
	 * @return void
	 */
	public function add_instantsearch_root_div() {
		$settings       = Settings::get_settings();
		$search_classes = array();

		if ( isset( $settings['sitesearch_settings']['sidebar_position'] ) && 'right' === $settings['sitesearch_settings']['sidebar_position'] ) {
			$search_classes[] = 'isfwp-sidebar-right';
		} else {
			$search_classes[] = 'isfwp-sidebar-left';
		}

		// Get the ID of the custom logo.
		$custom_logo_id = get_theme_mod( 'custom_logo' );

		// Get the image attributes (URL, width, height, etc.).
		// The 'full' size is used here, but you can specify other sizes like 'thumbnail', 'medium', or a custom size.
		$image = wp_get_attachment_image_src( $custom_logo_id , 'full' );

		// Check if an image was found and output the URL.
		if ( $image ) {
			$logo_url = $image[0];
		}

		$is_conversational_search = $this->is_conversational_search_enabled();
		$is_ai_summaries_enabled  = $this->is_ai_summaries_enabled();
		$show_powered_by_algolia  = $this->should_render_powered_by_algolia();
		?>
		<div id="isfwp-site-search" class="<?php echo esc_attr( implode( ' ', $search_classes ) ); ?>">
			<div class="isfwp-site-search-topbar">
				<div class="site-search-brand">
					<?php if ( isset( $logo_url ) ) : ?>
						<img src="<?php echo esc_url( $logo_url ); ?>" alt="<?php bloginfo( 'name' ); ?>" />
					<?php else : ?>
						<?php bloginfo( 'name' ); ?>
					<?php endif; ?>
				</div>
				<a class="isfwp-site-search-close">&times;</a>
			</div>
			<div class="isfwp-site-search-header">
				<div class="isfwp-site-search-container">
					<div id="isfwp-site-search-input"></div>
					<?php if ( $show_powered_by_algolia ) : ?>
						<div id="isfwp-powered-by-algolia"></div>
					<?php endif; ?>
				</div>
			</div>
			<div class="isfwp-site-search-main">
				<div class="isfwp-site-search-container isfwp-site-search-stats-container">
					<div id="isfwp-site-search-clear-refinements"></div>
					<div id="isfwp-site-search-stats"></div>
				</div>
				<div class="isfwp-site-search-container">
					<div id="isfwp-site-search-sidebar"></div>
					<div id="isfwp-site-search-results">
						<?php if ( $is_ai_summaries_enabled ) : ?>
							<div id="isfwp-site-search-summary" aria-live="polite" hidden="hidden"></div>
						<?php endif; ?>
						<div id="isfwp-site-search-hits"></div>
					</div>
				</div>
			</div>
		</div>
		<?php if ( $is_conversational_search ) : ?>
			<div id="algolia-chat"></div>
		<?php endif; ?>
		<?php
	}

	/**
	 * Add a floating search trigger button to the page.
	 *
	 * @return void
	 */
	public function add_search_trigger_button() {

		$is_conversational_search = $this->is_conversational_search_enabled();
		// Only show the search trigger if conversational search is disabled, or if it's enabled but the user hasn't opted to hide the trigger.
		if ( $is_conversational_search && apply_filters( 'instantsearch_for_wp_hide_search_trigger_with_conversational_search', true ) ) {
			return;
		}
		?>
		<button class="isfwp-search-trigger isfwp-floating-trigger" aria-label="<?php esc_attr_e( 'Open search', 'instantsearch-for-wp' ); ?>">
			<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
				<circle cx="11" cy="11" r="8"></circle>
				<line x1="21" y1="21" x2="16.65" y2="16.65"></line>
			</svg>
		</button>
		<?php
	}

	/**
	 * Get InstantSearch configuration for frontend.
	 *
	 * @return array Configuration array for InstantSearch.js
	 */
	public function get_instantsearch_config() {
		$settings = Settings::get_settings();

		// Get all public taxonomies for slug => title dictionary.
		$taxonomies      = get_taxonomies( array( 'public' => true ), 'objects' );
		$taxonomy_titles = array();
		foreach ( $taxonomies as $slug => $taxonomy ) {
			$taxonomy_titles[ 'taxonomy.' . $slug ] = $taxonomy->label;
		}

		return apply_filters(
			'instantsearch_for_wp_instantsearch_config',
			array(
				'provider' 				      => $settings['provider'],
				'indexName'                   => Settings::get_index_name( $settings['use_as_sitesearch'] ),
				'facetTitles'                 => array_merge(
					array(
						'post_type' => __( 'Post Type', 'instantsearch-for-wp' ),
					),
					$taxonomy_titles
				),
				'searchTriggerQuerySelectors' => $settings['sitesearch_settings']['trigger_selectors'] ?? '.isfwp-search-trigger,.menu-item .fl-search-form .fl-button-wrap > a,.swp-input--search',
				'sitesearchSettings'          => $settings['sitesearch_settings'] ?? array(),
				'conversationalSearch'        => $this->is_conversational_search_enabled()
					? apply_filters( 'instantsearch_for_wp_conversational_search_agent_id', null )
					: false,
				'aiSummaries'                 => array(
					'enabled'  => $this->is_ai_summaries_enabled(),
					'agentId'  => $settings['algolia']['ask_ai_agent_id'] ?? '',
					'disclaimer' => $settings['algolia']['ai_disclaimer'] ?? '',
				),
			)
		);
	}

	/**
	 * Enqueue frontend scripts and styles for InstantSearch.js.
	 * 
	 * @return void
	 */
	public function enqueue_scripts() {
		$instantsearch_script_path = INSTANTSEARCH_FOR_WP_PATH . '/build/instantsearch.js';
		if ( ! file_exists( $instantsearch_script_path ) ) {
			return;
		}

		$script_url = INSTANTSEARCH_FOR_WP_URL . 'build/instantsearch.js';
		$style_url  = INSTANTSEARCH_FOR_WP_URL . 'build/instantsearch.css';

		$asset_file = INSTANTSEARCH_FOR_WP_PATH . '/build/instantsearch.asset.php';
		if ( file_exists( $asset_file ) ) {
			$assets = require $asset_file;
		}

		$dependencies = isset( $assets['dependencies'] ) ? $assets['dependencies'] : array( 'wp-element' );
		// If the wp-hooks package isn't included in the build, ensure that 'wp-hooks' is added as a dependency for the frontend script.
		if ( ! in_array( 'wp-hooks', $dependencies, true ) ) {
			$dependencies[] = 'wp-hooks';
		}

		wp_enqueue_script(
			'instantsearch-for-wp-frontend',
			$script_url,
			$dependencies,
			isset( $assets['version'] ) ? $assets['version'] : INSTANTSEARCH_FOR_WP_VERSION,
			true
		);

		// Check if the built frontend CSS exists.
		$instantsearch_style_path = INSTANTSEARCH_FOR_WP_PATH . '/build/instantsearch.css';
		if ( file_exists( $instantsearch_style_path ) ) {
			wp_enqueue_style(
				'instantsearch-for-wp-frontend',
				$style_url,
				array_filter(
					isset( $assets['dependencies'] ) ? $assets['dependencies'] : array( 'wp-components' ),
					function ( $style ) {
						return wp_style_is( $style, 'registered' );
					}
				),
				isset( $assets['version'] ) ? $assets['version'] : INSTANTSEARCH_FOR_WP_VERSION
			);
		}

		// Localize script with configuration data.
		wp_localize_script(
			'instantsearch-for-wp-frontend',
			'instantSearchForWPFrontend',
			$this->get_instantsearch_config()
		);
	}

	public function connect_css_selector_option_to_filter( $selectors ) {
		$settings = Settings::get_settings();
		if ( ! empty( $settings['sitesearch_settings']['trigger_selectors'] ) ) {
			$custom_selectors = array_map( 'trim', explode( ',', $settings['sitesearch_settings']['trigger_selectors'] ) );
			$selectors        = array_merge( $selectors, $custom_selectors );
		}
		return $selectors;
	}
}
