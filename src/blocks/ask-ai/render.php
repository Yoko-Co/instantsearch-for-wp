<?php
/**
 * Render callback for instantsearch-for-wp/ask-ai block.
 *
 * @package InstantSearchForWP
 *
 * @var array $attributes Block attributes.
 */

namespace InstantSearchForWP;

$settings = Settings::get_settings();

if ( ( $settings['provider'] ?? '' ) !== 'algolia' ) {
	return '';
}

$algolia = isset( $settings['algolia'] ) && is_array( $settings['algolia'] ) ? $settings['algolia'] : array();
$options = wp_parse_args(
	isset( $settings['sitesearch_options'] ) && is_array( $settings['sitesearch_options'] ) ? $settings['sitesearch_options'] : array(),
	Settings::get_default_sitesearch_options()
);

$app_id = ! empty( $algolia['app_id'] ) ? (string) $algolia['app_id'] : '';
if ( defined( 'ALGOLIA_APP_ID' ) && ALGOLIA_APP_ID ) {
	$app_id = (string) ALGOLIA_APP_ID;
}

$global_search_only_key = ! empty( $algolia['search_only_api_key'] ) ? (string) $algolia['search_only_api_key'] : '';
if ( defined( 'ALGOLIA_SEARCH_ONLY_API_KEY' ) && ALGOLIA_SEARCH_ONLY_API_KEY ) {
	$global_search_only_key = (string) ALGOLIA_SEARCH_ONLY_API_KEY;
}
$global_search_only_key = (string) apply_filters( 'instantsearch_for_wp_algolia_search_only_api_key', $global_search_only_key );

$use_global_api_key = ! isset( $attributes['useGlobalApiKey'] ) || (bool) $attributes['useGlobalApiKey'];
$custom_api_key     = trim( (string) ( $attributes['customApiKey'] ?? '' ) );
$api_key            = ( ! $use_global_api_key && '' !== $custom_api_key ) ? $custom_api_key : $global_search_only_key;

$global_agent_id    = sanitize_text_field( (string) ( $algolia['ask_ai_agent_id'] ?? '' ) );
$use_global_agent   = ! isset( $attributes['useGlobalAgentId'] ) || (bool) $attributes['useGlobalAgentId'];
$custom_agent_id    = sanitize_text_field( (string) ( $attributes['customAgentId'] ?? '' ) );
$assistant_id       = ( ! $use_global_agent && '' !== $custom_agent_id ) ? $custom_agent_id : $global_agent_id;

$placement = (string) ( $attributes['placement'] ?? 'floating-right' );
if ( ! in_array( $placement, array( 'floating-right', 'floating-left', 'inline' ), true ) ) {
	$placement = 'floating-right';
}

$theme_mode = (string) ( $attributes['themeMode'] ?? 'light' );
if ( ! in_array( $theme_mode, array( 'light', 'dark', 'system' ), true ) ) {
	$theme_mode = 'light';
}

$index_name = Settings::get_index_name( ! empty( $settings['use_as_sitesearch'] ) ? $settings['use_as_sitesearch'] : null );

if ( '' === $app_id || '' === $api_key || '' === $assistant_id || '' === $index_name ) {
	return '';
}

$bundle      = Settings::get_sitesearch_bundle( 'sitesearch_sidepanel' );
$bundle_path = $bundle ? INSTANTSEARCH_FOR_WP_PATH . '/build/sitesearch/' . $bundle : '';
$bundle_url  = $bundle ? INSTANTSEARCH_FOR_WP_URL . 'build/sitesearch/' . $bundle : '';

if ( ! $bundle || ! file_exists( $bundle_path . '.min.js' ) ) {
	return '';
}

wp_enqueue_script(
	'instantsearch-for-wp-sitesearch-sidepanel-lib',
	$bundle_url . '.min.js',
	array(),
	INSTANTSEARCH_FOR_WP_SITESEARCH_VERSION,
	true
);

if ( file_exists( $bundle_path . '.min.css' ) ) {
	wp_enqueue_style(
		'instantsearch-for-wp-sitesearch-sidepanel-lib',
		$bundle_url . '.min.css',
		array(),
		INSTANTSEARCH_FOR_WP_SITESEARCH_VERSION
	);
}

$config = wp_json_encode(
	array(
		'applicationId'             => $app_id,
		'apiKey'                    => $api_key,
		'indexName'                 => $index_name,
		'assistantId'               => $assistant_id,
		'suggestedQuestionsEnabled' => ! empty( $options['suggested_questions_enabled'] ),
		'agentStudio'               => ! empty( $options['agent_studio'] ),
		'buttonText'                => trim( (string) ( $attributes['buttonText'] ?? '' ) ),
		'triggerPosition'           => ( 'inline' === $placement ) ? 'inline' : 'fixed',
		'themeMode'                 => $theme_mode,
	)
);

if ( ! $config ) {
	return '';
}

$classes = array(
	'isfwp-ask-ai',
	'isfwp-ask-ai--' . sanitize_html_class( $placement ),
);

$wrapper_attributes = get_block_wrapper_attributes(
	array(
		'class'              => implode( ' ', $classes ),
		'data-isfwp-ask-ai'  => 'mount',
	)
);
?>
<div <?php echo $wrapper_attributes; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- Escaped by get_block_wrapper_attributes(). ?>
>
	<script type="application/json" class="isfwp-ask-ai-config"><?php echo $config; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- JSON-encoded and parsed on frontend. ?></script>
</div>
