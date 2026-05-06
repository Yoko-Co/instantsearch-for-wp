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
			'provider'            => '',
			'use_as_sitesearch'   => false,
			'sitesearch_settings' => array(
				'placeholder_text'      => __( 'Search...', 'instantsearch-for-wp' ),
				'sidebar_position'      => 'left',
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
						'snippet_length' => array(
							'type'    => 'integer',
							'default' => 50,
						),
						'trigger_selectors' => array(
							'type'    => 'string',
							'default' => '.isfwp-search-trigger,.menu-item .fl-search-form .fl-button-wrap > a,.swp-input--search',
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

		if ( $settings['algolia']['ai_summaries_enabled'] && '' === $settings['algolia']['ask_ai_agent_id'] ) {
			return new \WP_Error(
				'instantsearch_for_wp_missing_ask_ai_agent_id',
				__( 'Ask AI Agent ID is required when AI summaries are enabled.', 'instantsearch-for-wp' )
			);
		}

		return $settings;
	}
}