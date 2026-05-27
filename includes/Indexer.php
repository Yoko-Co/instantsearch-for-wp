<?php
/**
 * IndexerHooks Class
 *
 * This class is responsible for managing the indexing of posts.
 * It integrates into WordPress hooks to handle indexing operations.
 * - Posts are indexed on the `shutdown` action to ensure all changes are captured.
 *
 * @package InstantSearchForWP
 * @since 1.0.0
 */

namespace InstantSearchForWP;

/**
 * IndexerHooks class to manage post indexing.
 */
class Indexer {

	/**
	 * Available search providers.
	 *
	 * @var array
	 */
	private static array $providers = array(
		'algolia' => Connectors\AlgoliaConnector::class,
		// Future providers can be added here.
	);

	/**
	 * The connector instance used for indexing operations.
	 *
	 * @var Connectors\AbstractConnector|null
	 */
	public $provider;

	/**
	 * The hook name used to collect post IDs for indexing.
	 *
	 * @var string
	 */
	public static $index_post_ids_hook = 'instantsearch_posts_to_index';

	/**
	 * The hook name used to collect post IDs for deletion.
	 *
	 * @var string
	 */
	public static $delete_post_ids_hook = 'instantsearch_posts_to_delete';

	/**
	 * Singleton instance of the Indexer.
	 *
	 * @var Indexer|null
	 */
	public static $instance = null;

	/**
	 * Constructor to initialize the Indexer with a specific connector.
	 *
	 * @return void
	 */
	public function __construct() {
		add_action( 'save_post', array( $this, 'index_post' ), 10, 3 );
		add_action( 'add_attachment', array( $this, 'index_attachment_added' ) );
		add_action( 'edit_attachment', array( $this, 'index_attachment_updated' ) );
		add_action( 'added_post_meta', array( $this, 'index_post_on_meta_change' ), 10, 4 );
		add_action( 'updated_post_meta', array( $this, 'index_post_on_meta_change' ), 10, 4 );
		add_action( 'deleted_post_meta', array( $this, 'index_post_on_meta_change' ), 10, 4 );
		add_action( 'delete_post', array( $this, 'delete_post' ) );
		add_action( 'shutdown', array( $this, 'index_or_delete_posts' ) );

		$this->provider = $this->get_provider();
	}

	/**
	 * Queue a newly created attachment for indexing.
	 *
	 * Attachments can be created through media-specific flows where relying only
	 * on the generic `save_post` hook may miss the event.
	 *
	 * @param int $post_id Attachment post ID.
	 *
	 * @return void
	 */
	public function index_attachment_added( $post_id ) {
		$post = get_post( $post_id );

		if ( ! $post instanceof \WP_Post || 'attachment' !== $post->post_type ) {
			return;
		}

		$this->index_post( $post_id, $post, false );
	}

	/**
	 * Queue an updated attachment for indexing.
	 *
	 * Attachments can be updated through media-specific flows where relying only
	 * on the generic `save_post` hook may miss the event.
	 *
	 * @param int $post_id Attachment post ID.
	 *
	 * @return void
	 */
	public function index_attachment_updated( $post_id ) {
		$post = get_post( $post_id );

		if ( ! $post instanceof \WP_Post || 'attachment' !== $post->post_type ) {
			return;
		}

		$this->index_post( $post_id, $post, true );
	}

	/**
	 * Queue a post for indexing when its post meta changes.
	 *
	 * This covers direct `add_post_meta()`, `update_post_meta()`, and
	 * `delete_post_meta()` calls that do not always trigger post edit hooks.
	 *
	 * @param int    $meta_id    Meta row ID.
	 * @param int    $post_id    Post ID.
	 * @param string $meta_key   Meta key.
	 * @param mixed  $meta_value Meta value.
	 *
	 * @return void
	 */
	public function index_post_on_meta_change( $meta_id, $post_id, $meta_key, $meta_value ) {
		unset( $meta_id, $meta_key, $meta_value );

		$post = get_post( (int) $post_id );
		if ( ! $post instanceof \WP_Post ) {
			return;
		}

		$this->index_post( (int) $post_id, $post, true );
	}


	/**
	 * Get the search provider based on settings or environment.
	 *
	 * @return Connectors\AbstractConnector|null The connector instance or null if not found.
	 */
	public function get_provider() {
		if ( defined( 'INSTANTSEARCH_FOR_WP_PROVIDER' ) && array_key_exists( INSTANTSEARCH_FOR_WP_PROVIDER, self::$providers ) ) {
			$provider_class = self::$providers[ INSTANTSEARCH_FOR_WP_PROVIDER ];
			return new $provider_class();
		}

		$provider = Settings::get_settings( 'provider' );
		if ( $provider && is_string( $provider ) && array_key_exists( $provider, self::$providers ) ) {
			$provider_class = self::$providers[ $provider ];
			return new $provider_class();
		}

		return null;
	}

	/**
	 * Get the singleton instance of the Indexer.
	 *
	 * @return Indexer The singleton instance.
	 */
	public static function get_instance() {
		if ( null === self::$instance ) {
			self::$instance = new self();
		}
		return self::$instance;
	}

	/**
	 * Index a single post when it is saved.
	 *
	 * Applies the `instantsearch_should_index_post` filter with a null `$index`
	 * for global criteria (post type, status, password, global exclusion).
	 * Per-index exclusion is checked later in `index_or_delete_posts()` via the
	 * `instantsearch_exclude_post` filter when the Index context is known.
	 *
	 * @param int      $post_id Post ID.
	 * @param \WP_Post $post    Post object.
	 * @param bool     $update  Whether this is an existing post being updated or not.
	 *
	 * @return void
	 */
	public function index_post( $post_id, $post, $update ) {
		/**
		 * Filters whether a post should be indexed.
		 *
		 * @since 1.0.0
		 *
		 * @param bool|null  $should_index True to index, false to delete from index, null to defer.
		 * @param int        $post_id      Post ID.
		 * @param \WP_Post   $post         Post object.
		 * @param bool       $update       Whether this is an update.
		 * @param Index|null $index        Index object, or null for global (save_post) context.
		 */
		$should_index = apply_filters( 'instantsearch_should_index_post', null, $post_id, $post, $update, null );

		if ( null !== $should_index && ! $should_index ) {
			add_filter(
				self::$delete_post_ids_hook,
				function ( $post_ids ) use ( $post_id ) {
					if ( ! is_array( $post_ids ) ) {
						$post_ids = empty( $post_ids ) ? array() : (array) $post_ids;
					}
					$post_ids[] = $post_id;
					return array_values( array_unique( $post_ids ) );
				}
			);
			return;
		}

		add_filter(
			self::$index_post_ids_hook,
			function ( $post_ids ) use ( $post_id ) {
				if ( ! is_array( $post_ids ) ) {
					$post_ids = empty( $post_ids ) ? array() : (array) $post_ids;
				}
				$post_ids[] = $post_id;
				return array_values( array_unique( $post_ids ) );
			}
		);
	}

	/**
	 * Index all posts that have been marked for indexing.
	 *
	 * When `$index` is provided (e.g. from WP-CLI or the REST API), only that
	 * index is processed and per-index exclusion is applied for each post.
	 *
	 * When `$index` is null (e.g. triggered via `shutdown` after `save_post`),
	 * the method iterates over every configured `isfwp_index` CPT post and
	 * applies per-index exclusion for each, enabling true multi-index support.
	 *
	 * Per-index exclusion is applied via the `instantsearch_exclude_post` filter:
	 *
	 *   apply_filters( 'instantsearch_exclude_post', false, $post_id, $post, $index )
	 *
	 * Returning `true` from the filter excludes the post from that specific index.
	 *
	 * @param array               $post_ids        Array of post IDs to index.
	 * @param array               $delete_post_ids Array of post IDs to delete.
	 * @param Index|\WP_Post|null $index           Index object.
	 *
	 * @return array Array containing responses for indexed and deleted posts.
	 */
	public function index_or_delete_posts( $post_ids = array(), $delete_post_ids = array(), $index = null ) {
		if ( ! $this->provider || ! method_exists( $this->provider, 'index_posts' ) || ! method_exists( $this->provider, 'delete_posts' ) ) {
			return array(
				'indexed' => null,
				'deleted' => null,
			);
		}

		$post_ids = apply_filters( self::$index_post_ids_hook, $post_ids );
		if ( ! is_array( $post_ids ) ) {
			$post_ids = empty( $post_ids ) ? array() : (array) $post_ids;
		}

		$delete_post_ids = apply_filters( self::$delete_post_ids_hook, $delete_post_ids );
		if ( ! is_array( $delete_post_ids ) ) {
			$delete_post_ids = empty( $delete_post_ids ) ? array() : (array) $delete_post_ids;
		}

		// When a specific index is provided, process only that index.
		if ( null !== $index ) {
			return $this->process_for_index( $post_ids, $delete_post_ids, $index );
		}

		// No specific index: iterate over all configured indices.
		$index_objects = $this->get_all_index_objects();

		if ( empty( $index_objects ) ) {
			// No indices configured – fall back to provider-level processing without index context.
			return $this->process_for_index( $post_ids, $delete_post_ids, null );
		}

		$results = array();
		foreach ( $index_objects as $current_index ) {
			$results[] = $this->process_for_index( $post_ids, $delete_post_ids, $current_index );
		}

		// Return the last result for backward-compatible single-value callers.
		return ! empty( $results ) ? $results[ count( $results ) - 1 ] : array( 'indexed' => null, 'deleted' => null );
	}

	/**
	 * Apply per-index exclusion and call the provider for a single index.
	 *
	 * @param array               $post_ids        Post IDs to consider for indexing.
	 * @param array               $delete_post_ids Post IDs to delete from index.
	 * @param Index|\WP_Post|null $index           Index object, or null for no-context path.
	 *
	 * @return array
	 */
	private function process_for_index( $post_ids, $delete_post_ids, $index ) {
		$indexed_response = null;
		$deleted_response = null;

		if ( ! empty( $post_ids ) ) {
			// Apply per-index exclusion filter for each post.
			$filtered_ids = array();
			foreach ( $post_ids as $post_id ) {
				$post = get_post( $post_id );
				if ( ! $post ) {
					continue;
				}

				/**
				 * Filters whether a post should be excluded from a specific index.
				 *
				 * @since 1.0.0
				 *
				 * @param bool       $exclude  Default false (not excluded).
				 * @param int        $post_id  Post ID.
				 * @param \WP_Post   $post     Post object.
				 * @param Index|null $index    Index object being indexed into.
				 */
				$exclude = apply_filters( 'instantsearch_exclude_post', false, $post_id, $post, $index );

				if ( ! $exclude ) {
					$filtered_ids[] = $post_id;
				}
			}

			if ( ! empty( $filtered_ids ) ) {
				$indexed_response = $this->provider->index_posts( $filtered_ids, $index );
			}
		}

		if ( ! empty( $delete_post_ids ) ) {
			$deleted_response = $this->provider->delete_posts( $delete_post_ids, $index );
		}

		return array(
			'indexed' => $indexed_response,
			'deleted' => $deleted_response,
		);
	}

	/**
	 * Retrieve all configured Index objects.
	 *
	 * @return Index[]
	 */
	private function get_all_index_objects() {
		$index_posts = get_posts(
			array(
				'post_type'      => Index::$cpt_slug,
				'posts_per_page' => -1,
				'post_status'    => 'publish',
			)
		);

		$indices = array();
		foreach ( $index_posts as $index_post ) {
			$indices[] = new Index( $index_post->ID );
		}

		return $indices;
	}

	/**
	 * Delete a single post from the index when it is deleted.
	 *
	 * @param int $post_id Post ID.
	 */
	public function delete_post( $post_id ) {
		do_action( 'instantsearch_delete_posts', array( $post_id ) );
	}
}
