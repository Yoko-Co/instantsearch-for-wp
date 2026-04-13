<?php
/**
 * Render callback for instantsearch-for-wp/hits block.
 *
 * @var array    $attributes Block attributes.
 * @var string   $content    Inner blocks HTML.
 * @var \WP_Block $block     Block instance.
 */

$custom_class  = sanitize_html_class( $attributes['customClass'] ?? '' );
$hit_template  = $attributes['hitTemplate'] ?? '';
$hits_per_page = intval( $attributes['hitsPerPage'] ?? 10 );
$tablet_columns = max( 1, min( 4, intval( $attributes['tabletColumns'] ?? 2 ) ) );
$columns       = max( 1, min( 6, intval( $attributes['columns'] ?? 3 ) ) );
$custom_class = sanitize_html_class( $attributes['customClass'] ?? '' );

$hit_template = $attributes['hitTemplate'] ?? '';

// Allow themes/plugins to override the hit template for all instances.
$hit_template = apply_filters( 'instantsearch_hit_template', $hit_template, $attributes, $block );

// Allow overriding for a specific container instance.
$instance_id = $block->context['instantsearch/instanceId'] ?? '';
if ( $instance_id ) {
	$hit_template = apply_filters( "instantsearch_hit_template_{$instance_id}", $hit_template, $attributes, $block );
}

$config = wp_json_encode( [
	'showImage'   => (bool) ( $attributes['showImage'] ?? true ),
	'showExcerpt' => (bool) ( $attributes['showExcerpt'] ?? true ),
	'imageSize'   => sanitize_text_field( $attributes['imageSize'] ?? 'thumbnail' ),
	'hitTemplate' => $hit_template,
	'hitsPerPage' => $hits_per_page,
	'hideResultsOnEmptySearch' => (bool) ( $attributes['hideResultsOnEmptySearch'] ?? false ),
	'emptySearchMessage' => sanitize_text_field( $attributes['emptySearchMessage'] ?? 'Enter a search or add a filter to see results.' ),
] );

$extra_classes = $custom_class ? " $custom_class" : '';
$wrapper_styles = sprintf( '--isfwp-hits-tablet-columns: %d; --isfwp-hits-columns: %d;', $tablet_columns, $columns );
?>
<div
	<?php echo get_block_wrapper_attributes( [ 'class' => 'isfwp-hits-container' . $extra_classes, 'style' => $wrapper_styles ] ); // phpcs:ignore ?>
	data-isfwp-widget="hits"
	data-isfwp-config="<?php echo esc_attr( $config ); ?>"
></div>
