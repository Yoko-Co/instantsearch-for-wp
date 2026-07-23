<?php
/**
 * Render callback for instantsearch-for-wp/agent-chat block.
 *
 * Prints the mount wrapper + JSON config; the view script hydrates it into
 * the Assistant UI chat (see src/agent-chat/AgentChat.js).
 *
 * @package InstantSearchForWP
 *
 * @var array $attributes Block attributes.
 */

namespace InstantSearchForWP;

$isfwp_agent_config = AgentChat::get_frontend_config( $attributes );

if ( empty( $isfwp_agent_config ) ) {
	return '';
}

$isfwp_agent_json = wp_json_encode( $isfwp_agent_config );

if ( ! $isfwp_agent_json ) {
	return '';
}

$isfwp_agent_wrapper_args = array(
	'class'                 => 'isfwp-agent-chat-block isfwp-agent-chat-block--' . sanitize_html_class( $isfwp_agent_config['mode'] ),
	'data-isfwp-agent-chat' => 'inline',
);

// Styles-tab choices ride along as CSS custom properties; unset values fall
// back to the theme's design tokens in the stylesheet.
$isfwp_agent_style_vars = AgentChat::get_style_vars( $attributes );
if ( '' !== $isfwp_agent_style_vars ) {
	$isfwp_agent_wrapper_args['style'] = $isfwp_agent_style_vars;
}

$isfwp_agent_wrapper = get_block_wrapper_attributes( $isfwp_agent_wrapper_args );
?>
<div <?php echo $isfwp_agent_wrapper; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- Escaped by get_block_wrapper_attributes(). ?>
>
	<script type="application/json" class="isfwp-agent-chat-config"><?php echo $isfwp_agent_json; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- JSON-encoded and parsed on frontend. ?></script>
</div>
