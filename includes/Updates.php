<?php
/**
 * Plugin updates via Plugin Update Checker against the Yoko Co R2 release
 * feed (published by .github/workflows/release-r2.yml), gated so only
 * approved users see and apply updates.
 *
 * DEBUG: to check why a user does/doesn't see updates, verify the gate:
 *   wp eval 'var_dump( \InstantSearchForWP\Updates::is_email_allowed( "someone@yokoco.com" ) );'
 * A missing update row for an allowed user usually means the feed URL 404s —
 * curl the metadata URL printed by:
 *   wp eval 'echo \InstantSearchForWP\Updates::get_metadata_url();'
 *
 * @package InstantSearchForWP
 * @since   1.3.0
 */

namespace InstantSearchForWP;

use YahnisElsts\PluginUpdateChecker\v5\PucFactory;

// Exit if accessed directly.
if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Boots the update checker for users allowed to receive updates.
 */
class Updates {

	/**
	 * Public metadata feed for this plugin on the R2 releases bucket. Same
	 * host and `{slug}/info.json` convention as yoko-core.
	 *
	 * @var string
	 */
	public const METADATA_URL = 'https://plugin-releases.yokoco.dev/instantsearch-for-wp/info.json';

	/**
	 * THE TOGGLE: while true, only users whose email domain is in
	 * ALLOWED_EMAIL_DOMAINS can see and apply plugin updates. Flip to false
	 * (or use the 'instantsearch_for_wp_restrict_update_access' filter) to
	 * open updates up to everyone.
	 *
	 * @var bool
	 */
	private const RESTRICT_UPDATE_ACCESS = true;

	/**
	 * Email domains allowed to receive updates while access is restricted.
	 *
	 * @var string[]
	 */
	private const ALLOWED_EMAIL_DOMAINS = array( 'yokoco.com' );

	/**
	 * Wire up hooks.
	 */
	public function __construct() {
		// WP SEAM: 'init' — the update checker boots after authentication is
		// loaded so the email gate can evaluate the current user. In contexts
		// with no user (cron, frontend visitors) the gate fails closed and no
		// update surfaces, which is the intended restriction.
		add_action( 'init', array( $this, 'maybe_init_update_checker' ) );
	}

	/**
	 * Boot Plugin Update Checker when the library is present and the current
	 * user is allowed to receive updates.
	 *
	 * @return void
	 */
	public function maybe_init_update_checker(): void {
		// Guard: the library ships via Composer; a build without vendor/
		// simply runs without update support.
		if ( ! class_exists( PucFactory::class ) ) {
			return;
		}

		if ( isset( $GLOBALS['instantsearch_for_wp_update_checker'] ) ) {
			return;
		}

		if ( ! self::current_user_can_receive_updates() ) {
			return;
		}

		$metadata_url = self::get_metadata_url();
		if ( '' === $metadata_url ) {
			return;
		}

		$GLOBALS['instantsearch_for_wp_update_checker'] = PucFactory::buildUpdateChecker(
			$metadata_url,
			INSTANTSEARCH_FOR_WP_FILE,
			'instantsearch-for-wp'
		);
	}

	/**
	 * Get the metadata URL used by the plugin update checker.
	 *
	 * @return string
	 */
	public static function get_metadata_url(): string {
		/**
		 * EXTENSION POINT: 'instantsearch_for_wp_update_metadata_url'
		 * Filters the update feed URL. Return '' to disable update checks.
		 *
		 * @since 1.3.0
		 *
		 * @param string $url Metadata feed URL.
		 */
		return (string) apply_filters( 'instantsearch_for_wp_update_metadata_url', self::METADATA_URL );
	}

	/**
	 * Whether the current user may see and apply plugin updates.
	 *
	 * @return bool
	 */
	public static function current_user_can_receive_updates(): bool {
		/**
		 * EXTENSION POINT: 'instantsearch_for_wp_restrict_update_access'
		 * Filters whether update access is restricted to the allowed email
		 * domains. Return false to make updates available to everyone.
		 *
		 * @since 1.3.0
		 *
		 * @param bool $restricted Default self::RESTRICT_UPDATE_ACCESS.
		 */
		$restricted = (bool) apply_filters( 'instantsearch_for_wp_restrict_update_access', self::RESTRICT_UPDATE_ACCESS );

		if ( ! $restricted ) {
			return true;
		}

		$user = wp_get_current_user();
		if ( ! $user instanceof \WP_User || ! $user->exists() ) {
			return false;
		}

		return self::is_email_allowed( (string) $user->user_email );
	}

	/**
	 * Atomic: does an email address belong to an allowed domain? Verify:
	 *   wp eval 'var_dump( \InstantSearchForWP\Updates::is_email_allowed( "a@yokoco.com" ) );'
	 *
	 * @param string $email Email address to check.
	 * @return bool
	 */
	public static function is_email_allowed( string $email ): bool {
		/**
		 * EXTENSION POINT: 'instantsearch_for_wp_update_allowed_email_domains'
		 * Filters the email domains allowed to receive updates while access
		 * is restricted.
		 *
		 * @since 1.3.0
		 *
		 * @param string[] $domains Allowed domains (no leading @).
		 */
		$domains = (array) apply_filters( 'instantsearch_for_wp_update_allowed_email_domains', self::ALLOWED_EMAIL_DOMAINS );

		$at_position = strrpos( $email, '@' );
		if ( false === $at_position ) {
			return false;
		}

		$email_domain = strtolower( trim( substr( $email, $at_position + 1 ) ) );
		if ( '' === $email_domain ) {
			return false;
		}

		return in_array( $email_domain, array_map( 'strtolower', $domains ), true );
	}
}
