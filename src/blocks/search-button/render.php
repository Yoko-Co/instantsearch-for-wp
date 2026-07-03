<?php
/**
 * Render the InstantSearch Search Button block.
 *
 * Outputs a mount node; the SiteSearch frontend script initializes the
 * library's native button (with the ⌘K shortcut chip) into the first mount
 * on the page and mirrors it into any additional ones.
 *
 * @package InstantSearchForWP
 * @since   1.2.0
 *
 * @var array $attributes Block attributes.
 */

namespace InstantSearchForWP;

$isfwp_experience = Settings::get_search_experience();

// The block only renders for modal SiteSearch experiences. When the admin
// switches back to the built-in experience (or the sidepanel), placed blocks
// output nothing rather than a broken button.
if ( ! in_array( $isfwp_experience, array( 'sitesearch_modal', 'sitesearch_askai' ), true ) ) {
	return '';
}

$isfwp_button_text = ! empty( $attributes['buttonText'] ) ? $attributes['buttonText'] : '';

$isfwp_wrapper_attributes = get_block_wrapper_attributes(
	array(
		'class'                => 'isfwp-sitesearch-button',
		'data-isfwp-sitesearch' => 'button',
	)
);
?>
<div <?php echo $isfwp_wrapper_attributes; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- escaped by get_block_wrapper_attributes(). ?>
	<?php if ( $isfwp_button_text ) : ?>
	data-button-text="<?php echo esc_attr( $isfwp_button_text ); ?>"
	<?php endif; ?>
></div>
