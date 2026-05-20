<?php // phpcs:ignore WordPress.Files.FileName.InvalidClassFileName
/**
 * Abstract Connector Class
 *
 * This class serves as a base for creating connectors to various external services.
 * It provides common functionality and enforces the implementation of essential methods.
 *
 * Methods to be implemented by subclasses:
 * - index_posts(): Provided an array of post IDs, index them in the external service.
 * - index_all_posts(): Index all posts in the external service.
 * - format_post(): Format a single post for indexing.
 * - delete_posts(): Provided an array of post IDs, delete them from the external service.
 * - search_posts(): Search for posts in the external service.
 *
 * @package InstantSearchForWP
 * @since 1.0.0
 */

namespace InstantSearchForWP\Connectors;

use InstantSearchForWP\Settings;

/**
 * The AbstractConnector class provides a blueprint for creating connectors to external services.
 */
abstract class AbstractConnector {

	/**
	 * Constructor to initialize the connector.
	 *
	 * @return void
	 */
	public function __construct() {
		// Initialization code can go here if needed.
		add_action( 'instantsearch_index_posts', array( $this, 'index_posts' ) );
		add_action( 'instantsearch_delete_posts', array( $this, 'delete_posts' ) );

		add_action( 'update_option_' . Settings::$option_name, array( $this, 'plugin_options_changed' ), 10, 2 );
	}

	/**
	 * Get the name of the index to be used in the external service.
	 *
	 * @param string|null $index_name Optional custom index name.
	 *
	 * @return string The name of the index.
	 */
	public function index_name( $index_name = null ) {
		return Settings::get_index_name( $index_name );
	}

	/**
	 * Handle changes to plugin options.
	 *
	 * @param mixed $old_value The old option value.
	 * @param mixed $new_value The new option value.
	 * @return void
	 */
	public function plugin_options_changed( $old_value, $new_value ) {
		// If the 'indexes' setting has changed, reindex all posts.
		if ( isset( $old_value['indexes'] ) && isset( $new_value['indexes'] ) ) {
			if ( $old_value['indexes'] !== $new_value['indexes'] ) {
				do_action( 'instantsearch_for_wp_indexes_config_changed', $new_value['indexes'], $old_value['indexes'] );
			}
		}
	}

	/**
	 * Break a long string into chunks of approximately 250 words at sentence boundaries.
	 *
	 * @param string $text The input text.
	 * @param int    $chunk_size The approximate number of words per chunk.
	 * @param bool   $overlap Whether to overlap chunks with the previous and next sentences.
	 *
	 * @return array Array of text chunks.
	 */
	public function chunk_text_by_sentences( string $text, int $chunk_size = 1000, bool $overlap = true ): array {

		$words_per_chunk = apply_filters( 'instantsearch_for_wp_words_per_chunk', $chunk_size, $this );

		// Normalize whitespace and remove leading/trailing spaces.
		$text = trim( preg_replace( '/\s+/', ' ', $text ) );

		// Use a regex to split the text into sentences.
		$sentences = preg_split( '/(?<=[.?!])\s+(?=[A-Z])/', $text );

		$chunks             = array();
		$current_chunk      = '';
		$current_word_count = 0;

		$previous_sentence = '';

		foreach ( $sentences as $idx => $sentence ) {
			$sentence = trim( $sentence );
			if ( empty( $sentence ) ) {
				continue;
			}

			$sentence_word_count = str_word_count( $sentence );

			// If adding this sentence would exceed the target chunk size, start a new chunk.
			if ( $current_word_count + $sentence_word_count > $words_per_chunk && ! empty( $current_chunk ) ) {

				// If overlap is enabled, add the previous and next sentence to the current chunk.
				if ( $overlap && $idx > 0 ) {
					// If this is not the first sentence, add the previous sentence to the current chunk.
					$current_chunk = $previous_sentence . ' ' . $current_chunk;

					// If this is not the last sentence, add the next sentence to the current chunk.
					if ( isset( $sentences[ $idx + 1 ] ) ) {
						$next_sentence = trim( $sentences[ $idx + 1 ] );
						if ( ! empty( $next_sentence ) ) {
							$current_chunk .= ' ' . $next_sentence;
						}
					}
				}
				$chunks[] = trim( $current_chunk );

				$current_chunk      = $sentence . ' ';
				$current_word_count = $sentence_word_count;
			} else {
				$current_chunk     .= $sentence . ' ';
				$current_word_count += $sentence_word_count;
			}

			$previous_sentence = $sentence;
		}

		// Add the final chunk if not empty.
		if ( ! empty( $current_chunk ) ) {
			$chunks[] = trim( $current_chunk );
		}

		return $chunks;
	}

	/**
	 * Index the given posts in the external service.
	 *
	 * @param array $post_ids Array of post IDs to index.
	 *
	 * @return mixed Response from the indexing operation.
	 */
	abstract public function index_posts( array $post_ids, $index = null );

	/**
	 * Format a single post for indexing.
	 *
	 * @param int $post_id The ID of the post to format.
	 * @return array Formatted post data.
	 */
	abstract public function format_post( $post_id );

	/**
	 * Delete the given posts from the external service.
	 *
	 * @param array $post_ids Array of post IDs to delete.
	 *
	 * @return mixed Response from the deletion operation.
	 */
	abstract public function delete_posts( array $post_ids, $index = null );

	/**
	 * Delete records from the external service using WordPress-style query arguments.
	 *
	 * @param array $query_args WordPress-style query arguments used to target records.
	 *
	 * @return mixed Response from the deletion operation.
	 */
	abstract public function delete_by_query( array $query_args, $index = null );

	/**
	 * Search for posts in the external service.
	 *
	 * @param string $query The search query.
	 * @param array  $args  Additional search arguments.
	 * @return array Search results.
	 */
	abstract public function search_posts( $query, array $args = array() );

	/**
	 * Clear the index.
	 * 
	 * @param mixed $index_name Index name to clear.
	 *
	 * @return void
	 */
	abstract public function clear_index( $index_name = null );
}
