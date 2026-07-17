<?php
/**
 * Render callback for instantsearch-for-wp/agent-chat-popup block.
 *
 * Prints the mount wrapper + JSON config; the view script hydrates it into
 * the floating chatbot (see src/agent-chat/AgentChatPopup.js).
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

$isfwp_agent_position = ( $attributes['position'] ?? '' ) === 'bottom-left' ? 'bottom-left' : 'bottom-right';

$isfwp_agent_config['buttonText'] = sanitize_text_field( (string) ( $attributes['buttonText'] ?? '' ) );
$isfwp_agent_config['panelTitle'] = sanitize_text_field( (string) ( $attributes['panelTitle'] ?? '' ) );
$isfwp_agent_config['position']   = $isfwp_agent_position;

$isfwp_agent_json = wp_json_encode( $isfwp_agent_config );

if ( ! $isfwp_agent_json ) {
	return '';
}

$isfwp_agent_wrapper = get_block_wrapper_attributes(
	array(
		'class'                 => 'isfwp-agent-popup-block isfwp-agent-popup-block--' . sanitize_html_class( $isfwp_agent_position ),
		'data-isfwp-agent-chat' => 'popup',
	)
);
?>
<div <?php echo $isfwp_agent_wrapper; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- Escaped by get_block_wrapper_attributes(). ?>
>
	<script type="application/json" class="isfwp-agent-chat-config"><?php echo $isfwp_agent_json; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- JSON-encoded and parsed on frontend. ?></script>
</div>
