<?php

namespace InstantSearchForWP;

use WP_Query;

class Index {

	/**
	 * The custom post type slug for indexes.
	 *
	 * @var string
	 */
	public static string $cpt_slug = 'isfwp_index';

	/**
	 * The post object representing the index.
	 *
	 * @var \WP_Post
	 */
	public \WP_Post $index_post;

	/**
	 * The index settings.
	 *
	 * @var array
	 */
	public array $index_settings;

	/**
	 * The name of the index in the search provider.
	 *
	 * @var string
	 */
	public string $name;

	/**
	 * Constructor for the Index class.
	 *
	 * @param int $index_id The ID of the index post.
	 */
	public function __construct( $index_id = 0 ) {
		if ( 0 === $index_id ) {
			// Constructor code here.
			$index_post = get_posts(
				array(
					'post_type'      => self::$cpt_slug,
					'posts_per_page' => 1,
					'post_status'    => 'publish',
				)
			);
			$index_post = ! empty( $index_post ) ? $index_post[0] : null;
		} else {
			// Constructor code here.
			$index_post = get_post( $index_id );
		}
		if ( $index_post && $index_post->post_type === self::$cpt_slug ) {
			$this->index_post     = $index_post;
			$this->index_settings = json_decode( $index_post->post_content, true ) ?? [];
			$this->name           = Settings::get_index_name( $index_post->post_name );
		} else {
			$this->name = '';
		}
	}

	/**
	 * Initialize the Index class by registering the custom post type.
	 *
	 * @return void
	 */
	public static function init() {
		if ( is_admin() || defined( 'REST_API_VERSION' ) ) {
			add_action( 'init', array( __CLASS__, 'register_index_cpt' ) );
			add_filter( 'the_content', array( __CLASS__, 'disable_wpautop' ), 0 );
		}
	}

	/**
	 * Register the custom post type for indexes.
	 *
	 * @return void
	 */
	public static function register_index_cpt() {
		// Register a private CPT for indexes.
		register_post_type(
			self::$cpt_slug,
			array(
				'labels'             => array(
					'name'          => __( 'InstantSearch Indexes', 'instantsearch-for-wp' ),
					'singular_name' => __( 'InstantSearch Index', 'instantsearch-for-wp' ),
				),
				'public'             => false,
				'show_ui'            => false,
				'supports'           => array( 'title', 'editor' ),
				'map_meta_cap'       => true,
				'has_archive'        => false,
				'rewrite'            => false,
				'show_in_rest'       => true,
			)
		);
	}

	/**
	 * Disable wpautop filter for index content.
	 *
	 * @param string $content The post content.
	 * @return string The filtered content.
	 */
	public static function disable_wpautop( $content ) {
		if ( get_post_type() === self::$cpt_slug ) {
			remove_filter( 'the_content', 'wpautop' );
		}
		return $content;
	}

	/**
	 * Retrieve posts for indexing based on index settings.
	 *
	 * Posts excluded from this index via the `_instantsearch_exclude` post meta
	 * (containing this index's slug or the `__all__` sentinel) are automatically
	 * omitted from the query results.
	 *
	 * @param int         $number    Number of posts to retrieve.
	 * @param int         $offset    Offset for pagination.
	 * @param string|null $post_type Optional post type to restrict the query to.
	 *
	 * @return WP_Query The WP_Query object containing the posts.
	 */
	public function get_posts_query( $number = 100, $offset = 0, $post_type = null ) {
		$post_types  = $this->index_settings['post_types'] ?? array( 'post' );
		$post_types  = is_array( $post_types ) ? $post_types : array( $post_types );

		if ( ! empty( $post_type ) && in_array( $post_type, $post_types, true ) ) {
			$post_types = array( $post_type );
		}

		$post_status = array( 'publish' );

		if ( in_array( 'attachment', $post_types, true ) ) {
			$post_status[] = 'inherit';
		}

		$index_slug = isset( $this->index_post ) ? $this->index_post->post_name : '';

		// Build a meta_query to exclude posts that are excluded from all indices
		// or from this specific index. WordPress serializes array meta values, so
		// a LIKE search on the serialized string is used to find the sentinel or
		// the index slug.
		//
		// We include a post when EITHER:
		//   (a) the _instantsearch_exclude key does not exist in the DB, OR
		//   (b) the stored value does NOT contain '"__all__"' AND does NOT contain
		//       '"<index_slug>"' (i.e. the serialised PHP does not include those strings).
		$meta_query = array(
			'relation' => 'OR',
			// (a) No exclusion meta set.
			array(
				'key'     => PostExclusion::META_KEY,
				'compare' => 'NOT EXISTS',
			),
		);

		if ( $index_slug ) {
			// (b) Meta exists but this index's slug and the __all__ sentinel are absent.
			// Serialized PHP stores each string element wrapped in double-quotes
			// (e.g. `s:4:"blog";`), so searching for `"slug"` with surrounding
			// quotes matches only exact slug values, not slugs that merely contain
			// the searched string as a substring.
			$meta_query[] = array(
				'relation' => 'AND',
				array(
					'key'     => PostExclusion::META_KEY,
					'value'   => '"' . PostExclusion::EXCLUDE_ALL . '"',
					'compare' => 'NOT LIKE',
				),
				array(
					'key'     => PostExclusion::META_KEY,
					'value'   => '"' . $index_slug . '"',
					'compare' => 'NOT LIKE',
				),
			);
		} else {
			// (b) No slug known – at minimum exclude posts with the __all__ sentinel.
			$meta_query[] = array(
				'key'     => PostExclusion::META_KEY,
				'value'   => '"' . PostExclusion::EXCLUDE_ALL . '"',
				'compare' => 'NOT LIKE',
			);
		}

		$query = new WP_Query(
			array(
				'post_type'      => $post_types,
				'posts_per_page' => $number,
				'offset'         => $offset,
				'post_status'    => array_values( array_unique( $post_status ) ),
				'fields'         => 'ids',
				'meta_query'     => $meta_query, // phpcs:ignore WordPress.DB.SlowDBQuery.slow_db_query_meta_query
			)
		);

		return $query;
	}
}
