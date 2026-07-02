<?php
/**
 * Initializer Class
 *
 * This class is responsible for initializing the InstantSearch for WP plugin.
 * It sets up the necessary components and ensures that the plugin is ready to use.
 *
 * @package InstantSearchForWP
 * @since 1.0.0
 */

namespace InstantSearchForWP;

/**
 * The Initializer class sets up the plugin components.
 */
class Initializer {

	/**
	 * Singleton instance of the Initializer.
	 *
	 * @var Initializer|null
	 */
	public static ?Initializer $instance = null;

	/**
	 * Constructor to initialize the plugin components.
	 *
	 * @return void
	 */
	public function __construct() {
		Index::init();
		Licensing::init();
		add_action( 'init', array( Admin::class, 'register_v2_preference_meta' ) );
		Indexer::get_instance();
		new IndexingCriteria();
		new PostExclusion();
		PDFTextExtractor::get_instance();
		Cli\InstantSearchCommand::register();

		new Settings();
		new Blocks();

		// Initialize admin interface.
		if ( is_admin() ) {
			new Admin();
		} else {
			new SiteSearch();
			new Integrations();
		}

		if ( defined( 'REST_API_VERSION' ) ) {
			new RestAPI();
			new Analytics();
		}
	}

	/**
	 * Get the singleton instance of the Initializer.
	 *
	 * @return Initializer The singleton instance.
	 */
	public static function get_instance() {
		if ( null === self::$instance ) {
			self::$instance = new self();
		}
		return self::$instance;
	}
}
