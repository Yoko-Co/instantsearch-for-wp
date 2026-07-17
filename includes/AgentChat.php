<?php
/**
 * Agent Chat — shared config resolution for the Assistant UI + Algolia Agent
 * Studio chat blocks, plus the [instantsearch_agent] shortcode that renders
 * the same blocks outside the editor.
 *
 * DEBUG: when a block/shortcode renders nothing, the config resolver bailed —
 * enable WP_DEBUG and grep debug.log for '[instantsearch-for-wp] agent chat'.
 *
 * @package InstantSearchForWP
 * @since   1.3.0
 */

namespace InstantSearchForWP;

// Exit if accessed directly.
if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Resolves credentials/agent config for the agent-chat blocks and registers
 * the shortcode surface.
 */
class AgentChat {

	/**
	 * Shortcode tag.
	 *
	 * @var string
	 */
	public const SHORTCODE = 'instantsearch_agent';

	/**
	 * Wire up hooks.
	 */
	public function __construct() {
		// WP SEAM: [instantsearch_agent] — renders the agent chat blocks from
		// classic content. Runs on 'the_content' at shortcode-parse time.
		add_shortcode( self::SHORTCODE, array( $this, 'render_shortcode' ) );
	}

	/**
	 * Resolve the frontend config shared by both agent-chat blocks.
	 *
	 * Returns an empty array when the chat cannot run (non-Algolia provider,
	 * missing credentials, or no Agent Studio agent ID) so callers can bail.
	 *
	 * @param array $attributes Block attributes (agent/API key overrides).
	 * @return array Frontend config, or empty array when unusable.
	 */
	public static function get_frontend_config( array $attributes = array() ): array {
		$settings = Settings::get_settings();

		if ( ( $settings['provider'] ?? '' ) !== 'algolia' ) {
			self::log( 'agent chat unavailable: provider is not algolia' );
			return array();
		}

		$algolia = isset( $settings['algolia'] ) && is_array( $settings['algolia'] ) ? $settings['algolia'] : array();

		$app_id = ! empty( $algolia['app_id'] ) ? (string) $algolia['app_id'] : '';
		if ( defined( 'ALGOLIA_APP_ID' ) && ALGOLIA_APP_ID ) {
			$app_id = (string) ALGOLIA_APP_ID;
		}

		$search_only_key = ! empty( $algolia['search_only_api_key'] ) ? (string) $algolia['search_only_api_key'] : '';
		if ( defined( 'ALGOLIA_SEARCH_ONLY_API_KEY' ) && ALGOLIA_SEARCH_ONLY_API_KEY ) {
			$search_only_key = (string) ALGOLIA_SEARCH_ONLY_API_KEY;
		}

		/** This filter is documented in src/blocks/ask-ai/render.php */
		$search_only_key = (string) apply_filters( 'instantsearch_for_wp_algolia_search_only_api_key', $search_only_key );

		$use_global_key = ! isset( $attributes['useGlobalApiKey'] ) || (bool) $attributes['useGlobalApiKey'];
		$custom_key     = trim( (string) ( $attributes['customApiKey'] ?? '' ) );
		$api_key        = ( ! $use_global_key && '' !== $custom_key ) ? $custom_key : $search_only_key;

		$use_global_agent = ! isset( $attributes['useGlobalAgentId'] ) || (bool) $attributes['useGlobalAgentId'];
		$custom_agent_id  = sanitize_text_field( (string) ( $attributes['customAgentId'] ?? '' ) );
		$agent_id         = ( ! $use_global_agent && '' !== $custom_agent_id )
			? $custom_agent_id
			: self::get_default_agent_id( $algolia, $settings );

		if ( '' === $app_id || '' === $api_key || '' === $agent_id ) {
			self::log(
				sprintf(
					'agent chat unavailable: app_id %s, api_key %s, agent_id %s',
					'' === $app_id ? 'missing' : 'ok',
					'' === $api_key ? 'missing' : 'ok',
					'' === $agent_id ? 'missing' : 'ok'
				)
			);
			return array();
		}

		$mode = ( $attributes['mode'] ?? '' ) === 'single' ? 'single' : 'conversation';

		$config = array(
			'appId'                    => $app_id,
			'apiKey'                   => $api_key,
			'agentId'                  => $agent_id,
			'mode'                     => $mode,
			'placeholder'              => sanitize_text_field( (string) ( $attributes['placeholder'] ?? '' ) ),
			'welcomeTitle'             => sanitize_text_field( (string) ( $attributes['welcomeTitle'] ?? '' ) ),
			'welcomeMessage'           => sanitize_text_field( (string) ( $attributes['welcomeMessage'] ?? '' ) ),
			'showRecommendedQuestions' => ! isset( $attributes['showRecommendedQuestions'] ) || (bool) $attributes['showRecommendedQuestions'],
			'disclaimer'               => sanitize_text_field( (string) ( $algolia['ai_disclaimer'] ?? '' ) ),
		);

		/**
		 * EXTENSION POINT: 'instantsearch_for_wp_agent_chat_config'
		 * Filters the frontend config for the agent chat blocks before it is
		 * printed. Return an empty array to suppress rendering.
		 *
		 * @since 1.3.0
		 *
		 * @param array $config     Frontend config.
		 * @param array $attributes Block attributes.
		 */
		return (array) apply_filters( 'instantsearch_for_wp_agent_chat_config', $config, $attributes );
	}

	/**
	 * Pick the default Agent Studio agent ID from settings.
	 *
	 * Prefers the dedicated AI Studio agent ID; falls back to the Ask AI
	 * agent ID when the SiteSearch options say that agent runs on Agent
	 * Studio (the `agent_studio` toggle).
	 *
	 * @param array $algolia  Algolia settings section.
	 * @param array $settings Full plugin settings.
	 * @return string Agent ID ('' when none applies).
	 */
	private static function get_default_agent_id( array $algolia, array $settings ): string {
		$ai_studio_agent_id = sanitize_text_field( (string) ( $algolia['ai_studio_agent_id'] ?? '' ) );
		if ( '' !== $ai_studio_agent_id ) {
			return $ai_studio_agent_id;
		}

		$options = isset( $settings['sitesearch_options'] ) && is_array( $settings['sitesearch_options'] )
			? $settings['sitesearch_options']
			: array();

		if ( ! empty( $options['agent_studio'] ) ) {
			return sanitize_text_field( (string) ( $algolia['ask_ai_agent_id'] ?? '' ) );
		}

		return '';
	}

	/**
	 * Render the shortcode by delegating to the block render pipeline, so
	 * assets enqueue exactly as they do for the blocks.
	 *
	 * ## USAGE
	 *
	 *     [instantsearch_agent]
	 *     [instantsearch_agent display="popup" mode="single" button_text="Ask AI"]
	 *
	 * Attributes: display (inline|popup), mode (conversation|single),
	 * agent_id, placeholder, welcome_title, welcome_message,
	 * questions (yes|no), button_text, panel_title, position
	 * (bottom-right|bottom-left).
	 *
	 * @param array|string $atts Shortcode attributes.
	 * @return string Block markup.
	 */
	public function render_shortcode( $atts ): string {
		$atts = shortcode_atts(
			array(
				'display'         => 'inline',
				'mode'            => 'conversation',
				'agent_id'        => '',
				'placeholder'     => '',
				'welcome_title'   => '',
				'welcome_message' => '',
				'questions'       => 'yes',
				'button_text'     => '',
				'panel_title'     => '',
				'position'        => 'bottom-right',
			),
			is_array( $atts ) ? $atts : array(),
			self::SHORTCODE
		);

		$attributes = array(
			'mode'                     => 'single' === $atts['mode'] ? 'single' : 'conversation',
			'placeholder'              => sanitize_text_field( $atts['placeholder'] ),
			'welcomeTitle'             => sanitize_text_field( $atts['welcome_title'] ),
			'welcomeMessage'           => sanitize_text_field( $atts['welcome_message'] ),
			'showRecommendedQuestions' => ! in_array( strtolower( (string) $atts['questions'] ), array( 'no', 'false', '0', 'off' ), true ),
		);

		if ( '' !== trim( (string) $atts['agent_id'] ) ) {
			$attributes['useGlobalAgentId'] = false;
			$attributes['customAgentId']    = sanitize_text_field( $atts['agent_id'] );
		}

		$block_name = 'instantsearch-for-wp/agent-chat';

		if ( 'popup' === $atts['display'] ) {
			$block_name                = 'instantsearch-for-wp/agent-chat-popup';
			$attributes['buttonText']  = sanitize_text_field( $atts['button_text'] );
			$attributes['panelTitle']  = sanitize_text_field( $atts['panel_title'] );
			$attributes['position']    = 'bottom-left' === $atts['position'] ? 'bottom-left' : 'bottom-right';
		}

		return do_blocks(
			sprintf(
				'<!-- wp:%s %s /-->',
				$block_name,
				wp_json_encode( $attributes )
			)
		);
	}

	/**
	 * Debug logging, gated behind WP_DEBUG. Grep debug.log for
	 * '[instantsearch-for-wp]'.
	 *
	 * @param string $message Log message.
	 * @return void
	 */
	private static function log( string $message ): void {
		if ( defined( 'WP_DEBUG' ) && WP_DEBUG ) {
			error_log( '[instantsearch-for-wp] ' . $message ); // phpcs:ignore WordPress.PHP.DevelopmentFunctions.error_log_error_log -- gated debug logging.
		}
	}
}
