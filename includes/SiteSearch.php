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
	 * Whether an Algolia SiteSearch experience (rather than the built-in
	 * InstantSearch.js UI) is active.
	 *
	 * @since 1.2.0
	 *
	 * @return bool
	 */
	public function is_sitesearch_experience() {
		return 'instant_search' !== Settings::get_search_experience();
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
	 * Get the dedicated Ask AI agent ID for the built-in conversational
	 * InstantSearch.js experience.
	 *
	 * @return string
	 */
	public function get_conversational_search_agent_id() {
		$settings = Settings::get_settings();
		$algolia  = isset( $settings['algolia'] ) && is_array( $settings['algolia'] ) ? $settings['algolia'] : array();
		$agent_id = ! empty( $algolia['conversational_search_agent_id'] )
			? sanitize_text_field( (string) $algolia['conversational_search_agent_id'] )
			: '';

		return (string) apply_filters( 'instantsearch_for_wp_conversational_search_agent_id', $agent_id );
	}

	/**
	 * Whether the built-in conversational search experience is fully active.
	 *
	 * @return bool
	 */
	public function is_conversational_search_active() {
		return $this->is_conversational_search_enabled() && '' !== $this->get_conversational_search_agent_id();
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
		// Algolia SiteSearch experiences render their own DOM into a simple
		// mount node; the built-in scaffold below is not used.
		if ( $this->is_sitesearch_experience() ) {
			// Fallback mount used when no Search Button block is on the page.
			echo '<div id="isfwp-sitesearch-root" data-isfwp-sitesearch="root"></div>';
			return;
		}

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

		$is_conversational_search = $this->is_conversational_search_active();
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
			<div id="algolia-chat-trigger"></div>
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

		// SiteSearch experiences render their own trigger button.
		if ( $this->is_sitesearch_experience() ) {
			return;
		}

		$is_conversational_search = $this->is_conversational_search_active();
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
				'conversationalChatTriggerPosition' => $settings['sitesearch_settings']['chat_trigger_position'] ?? 'right',
				'conversationalSearch'        => $this->is_conversational_search_active()
					? $this->get_conversational_search_agent_id()
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
		if ( $this->is_sitesearch_experience() ) {
			$this->enqueue_sitesearch_assets();
			return;
		}

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

	/**
	 * Build the init configuration for the active Algolia SiteSearch
	 * experience. Only the search-only API key is ever included — the config
	 * is printed in the page source.
	 *
	 * @since 1.2.0
	 *
	 * @return array
	 */
	public function get_sitesearch_config() {
		$settings   = Settings::get_settings();
		$experience = Settings::get_search_experience();
		$algolia    = isset( $settings['algolia'] ) && is_array( $settings['algolia'] ) ? $settings['algolia'] : array();
		$options    = wp_parse_args(
			isset( $settings['sitesearch_options'] ) && is_array( $settings['sitesearch_options'] ) ? $settings['sitesearch_options'] : array(),
			Settings::get_default_sitesearch_options()
		);

		/**
		 * Filters normalized SiteSearch options before frontend config assembly.
		 *
		 * @since 1.2.0
		 *
		 * @param array  $options    SiteSearch options.
		 * @param array  $settings   Full plugin settings.
		 * @param string $experience Active SiteSearch experience.
		 */
		$options = apply_filters( 'instantsearch_for_wp_sitesearch_options', $options, $settings, $experience );

		$app_id = ! empty( $algolia['app_id'] ) ? $algolia['app_id'] : '';
		if ( defined( 'ALGOLIA_APP_ID' ) && ALGOLIA_APP_ID ) {
			$app_id = ALGOLIA_APP_ID;
		}

		// Search-only key exclusively; never fall back to the admin key here.
		$search_key = ! empty( $algolia['search_only_api_key'] ) ? $algolia['search_only_api_key'] : '';
		if ( defined( 'ALGOLIA_SEARCH_ONLY_API_KEY' ) && ALGOLIA_SEARCH_ONLY_API_KEY ) {
			$search_key = ALGOLIA_SEARCH_ONLY_API_KEY;
		}
		$search_key = apply_filters( 'instantsearch_for_wp_algolia_search_only_api_key', $search_key );

		$attributes = isset( $options['attributes'] ) && is_array( $options['attributes'] ) ? $options['attributes'] : array();

		/**
		 * Filters SiteSearch attribute mapping before it is converted to
		 * frontend config keys.
		 *
		 * @since 1.2.0
		 *
		 * @param array  $attributes Raw SiteSearch attributes option.
		 * @param array  $options    Normalized SiteSearch options.
		 * @param string $experience Active SiteSearch experience.
		 */
		$attributes = apply_filters( 'instantsearch_for_wp_sitesearch_attributes', $attributes, $options, $experience );

		$attributes = wp_parse_args(
			is_array( $attributes ) ? $attributes : array(),
			array(
				'primary_text'   => 'title',
				'secondary_text' => 'excerpt',
				'tertiary_text'  => 'post_type',
				'url'            => 'url',
				'image'          => 'image',
			)
		);

		$config = array(
			'experience'             => $experience,
			'jsGlobal'               => Settings::get_sitesearch_bundle( $experience, 'global' ),
			'applicationId'          => $app_id,
			'apiKey'                 => $search_key,
			'indexName'              => Settings::get_index_name( ! empty( $settings['use_as_sitesearch'] ) ? $settings['use_as_sitesearch'] : null ),
			'attributes'             => array(
				'primaryText'   => $attributes['primary_text'],
				'secondaryText' => $attributes['secondary_text'],
				'tertiaryText'  => $attributes['tertiary_text'],
				'url'           => $attributes['url'],
				'image'         => $attributes['image'],
			),
			'placeholder'            => $options['placeholder_text'],
			'buttonText'             => $options['button_text'],
			'hitsPerPage'            => (int) $options['hits_per_page'],
			'darkMode'               => $options['dark_mode'],
			'insights'               => (bool) $options['insights'],
			'triggerSelectors'       => $settings['sitesearch_settings']['trigger_selectors'] ?? '',
		);

		if ( in_array( $experience, array( 'sitesearch_askai', 'sitesearch_sidepanel' ), true ) ) {
			$config['assistantId']               = $algolia['ask_ai_agent_id'] ?? '';
			$config['agentStudio']               = (bool) $options['agent_studio'];
			$config['suggestedQuestionsEnabled'] = (bool) $options['suggested_questions_enabled'];
		}

		/**
		 * Filters the Algolia SiteSearch init configuration.
		 *
		 * @since 1.2.0
		 *
		 * @param array  $config     Init configuration passed to the frontend.
		 * @param string $experience Active experience.
		 */
		return apply_filters( 'instantsearch_for_wp_sitesearch_config', $config, $experience );
	}

	/**
	 * Enqueue the vendored Algolia SiteSearch bundle plus the plugin's init
	 * and trigger-proxy script.
	 *
	 * @since 1.2.0
	 *
	 * @return void
	 */
	private function enqueue_sitesearch_assets() {
		$experience = Settings::get_search_experience();
		$bundle     = Settings::get_sitesearch_bundle( $experience );

		if ( ! $bundle ) {
			return;
		}

		$bundle_path = INSTANTSEARCH_FOR_WP_PATH . '/build/sitesearch/' . $bundle;
		$bundle_url  = INSTANTSEARCH_FOR_WP_URL . 'build/sitesearch/' . $bundle;

		if ( ! file_exists( $bundle_path . '.min.js' ) ) {
			return;
		}

		// Vendored library bundle (self-contained UMD, includes React).
		wp_enqueue_script(
			'instantsearch-for-wp-sitesearch-lib',
			$bundle_url . '.min.js',
			array(),
			INSTANTSEARCH_FOR_WP_SITESEARCH_VERSION,
			true
		);

		if ( file_exists( $bundle_path . '.min.css' ) ) {
			wp_enqueue_style(
				'instantsearch-for-wp-sitesearch-lib',
				$bundle_url . '.min.css',
				array(),
				INSTANTSEARCH_FOR_WP_SITESEARCH_VERSION
			);
		}

		// Plugin glue: init on block mounts / footer root, dark-mode auto,
		// legacy trigger-selector proxying.
		$frontend_script = INSTANTSEARCH_FOR_WP_PATH . '/build/sitesearch-frontend.js';
		if ( ! file_exists( $frontend_script ) ) {
			return;
		}

		$asset_file = INSTANTSEARCH_FOR_WP_PATH . '/build/sitesearch-frontend.asset.php';
		$asset      = file_exists( $asset_file ) ? require $asset_file : array();

		wp_enqueue_script(
			'instantsearch-for-wp-sitesearch',
			INSTANTSEARCH_FOR_WP_URL . 'build/sitesearch-frontend.js',
			array_merge( $asset['dependencies'] ?? array(), array( 'instantsearch-for-wp-sitesearch-lib' ) ),
			$asset['version'] ?? INSTANTSEARCH_FOR_WP_VERSION,
			true
		);

		$frontend_style = INSTANTSEARCH_FOR_WP_PATH . '/build/sitesearch-frontend.css';
		if ( file_exists( $frontend_style ) ) {
			wp_enqueue_style(
				'instantsearch-for-wp-sitesearch-overrides',
				INSTANTSEARCH_FOR_WP_URL . 'build/sitesearch-frontend.css',
				array( 'instantsearch-for-wp-sitesearch-lib' ),
				$asset['version'] ?? INSTANTSEARCH_FOR_WP_VERSION
			);
		}

		wp_localize_script(
			'instantsearch-for-wp-sitesearch',
			'instantSearchForWPSiteSearch',
			$this->get_sitesearch_config()
		);
	}
}
