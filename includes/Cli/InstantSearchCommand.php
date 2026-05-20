<?php
/**
 * WP-CLI command for InstantSearch.
 *
 * @package InstantSearchForWP
 */

namespace InstantSearchForWP\Cli;

use InstantSearchForWP\Index;
use InstantSearchForWP\Indexer;

/**
 * Core WP-CLI command for InstantSearch.
 */
class InstantSearchCommand {

	/**
	 * Registers the `wp instantsearch` command.
	 *
	 * @return void
	 */
	public static function register() {
		if ( ! defined( 'WP_CLI' ) || ! WP_CLI ) {
			return;
		}

		try {
			\WP_CLI::add_command( 'instantsearch', __CLASS__ );
		} catch ( \Throwable $th ) {
			// Ignore duplicate registration and let the original command stand.
		}
	}

	/**
	 * Runs a full index from WP-CLI.
	 *
	 * ## OPTIONS
	 *
	 * [--index_id=<id>]
	 * : Index post ID to target. Defaults to the first configured index.
	 *
	 * [--batch_size=<size>]
	 * : Number of posts to index per batch.
	 *
	 * [--post_type=<type>]
	 * : Only index posts of this post type (e.g. "resource").
	 *
	 * ## EXAMPLES
	 *
	 *     wp instantsearch index
	 *     wp instantsearch index --index_id=123 --batch_size=50
	 *     wp instantsearch index --post_type=resource
	 *
	 * @param array $args Positional arguments.
	 * @param array $assoc_args Associative arguments.
	 *
	 * @return void
	 */
	public function index( $args, $assoc_args ) {
		unset( $args );

		$index_id   = isset( $assoc_args['index_id'] ) ? absint( $assoc_args['index_id'] ) : 0;
		$batch_size = isset( $assoc_args['batch_size'] ) ? absint( $assoc_args['batch_size'] ) : 100;
		$post_type  = isset( $assoc_args['post_type'] ) ? sanitize_key( $assoc_args['post_type'] ) : '';

		if ( $batch_size < 1 ) {
			\WP_CLI::error( 'Batch size must be greater than 0.' );
		}

		if ( isset( $assoc_args['post_type'] ) && empty( $post_type ) ) {
			\WP_CLI::error( 'Post type must be a valid post type key.' );
		}

		$index = new Index( $index_id );

		if ( empty( $index->index_post ) || empty( $index->name ) ) {
			\WP_CLI::error( 'Invalid index ID or no index is configured.' );
		}

		if ( ! empty( $post_type ) ) {
			$configured_post_types = $index->index_settings['post_types'] ?? array( 'post' );
			$configured_post_types = is_array( $configured_post_types ) ? $configured_post_types : array( $configured_post_types );

			if ( ! in_array( $post_type, $configured_post_types, true ) ) {
				\WP_CLI::error(
					sprintf(
						'Post type "%s" is not configured for index "%s". Allowed post types: %s.',
						$post_type,
						$index->name,
						implode( ', ', $configured_post_types )
					)
				);
			}
		}

		$indexer = Indexer::get_instance();

		if ( empty( $indexer->provider ) ) {
			\WP_CLI::error( 'No InstantSearch provider is configured.' );
		}

		if ( ! empty( $post_type ) ) {
			\WP_CLI::log( sprintf( 'Starting index "%s" for post type "%s" with batch size %d.', $index->name, $post_type, $batch_size ) );
		} else {
			\WP_CLI::log( sprintf( 'Starting index "%s" with batch size %d.', $index->name, $batch_size ) );
		}

		if ( empty( $post_type ) ) {
			try {
				$indexer->provider->clear_index( $index->name );
			} catch ( \Throwable $th ) {
				\WP_CLI::error( sprintf( 'Failed to clear index: %s', $th->getMessage() ) );
			}
		} else {
			\WP_CLI::log( 'Deleting existing records for the requested post type before reindexing that subset.' );

			try {
				$indexer->provider->delete_by_query(
					array(
						'post_type' => array( $post_type ),
					),
					$index
				);
			} catch ( \Throwable $th ) {
				\WP_CLI::error( sprintf( 'Failed to delete existing records for post type "%s": %s', $post_type, $th->getMessage() ) );
			}
		}

		$offset        = 0;
		$total_posts   = null;
		$indexed_posts = 0;

		do {
			$post_query = $index->get_posts_query( $batch_size, $offset, $post_type );
			$post_ids   = $post_query->posts;

			if ( null === $total_posts ) {
				$total_posts = (int) $post_query->found_posts;
			}

			if ( empty( $post_ids ) ) {
				break;
			}

			try {
				$indexer->index_or_delete_posts( $post_ids, array(), $index );
			} catch ( \Throwable $th ) {
				\WP_CLI::error( sprintf( 'Indexing failed at offset %d: %s', $offset, $th->getMessage() ) );
			}

			$indexed_posts += count( $post_ids );
			$offset        += $batch_size;

			if ( $total_posts > 0 ) {
				$percent = min( 100, round( ( $indexed_posts / $total_posts ) * 100, 2 ) );
				\WP_CLI::log( sprintf( 'Indexed %d/%d posts (%s%%).', $indexed_posts, $total_posts, $percent ) );
			} else {
				\WP_CLI::log( sprintf( 'Indexed %d posts.', $indexed_posts ) );
			}
		} while ( count( $post_ids ) === $batch_size );

		\WP_CLI::success( sprintf( 'Indexing complete. Indexed %d post(s) into "%s".', $indexed_posts, $index->name ) );
	}

	/**
	 * Manages per-index post exclusions from the search index.
	 *
	 * ## SUBCOMMANDS
	 *
	 *   list   - List excluded posts.
	 *   add    - Exclude one or more posts from an index.
	 *   remove - Remove exclusion from one or more posts.
	 *
	 * ## EXAMPLES
	 *
	 *     wp instantsearch exclude list
	 *     wp instantsearch exclude list --index=blog
	 *     wp instantsearch exclude add 42 99 --index=blog
	 *     wp instantsearch exclude remove 42 --index=blog
	 *
	 * @param array $args       Subcommand and positional args.
	 * @param array $assoc_args Associative/flag args.
	 *
	 * @subcommand exclude
	 *
	 * @return void
	 */
	public function exclude( $args, $assoc_args ) {
		if ( empty( $args ) ) {
			\WP_CLI::error( 'Please provide a subcommand: list, add, or remove.' );
		}

		$subcommand = array_shift( $args );

		switch ( $subcommand ) {
			case 'list':
				$this->exclude_list( $args, $assoc_args );
				break;
			case 'add':
				$this->exclude_add( $args, $assoc_args );
				break;
			case 'remove':
				$this->exclude_remove( $args, $assoc_args );
				break;
			default:
				\WP_CLI::error( sprintf( 'Unknown subcommand "%s". Use list, add, or remove.', $subcommand ) );
		}
	}

	/**
	 * List all posts that are excluded from the search index.
	 *
	 * ## OPTIONS
	 *
	 * [--index=<slug>]
	 * : Filter to a specific index slug.
	 *
	 * [--post-type=<type>]
	 * : Filter to a specific post type.
	 *
	 * [--format=<format>]
	 * : Output format: table, json, or csv. Default: table.
	 *
	 * ## EXAMPLES
	 *
	 *     wp instantsearch exclude list
	 *     wp instantsearch exclude list --index=blog --format=json
	 *
	 * @param array $args       Positional args (unused).
	 * @param array $assoc_args Associative args.
	 * @return void
	 */
	private function exclude_list( $args, $assoc_args ) {
		$index_slug = isset( $assoc_args['index'] ) ? sanitize_title( $assoc_args['index'] ) : null;
		$post_type  = isset( $assoc_args['post-type'] ) ? sanitize_key( $assoc_args['post-type'] ) : null;
		$format     = isset( $assoc_args['format'] ) ? $assoc_args['format'] : 'table';

		$query_args = array(
			'post_type'      => $post_type ?: 'any',
			'posts_per_page' => -1,
			'post_status'    => 'any',
			'fields'         => 'ids',
			// phpcs:ignore WordPress.DB.SlowDBQuery.slow_db_query_meta_query
			'meta_query'     => array(
				array(
					'key'     => \InstantSearchForWP\PostExclusion::META_KEY,
					'compare' => 'EXISTS',
				),
			),
		);

		$post_ids = get_posts( $query_args );

		$rows = array();

		foreach ( $post_ids as $post_id ) {
			$exclusions = \InstantSearchForWP\PostExclusion::get_exclusions( $post_id );

			if ( empty( $exclusions ) ) {
				continue;
			}

			// Filter by index slug if provided.
			if ( $index_slug ) {
				$matches = in_array( \InstantSearchForWP\PostExclusion::EXCLUDE_ALL, $exclusions, true )
					|| in_array( $index_slug, $exclusions, true );
				if ( ! $matches ) {
					continue;
				}
			}

			$post   = get_post( $post_id );
			$rows[] = array(
				'ID'         => $post_id,
				'post_type'  => $post->post_type,
				'post_title' => $post->post_title,
				'excluded'   => implode( ', ', $exclusions ),
			);
		}

		if ( empty( $rows ) ) {
			\WP_CLI::log( 'No excluded posts found.' );
			return;
		}

		\WP_CLI\Utils\format_items( $format, $rows, array( 'ID', 'post_type', 'post_title', 'excluded' ) );
	}

	/**
	 * Exclude one or more posts from a search index.
	 *
	 * ## OPTIONS
	 *
	 * <post-id>...
	 * : One or more post IDs to exclude.
	 *
	 * [--index=<slug>]
	 * : Index slug to exclude from. Omit to exclude from all indices.
	 *
	 * ## EXAMPLES
	 *
	 *     wp instantsearch exclude add 42
	 *     wp instantsearch exclude add 42 99 --index=blog
	 *
	 * @param array $args       Post IDs.
	 * @param array $assoc_args Associative args.
	 * @return void
	 */
	private function exclude_add( $args, $assoc_args ) {
		if ( empty( $args ) ) {
			\WP_CLI::error( 'Please provide at least one post ID.' );
		}

		$index_slug = isset( $assoc_args['index'] ) ? sanitize_title( $assoc_args['index'] ) : null;

		foreach ( $args as $post_id ) {
			$post_id = absint( $post_id );
			$post    = get_post( $post_id );

			if ( ! $post ) {
				\WP_CLI::warning( sprintf( 'Post ID %d not found, skipping.', $post_id ) );
				continue;
			}

			$current = \InstantSearchForWP\PostExclusion::get_exclusions( $post_id );

			if ( $index_slug ) {
				$new = array_values( array_unique( array_merge( $current, array( $index_slug ) ) ) );
			} else {
				$new = array( \InstantSearchForWP\PostExclusion::EXCLUDE_ALL );
			}

			\InstantSearchForWP\PostExclusion::set_exclusions( $post_id, $new );

			\WP_CLI::log(
				sprintf(
					'Post %d (%s) excluded from %s.',
					$post_id,
					$post->post_title,
					$index_slug ?: 'all indices'
				)
			);
		}

		\WP_CLI::success( 'Done.' );
	}

	/**
	 * Remove exclusion for one or more posts.
	 *
	 * ## OPTIONS
	 *
	 * <post-id>...
	 * : One or more post IDs.
	 *
	 * [--index=<slug>]
	 * : Remove exclusion only for this index slug. Omit to remove all exclusions.
	 *
	 * ## EXAMPLES
	 *
	 *     wp instantsearch exclude remove 42
	 *     wp instantsearch exclude remove 42 --index=blog
	 *
	 * @param array $args       Post IDs.
	 * @param array $assoc_args Associative args.
	 * @return void
	 */
	private function exclude_remove( $args, $assoc_args ) {
		if ( empty( $args ) ) {
			\WP_CLI::error( 'Please provide at least one post ID.' );
		}

		$index_slug = isset( $assoc_args['index'] ) ? sanitize_title( $assoc_args['index'] ) : null;

		foreach ( $args as $post_id ) {
			$post_id = absint( $post_id );
			$post    = get_post( $post_id );

			if ( ! $post ) {
				\WP_CLI::warning( sprintf( 'Post ID %d not found, skipping.', $post_id ) );
				continue;
			}

			if ( $index_slug ) {
				$current = \InstantSearchForWP\PostExclusion::get_exclusions( $post_id );
				// If __all__ is set and we're removing a specific index, expand to all slugs minus the one being removed.
				if ( in_array( \InstantSearchForWP\PostExclusion::EXCLUDE_ALL, $current, true ) ) {
					$all_slugs = wp_list_pluck(
						\InstantSearchForWP\PostExclusion::get_indices( $post->post_type ),
						'slug'
					);
					$current   = array_diff( $all_slugs, array( $index_slug ) );
				} else {
					$current = array_diff( $current, array( $index_slug ) );
				}
				\InstantSearchForWP\PostExclusion::set_exclusions( $post_id, array_values( $current ) );
			} else {
				\InstantSearchForWP\PostExclusion::set_exclusions( $post_id, array() );
			}

			\WP_CLI::log(
				sprintf(
					'Exclusion removed for post %d (%s) from %s.',
					$post_id,
					$post->post_title,
					$index_slug ?: 'all indices'
				)
			);
		}

		\WP_CLI::success( 'Done.' );
	}
}