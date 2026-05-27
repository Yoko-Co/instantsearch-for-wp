<?php
/**
 * Indexing Criteria Class
 *
 * This class defines the criteria for indexing posts in the InstantSearch for WP plugin.
 * It includes methods to determine if a post should be indexed based on its status,
 * type, and other attributes.
 *
 * @package InstantSearchForWP
 * @since 1.0.0
 */

namespace InstantSearchForWP;

/**
 * The IndexingCriteria class provides methods to determine if a post should be indexed.
 */
class IndexingCriteria {

	/**
	 * Cached post types configured across all published Index CPT entries.
	 *
	 * @var array|null
	 */
	private $configured_index_post_types = null;

	/**
	 * Constructor to initialize the indexing criteria.
	 *
	 * @return void
	 */
	public function __construct() {
		// Accept 5 arguments: $should_index, $post_id, $post, $update, $index.
		add_filter( 'instantsearch_should_index_post', array( $this, 'indexing_post_type' ), 20, 5 );
		add_filter( 'instantsearch_should_index_post', array( $this, 'indexing_post_status' ), 20, 5 );
		add_filter( 'instantsearch_should_index_post', array( $this, 'indexing_post_password' ), 20, 5 );
		add_filter( 'instantsearch_should_index_post', array( $this, 'omitted_from_index' ), 20, 5 );

		// Per-index exclusion via the `instantsearch_exclude_post` filter.
		add_filter( 'instantsearch_exclude_post', array( $this, 'check_exclusion_meta' ), 10, 4 );
	}

	/**
	 * Determine if a post should be indexed based on its type and status.
	 *
	 * @param bool|null  $should_index Whether the post should be indexed. Null means undecided.
	 * @param int        $post_id      The ID of the post to check.
	 * @param \WP_Post   $post         The post object.
	 * @param bool       $update       Whether this is an update to an existing post.
	 * @param Index|null $index        The Index object being indexed into, or null for global context.
	 *
	 * @return bool|null True if the post should be indexed, false if it should not, null if undecided.
	 */
	public function indexing_post_type( $should_index, $post_id, $post, $update = false, $index = null ) {
		if ( null !== $should_index ) {
			return $should_index;
		}

		$configured_post_types = $this->get_configured_index_post_types();
		if ( ! empty( $configured_post_types ) ) {
			if ( in_array( $post->post_type, $configured_post_types, true ) ) {
				return $should_index;
			}

			return false;
		}

		$public_post_types = get_post_types( array( 'public' => true ) );

		$indexable_post_types = apply_filters( 'instantsearch_indexable_post_types', $public_post_types );

		if ( in_array( $post->post_type, $indexable_post_types, true ) ) {
			// Not an indexable post type.
			return $should_index;
		}

		return false;
	}

	/**
	 * Determine if a post should be indexed based on its status.
	 *
	 * @param bool|null  $should_index Whether the post should be indexed. Null means undecided.
	 * @param int        $post_id      The ID of the post to check.
	 * @param \WP_Post   $post         The post object.
	 * @param bool       $update       Whether this is an update to an existing post.
	 * @param Index|null $index        The Index object being indexed into, or null for global context.
	 *
	 * @return bool|null True if the post should be indexed, false if it should not, null if undecided.
	 */
	public function indexing_post_status( $should_index, $post_id, $post, $update = false, $index = null ) {
		if ( null !== $should_index ) {
			return $should_index;
		}

		$indexable_statuses = apply_filters( 'instantsearch_indexable_post_statuses', array( 'publish' ) );

		if ( $this->is_selected_pdf_attachment( $post ) ) {
			if ( 'inherit' !== $post->post_status ) {
				return in_array( $post->post_status, $indexable_statuses, true ) ? $should_index : false;
			}

			// Unattached PDF attachments can be indexed via filter override.
			if ( empty( $post->post_parent ) ) {
				/**
				 * Filters whether unattached media should be indexed.
				 *
				 * @since 1.0.0
				 *
				 * @param bool       $should_index_unattached_media Whether unattached media should be indexed. Default false.
				 * @param \WP_Post   $post                          The attachment post object.
				 * @param Index|null $index                         The index context when available, null for global context.
				 */
				$should_index_unattached_media = (bool) apply_filters( 'should_index_unattached_media', false, $post, $index );

				return $should_index_unattached_media ? $should_index : false;
			}

			$parent_post = get_post( (int) $post->post_parent );
			if ( ! $parent_post instanceof \WP_Post ) {
				return false;
			}

			return in_array( $parent_post->post_status, $indexable_statuses, true ) ? $should_index : false;
		}

		if ( in_array( $post->post_status, $indexable_statuses, true ) ) {
			// Not an indexable post status.
			return $should_index;
		}

		return false;
	}

	/**
	 * Determine if a post should be indexed based on whether it is password protected.
	 *
	 * @param bool|null  $should_index Whether the post should not be indexed. Null means undecided.
	 * @param int        $post_id      The ID of the post to check.
	 * @param \WP_Post   $post         The post object.
	 * @param bool       $update       Whether this is an update to an existing post.
	 * @param Index|null $index        The Index object being indexed into, or null for global context.
	 *
	 * @return bool|null True if the post should be indexed, false if it should not, null if undecided.
	 */
	public function indexing_post_password( $should_index, $post_id, $post, $update = false, $index = null ) {
		if ( null !== $should_index ) {
			return $should_index;
		}

		if ( post_password_required( $post ) ) {
			// Password protected posts should not be indexed.
			return false;
		}

		return $should_index;
	}

	/**
	 * Determine if a post should be indexed based on a custom field indicating omission from index.
	 *
	 * Checks the legacy `_instantsearch_omit_from_index` meta key for backward compatibility.
	 * Per-index exclusion via `_instantsearch_exclude` is handled by `check_exclusion_meta()`.
	 *
	 * @param bool|null  $should_index Whether the post should not be indexed. Null means undecided.
	 * @param int        $post_id      The ID of the post to check.
	 * @param \WP_Post   $post         The post object.
	 * @param bool       $update       Whether this is an update to an existing post.
	 * @param Index|null $index        The Index object being indexed into, or null for global context.
	 *
	 * @return bool|null True if the post should be indexed, false if it should not, null if undecided.
	 */
	public function omitted_from_index( $should_index, $post_id, $post, $update = false, $index = null ) {
		if ( null !== $should_index ) {
			return $should_index;
		}

		$omitted = get_post_meta( $post_id, '_instantsearch_omit_from_index', true );
		if ( $omitted ) {
			// Posts marked with the legacy custom field should not be indexed.
			return false;
		}

		// When there is no specific index context (e.g. on save_post before
		// per-index processing), check if the post is globally excluded from
		// every index via the __all__ sentinel.
		if ( null === $index && PostExclusion::is_excluded( $post_id, null ) ) {
			return false;
		}

		return $should_index;
	}

	/**
	 * Handle the `instantsearch_exclude_post` filter for per-index exclusion.
	 *
	 * Called during `index_or_delete_posts()` when a specific Index object is
	 * available.  Returns true if the post should be excluded from that index.
	 *
	 * Checks `_instantsearch_exclude` post meta which stores an array of index
	 * slugs.  The special sentinel value `__all__` excludes the post from every
	 * index.
	 *
	 * Example usage of the filter from external code:
	 *
	 *   add_filter(
	 *       'instantsearch_exclude_post',
	 *       function( $exclude, $post_id, $post, $index ) {
	 *           // Exclude sticky posts from the "products" index.
	 *           if ( $index->index_post->post_name === 'products' && is_sticky( $post_id ) ) {
	 *               return true;
	 *           }
	 *           return $exclude;
	 *       },
	 *       10,
	 *       4
	 *   );
	 *
	 * @param bool       $exclude  Current exclude flag.
	 * @param int        $post_id  Post ID.
	 * @param \WP_Post   $post     Post object.
	 * @param Index|null $index    Index object being indexed into.
	 *
	 * @return bool True if the post should be excluded from this index.
	 */
	public function check_exclusion_meta( $exclude, $post_id, $post, $index = null ) {
		if ( $exclude ) {
			return $exclude;
		}

		return PostExclusion::is_excluded( $post_id, $index );
	}

	/**
	 * Determine if the post is a PDF attachment and attachment indexing is enabled.
	 *
	 * @param \WP_Post $post Post object.
	 * @return bool
	 */
	private function is_selected_pdf_attachment( $post ) {
		if ( 'attachment' !== $post->post_type || 'application/pdf' !== get_post_mime_type( $post->ID ) ) {
			return false;
		}

		return in_array( 'attachment', $this->get_configured_index_post_types(), true );
	}

	/**
	 * Retrieve post types configured across all published Index CPT entries.
	 *
	 * @return array
	 */
	private function get_configured_index_post_types() {
		if ( null !== $this->configured_index_post_types ) {
			return $this->configured_index_post_types;
		}

		$index_ids = get_posts(
			array(
				'post_type'      => Index::$cpt_slug,
				'posts_per_page' => -1,
				'post_status'    => 'publish',
				'fields'         => 'ids',
			)
		);

		if ( empty( $index_ids ) ) {
			$this->configured_index_post_types = array();
			return $this->configured_index_post_types;
		}

		$post_types = array();
		foreach ( $index_ids as $index_id ) {
			$index             = new Index( (int) $index_id );
			$index_post_types  = $index->index_settings['post_types'] ?? array();
			$index_post_types  = is_array( $index_post_types ) ? $index_post_types : array( $index_post_types );

			foreach ( $index_post_types as $post_type ) {
				if ( is_string( $post_type ) && '' !== $post_type ) {
					$post_types[] = $post_type;
				}
			}
		}

		$this->configured_index_post_types = array_values( array_unique( $post_types ) );

		return $this->configured_index_post_types;
	}
}
