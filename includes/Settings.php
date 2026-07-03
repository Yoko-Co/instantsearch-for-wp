<?php

namespace InstantSearchForWP;

/**
 * Settings Class
 *
 * This class handles the registration and management of settings for the InstantSearch for WP plugin.
 *
 * @package InstantSearchForWP
 * @since 1.0.0
 */
class Settings {

	/**
	 * Option name for storing settings.
	 *
	 * @since 1.0.0
	 *
	 * @var string
	 */
	public static string $option_name = 'instantsearch_for_wp_settings';

	/**
	 * Post types to ignore during indexing.
	 *
	 * @since 1.0.0
	 *
	 * @var array
	 */
	/**
	 * Valid search experience values.
	 *
	 * `instant_search` is the plugin's built-in InstantSearch.js UI. The
	 * `sitesearch_*` values map to Algolia SiteSearch experiences
	 * (https://sitesearch.algolia.com/), rendered from vendored bundles.
	 *
	 * @since 1.2.0
	 *
	 * @var array
	 */
	public static array $search_experiences = array(
		'instant_search',
		'sitesearch_modal',
		'sitesearch_askai',
		'sitesearch_sidepanel',
	);

	public static array $ignored_post_types = array(
		'revision',
		'nav_menu_item',
		'custom_css',
		'customize_changeset',
		'oembed_cache',
		'user_request',
		'wp_block',
		'wp_template',
		'wp_template_part',
		// Beaver Builder.
		'fl-builder-template',
		'fl-theme-layout',
		'fl-builder-history',
		'elementor_library',
		'ct_template',
		'popup',
		'ae_global_template',
		'ae_template',
		'ml-slider',
	);

	/**
	 * Constructor to hook into WordPress initialization.
	 *
	 * @since 1.0.0
	 */
	public function __construct() {
		add_action( 'init', array( $this, 'instantsearch_for_wp_settings' ) );
	}

	/**
	 * Get ignored post types
	 *
	 * @since 1.0.0
	 *
	 * @return array Array of ignored post types.
	 */
	public static function get_ignored_post_types() {
		return apply_filters( 'instantsearch_for_wp_ignored_post_types', self::$ignored_post_types );
	}

	/**
	 * Get settings from the database
	 *
	 * @since 1.0.0
	 *
	 * @param string|null $key Specific setting key to retrieve.
	 *
	 * @return mixed The settings array or specific setting value.
	 */
	public static function get_settings( $key = null ) {
		$settings = get_option( self::$option_name, array() );

		$default_settings = self::get_default_settings();

		$settings = wp_parse_args( $settings, $default_settings );

		if ( null !== $key && is_string( $key ) && array_key_exists( $key, $settings ) ) {
			return $settings[ $key ];
		}

		return $settings;
	}

	/**
	 * Get the name of the index to be used in the external service.
	 *
	 * @since 1.0.0
	 *
	 * @param string|null $index_name Optional index name.
	 *
	 * @return string The name of the index.
	 */
	public static function get_index_name( string $index_name = null ) {

		if ( null === $index_name || true === $index_name || "1" === $index_name ) {
			$index = new Index();

			if ( $index->name ) {
				$index_name = $index->index_post->post_name;
			} else {
				$index_name = 'search';
			}
		}

		$site_domain = wp_parse_url( get_bloginfo( 'url' ), PHP_URL_HOST );

		return apply_filters(
			'instantsearch_index_name',
			sanitize_title( $site_domain . '_' . $index_name )
		);

	}

	/**
	 * Get default settings for the plugin
	 *
	 * @since 1.0.0
	 *
	 * @return array Default settings array.
	 */
	public static function get_default_settings() {

		$public_post_types = get_post_types(
			array(
				'public' => true,
			)
		);

		// Exclude ignored post types.
		$public_post_types = array_diff( $public_post_types, self::get_ignored_post_types() );

		// Filter out any post types that should not be indexed.
		$public_post_types = apply_filters( 'instantsearch_for_wp_default_indexable_post_types', $public_post_types );

		$default_settings = array(
			'provider'            => 'algolia',
			'use_as_sitesearch'   => false,
			'conversational_search' => true,
			'search_experience'   => 'instant_search',
			'sitesearch_options'  => self::get_default_sitesearch_options(),
			'sitesearch_settings' => array(
				'placeholder_text'      => __( 'Search...', 'instantsearch-for-wp' ),
				'sidebar_position'      => 'left',
				'chat_trigger_position' => 'right',
				'snippet_length'        => 50,
				'trigger_selectors' => '.isfwp-search-trigger,.menu-item .fl-search-form .fl-button-wrap > a,.swp-input--search',
				'debounce_delay'    => 0,
			),
		);

		// Filter the default settings.
		$default_settings = apply_filters( 'instantsearch_for_wp_default_settings', $default_settings );

		return $default_settings;
	}

	/**
	 * Get the active, validated search experience.
	 *
	 * Falls back to `instant_search` when the stored value is invalid, the
	 * provider is not Algolia, or the required vendored SiteSearch bundle is
	 * missing from the build directory.
	 *
	 * @since 1.2.0
	 *
	 * @return string One of self::$search_experiences.
	 */
	public static function get_search_experience() {
		$settings   = self::get_settings();
		$experience = $settings['search_experience'] ?? 'instant_search';

		if ( ! in_array( $experience, self::$search_experiences, true ) || 'instant_search' === $experience ) {
			return 'instant_search';
		}

		if ( 'algolia' !== ( $settings['provider'] ?? '' ) ) {
			return 'instant_search';
		}

		// Ask AI experiences are unusable without an agent ID — treat as the
		// plain modal at runtime.
		if ( in_array( $experience, array( 'sitesearch_askai', 'sitesearch_sidepanel' ), true )
			&& '' === ( $settings['algolia']['ask_ai_agent_id'] ?? '' ) ) {
			$experience = 'sitesearch_modal';
		}

		$bundle = self::get_sitesearch_bundle( $experience );
		if ( ! $bundle || ! file_exists( INSTANTSEARCH_FOR_WP_PATH . '/build/sitesearch/' . $bundle . '.min.js' ) ) {
			return 'instant_search';
		}

		/**
		 * Filters the active search experience.
		 *
		 * @since 1.2.0
		 *
		 * @param string $experience Validated experience value.
		 */
		return apply_filters( 'instantsearch_for_wp_search_experience', $experience );
	}

	/**
	 * Map a `sitesearch_*` experience to its vendored bundle base name and
	 * JS global.
	 *
	 * @since 1.2.0
	 *
	 * @param string $experience Experience value.
	 * @param string $field      'bundle' or 'global'.
	 *
	 * @return string|null
	 */
	public static function get_sitesearch_bundle( $experience, $field = 'bundle' ) {
		$map = array(
			'sitesearch_modal'     => array(
				'bundle' => 'search',
				'global' => 'SiteSearch',
			),
			'sitesearch_askai'     => array(
				'bundle' => 'search-askai',
				'global' => 'SiteSearchAskAI',
			),
			'sitesearch_sidepanel' => array(
				'bundle' => 'sidepanel-askai',
				'global' => 'SiteSearchSidepanelAskAI',
			),
		);

		return $map[ $experience ][ $field ] ?? null;
	}

	/**
	 * Default options for the Algolia SiteSearch experiences.
	 *
	 * Attribute defaults match the record shape produced by
	 * `AlgoliaConnector::format_post()`.
	 *
	 * @since 1.2.0
	 *
	 * @return array
	 */
	public static function get_default_sitesearch_options() {
		return array(
			'placeholder_text'            => __( 'Search…', 'instantsearch-for-wp' ),
			'button_text'                 => __( 'Search', 'instantsearch-for-wp' ),
			'hits_per_page'               => 10,
			'dark_mode'                   => 'light',
			'insights'                    => true,
			'suggested_questions_enabled' => true,
			'agent_studio'                => false,
			'attributes'                  => array(
				'primary_text'   => 'title',
				'secondary_text' => 'excerpt',
				'tertiary_text'  => 'post_type',
				'url'            => 'url',
				'image'          => 'image',
			),
		);
	}

	/**
	 * Register settings for the plugin
	 *
	 * @since 1.0.0
	 */
	public function instantsearch_for_wp_settings() {

		$default = self::get_default_settings();

		$schema = array(
			'type'       => 'object',
			'properties' => array(
				'provider' => array(
					'type' => 'string',
					'enum' => array(
						'algolia',
						'typesense',
					),
				),
				// Whethet to use an index for site search.
				// Either a boolean or the name of the index to use.
				'use_as_sitesearch' => array(
					'type'    => array( 'boolean', 'string' ),
					'default' => false,
				),
				'conversational_search' => array(
					'type'    => 'boolean',
					'default' => true,
				),
				// Which frontend search experience to render when site search is on.
				'search_experience' => array(
					'type'    => 'string',
					'enum'    => self::$search_experiences,
					'default' => 'instant_search',
				),
				// Options for the Algolia SiteSearch experiences (sitesearch_* values).
				'sitesearch_options' => array(
					'type'       => 'object',
					'properties' => array(
						'placeholder_text'            => array( 'type' => 'string' ),
						'button_text'                 => array( 'type' => 'string' ),
						'hits_per_page'               => array( 'type' => 'integer' ),
						// Back-compat only: SiteSearch debounce was removed, but old
						// saved admin payloads may still include this key.
						'debounce_delay'              => array( 'type' => 'integer' ),
						'dark_mode'                   => array(
							'type' => 'string',
							'enum' => array( 'light', 'dark', 'auto' ),
						),
						'insights'                    => array( 'type' => 'boolean' ),
						'suggested_questions_enabled' => array( 'type' => 'boolean' ),
						'agent_studio'                => array( 'type' => 'boolean' ),
						'attributes'                  => array(
							'type'       => 'object',
							'properties' => array(
								'primary_text'   => array( 'type' => 'string' ),
								'secondary_text' => array( 'type' => 'string' ),
								'tertiary_text'  => array( 'type' => 'string' ),
								'url'            => array( 'type' => 'string' ),
								'image'          => array( 'type' => 'string' ),
							),
						),
					),
				),
				'sitesearch_settings' => array(
					'type'       => 'object',
					'properties' => array(
						'placeholder_text' => array(
							'type'    => 'string',
							'default' => __( 'Search...', 'instantsearch-for-wp' ),
						),
						'sidebar_position' => array(
							'type'    => 'string',
							'enum'    => array( 'left', 'right' ),
							'default' => 'left',
						),
						'chat_trigger_position' => array(
							'type'    => 'string',
							'enum'    => array( 'left', 'right' ),
							'default' => 'right',
						),
						'snippet_length' => array(
							'type'    => 'integer',
							'default' => 50,
						),
						'trigger_selectors' => array(
							'type'    => 'string',
							'default' => '.isfwp-search-trigger,.menu-item .fl-search-form .fl-button-wrap > a,.swp-input--search, .wp-block-search__button',
						),
						'css_selector_triggers' => array(
							'type'    => 'string',
							'default' => '.isfwp-search-trigger,.menu-item .fl-search-form .fl-button-wrap > a,.swp-input--search, .wp-block-search__button',
						),
						'debounce_delay' => array(
							'type'    => 'integer',
							'default' => 0,
						),
					),
				),
			),
		);

		$schema = apply_filters( 'instantsearch_for_wp_settings_schema', $schema );

		register_setting(
			'options',
			self::$option_name,
			array(
				'type'         => 'object',
				'default'      => $default,
				'sanitize_callback' => array( $this, 'sanitize_settings' ),
				'show_in_rest' => array(
					'schema' => $schema,
				),
			)
		);
	}

	/**
	 * Sanitize plugin settings before saving.
	 *
	 * @since 1.0.0
	 *
	 * @param array $value Raw settings from request.
	 * @return array|\WP_Error
	 */
	public function sanitize_settings( $value ) {
		$default  = self::get_default_settings();
		$settings = wp_parse_args( is_array( $value ) ? $value : array(), $default );

		if ( ! isset( $settings['algolia'] ) || ! is_array( $settings['algolia'] ) ) {
			$settings['algolia'] = $default['algolia'];
		} else {
			$settings['algolia'] = wp_parse_args( $settings['algolia'], $default['algolia'] );
		}

		$settings['algolia']['ai_summaries_enabled'] = ! empty( $settings['algolia']['ai_summaries_enabled'] );
		$settings['algolia']['ask_ai_agent_id']      = sanitize_text_field( (string) $settings['algolia']['ask_ai_agent_id'] );
		$settings['algolia']['conversational_search_agent_id'] = sanitize_text_field( (string) $settings['algolia']['conversational_search_agent_id'] );
		$settings['algolia']['ai_disclaimer']        = sanitize_text_field( (string) $settings['algolia']['ai_disclaimer'] );

		if ( $settings['algolia']['ai_summaries_enabled'] && '' === $settings['algolia']['ask_ai_agent_id'] ) {
			return new \WP_Error(
				'instantsearch_for_wp_missing_ask_ai_agent_id',
				__( 'Ask AI Agent ID is required when AI summaries are enabled.', 'instantsearch-for-wp' )
			);
		}

		$settings['conversational_search'] = ! empty( $settings['conversational_search'] );

		// Search experience.
		if ( empty( $settings['search_experience'] ) || ! in_array( $settings['search_experience'], self::$search_experiences, true ) ) {
			$settings['search_experience'] = 'instant_search';
		}

		// SiteSearch experiences require the Algolia provider.
		if ( 'instant_search' !== $settings['search_experience'] && 'algolia' !== ( $settings['provider'] ?? '' ) ) {
			$settings['search_experience'] = 'instant_search';
		}

		// Ask AI experiences require an Ask AI Agent ID. Downgrade to the plain
		// SiteSearch modal instead of returning a WP_Error: sanitize-callback
		// errors on the core settings endpoint can corrupt the stored option.
		if ( in_array( $settings['search_experience'], array( 'sitesearch_askai', 'sitesearch_sidepanel' ), true )
			&& '' === ( $settings['algolia']['ask_ai_agent_id'] ?? '' ) ) {
			$settings['search_experience'] = 'sitesearch_modal';
		}

		// SiteSearch options.
		$default_options = self::get_default_sitesearch_options();
		$options         = isset( $settings['sitesearch_options'] ) && is_array( $settings['sitesearch_options'] )
			? wp_parse_args( $settings['sitesearch_options'], $default_options )
			: $default_options;

		$options['placeholder_text']            = sanitize_text_field( (string) $options['placeholder_text'] );
		$options['button_text']                 = sanitize_text_field( (string) $options['button_text'] );
		$options['hits_per_page']               = max( 1, min( 50, (int) $options['hits_per_page'] ) );
		$options['dark_mode']                   = in_array( $options['dark_mode'], array( 'light', 'dark', 'auto' ), true ) ? $options['dark_mode'] : 'light';
		$options['insights']                    = ! empty( $options['insights'] );
		$options['suggested_questions_enabled'] = ! empty( $options['suggested_questions_enabled'] );
		$options['agent_studio']                = ! empty( $options['agent_studio'] );

		$attributes = is_array( $options['attributes'] ?? null )
			? wp_parse_args( $options['attributes'], $default_options['attributes'] )
			: $default_options['attributes'];
		foreach ( $attributes as $key => $value ) {
			$attributes[ $key ] = sanitize_text_field( (string) $value );
		}
		$options['attributes'] = array_intersect_key( $attributes, $default_options['attributes'] );
		$options               = array_intersect_key( $options, $default_options );

		$settings['sitesearch_options'] = $options;

		$default_sitesearch_settings = $default['sitesearch_settings'];
		$sitesearch_settings         = isset( $settings['sitesearch_settings'] ) && is_array( $settings['sitesearch_settings'] )
			? wp_parse_args( $settings['sitesearch_settings'], $default_sitesearch_settings )
			: $default_sitesearch_settings;

		$sitesearch_settings['chat_trigger_position'] = in_array( $sitesearch_settings['chat_trigger_position'], array( 'left', 'right' ), true )
			? $sitesearch_settings['chat_trigger_position']
			: 'right';

		$settings['sitesearch_settings'] = $sitesearch_settings;

		return $settings;
	}
}