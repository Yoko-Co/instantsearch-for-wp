<?php
/**
 * Algolia Connector Class
 *
 * This class implements the AbstractConnector to provide integration with the Algolia search service.
 * It includes methods for indexing, formatting, deleting, and searching posts using Algolia's API
 *
 * @package InstantSearchForWP
 * @since 1.0.0
 */

namespace InstantSearchForWP\Connectors;

use InstantSearchForWP\Settings;
use InstantSearchForWP\Index;
use InstantSearchForWP\PostExclusion;
use InstantSearchForWP\PDFTextExtractor;
use Algolia\AlgoliaSearch\Api\SearchClient;

/**
 * The AlgoliaConnector class provides methods to interact with the Algolia search service.
 */
class AlgoliaConnector extends AbstractConnector {

	/**
	 * The Algolia client instance.
	 *
	 * @var \Algolia\AlgoliaSearch\Api\SearchClient
	 */
	protected $client;

	/**
	 * The Algolia index instance.
	 *
	 * @var \Algolia\AlgoliaSearch\Api\SearchIndex
	 */
	protected $index;

	/**
	 * Constructor to initialize the Algolia client and index.
	 */
	public function __construct() {
		parent::__construct();

		[ $app_id, $api_key ] = $this->get_credentials();

		try {

			// Trigger index settings update when indexes post type changes are saved.
			add_action( 'save_post_' . Index::$cpt_slug, array( $this, 'update_index_settings' ), 10, 2 );

			add_filter( 'instantsearch_for_wp_settings_schema', array( $this, 'filter_settings_schema' ) );
			add_filter( 'instantsearch_for_wp_default_settings', array( $this, 'filter_default_settings' ) );

			add_filter( 'instantsearch_for_wp_instantsearch_config', array( $this, 'filter_instantsearch_config' ) );
			
			$this->client = SearchClient::create( $app_id, $api_key );
		} catch ( \Throwable $th ) {
			//throw $th;
			error_log( $th->getMessage() );
		}
	}

	/**
	 * Filter the default settings to set the provider to Algolia.
	 *
	 * @param array $default_settings The default settings array.
	 * @return array The modified default settings array.
	 */
	public function filter_default_settings( $default_settings ) {
		$default_settings['algolia'] = array(
			'app_id'              => '',
			'search_only_api_key' => '',
			'admin_api_key'       => '',
			'hide_algolia_badge'  => false,
			'ai_summaries_enabled' => false,
			'ask_ai_agent_id'      => '',
		);
		return $default_settings;
	}

	/**
	 * Filter the settings schema to include Algolia settings.
	 *
	 * @param array $schema The settings schema array.
	 * @return array The modified settings schema array.
	 */
	public function filter_settings_schema( $schema ) {

		if ( ! in_array( 'algolia', $schema['properties']['provider']['enum'], true ) ) {
			$schema['properties']['provider']['enum'][] = 'algolia';
		}

		$schema['properties']['algolia'] = array(
			'type'       => 'object',
			'properties' => array(
				'app_id'              => array(
					'type' => 'string',
				),
				'search_only_api_key' => array(
					'type' => 'string',
				),
				'admin_api_key'       => array(
					'type' => 'string',
				),
				'hide_algolia_badge'  => array(
					'type'    => 'boolean',
					'default' => false,
				),
				'ai_summaries_enabled' => array(
					'type'    => 'boolean',
					'default' => false,
				),
				'ask_ai_agent_id' => array(
					'type'    => 'string',
					'default' => '',
				),
			),
		);
		return $schema;
	}

	public function filter_instantsearch_config( $config ) {
		$settings = Settings::get_settings();

		if ( isset( $settings['algolia']['app_id'] ) && $settings['algolia']['app_id'] ) {
			$config['appId'] = $settings['algolia']['app_id'];
		}

		if ( isset( $settings['algolia']['search_only_api_key'] ) && $settings['algolia']['search_only_api_key'] ) {
			$config['apiKey'] = $settings['algolia']['search_only_api_key'];
		}

		if ( isset( $settings['algolia']['hide_algolia_badge'] ) && $settings['algolia']['hide_algolia_badge'] ) {
			$config['hidePoweredBy'] = true;
		}
		return $config;
	}

	/**
	 * Retrieve Algolia credentials from settings or environment.
	 *
	 * @return array An array containing the application ID and API key.
	 */
	protected function get_credentials() {

		$keys = array();

		$algolia_api_settings = Settings::get_settings( 'algolia' );
		if ( ! empty( $algolia_api_settings['app_id'] ) && ! empty( $algolia_api_settings['admin_api_key'] ) ) {
			$keys = array( $algolia_api_settings['app_id'], $algolia_api_settings['admin_api_key'] );
		}

		// Allow overriding via constants for easier configuration in different environments.
		if ( defined( 'ALGOLIA_APP_ID' ) ) {
			$keys[0] = ALGOLIA_APP_ID;
		}
		if ( defined( 'ALGOLIA_API_KEY' ) ) {
			$keys[1] = ALGOLIA_API_KEY;
		}
		if ( count( $keys ) === 2 ) {
			return $keys;
		}

		return array( '', '' );
	}

	/**
	 * Index the given posts in the Algolia service.
	 *
	 * @param array       $post_ids Array of post IDs to index.
	 * @param string|null $index_name Optional custom index name.
	 *
	 * @return array|null Response from Algolia or null if no records to index.
	 */
	public function index_posts( array $post_ids, $index = null ) {
		$records = array();

		if ( null === $index ) {
			$index = new Index();
		}

		if ( ! empty( $index->index_settings['post_types'] ) ) {
			// Filter post IDs by post type for this index.
			$post_ids = array_filter(
				$post_ids,
				function ( $post_id ) use ( $index ) {
					$post = get_post( $post_id );
					if ( ! $post ) {
						return false;
					}

					if ( 'attachment' === $post->post_type ) {
						return 'application/pdf' === get_post_mime_type( $post_id )
							&& in_array( 'attachment', $index->index_settings['post_types'], true );
					}

					return in_array( $post->post_type, $index->index_settings['post_types'], true );
				}
			);
		}

		if ( empty( $post_ids ) ) {
			return null;
		}

		// Delete all records with postIDs in $post_ids before re-indexing.
		$this->delete_posts( $post_ids, $index );
		foreach ( $post_ids as $post_id ) {
			$record = $this->format_post( $post_id, $index );

			if ( $record ) {
				$content_chunks = $this->chunk_text_by_sentences( $record['content'] ?? '', 500, true );
				if ( count( $content_chunks ) > 1 ) {
					foreach ( $content_chunks as $chunk ) {
						$chunked_record            = $record;
						$chunked_record['content'] = $chunk;
						$records[]                 = $chunked_record;
					}
					continue;
				}

				$records[] = $record;
			}
		}

		if ( ! empty( $records ) ) {
			return $this->client->saveObjects(
				$index->name,
				$records,
				false,
				1000,
				array(
					'autoGenerateObjectIDIfNotExist' => true,
				)
			);
		}

		return null;
	}

	/**
	 * Format a single post for indexing in Algolia.
	 *
	 * @param int $post_id The ID of the post to format.
	 * @return array|null Formatted post data or null if post not found.
	 */
	public function format_post( $post_id, Index $index = null ) {
		$post = get_post( $post_id );
		if ( ! $post ) {
			return null;
		}

		$now = current_time( 'mysql' );
		$post_content = wp_strip_all_tags( apply_filters( 'the_content', $post->post_content ) );
		$post_excerpt = wp_strip_all_tags( (string) $post->post_excerpt );

		$record = array(
			'postID'         => $post->ID,
			'title'          => wp_strip_all_tags( apply_filters( 'the_title', $post->post_title ) ),
			'content'        => $post_content,
			'excerpt'        => $post_excerpt,
			'date'           => $post->post_date,
			'date_ts'        => strtotime( $post->post_date_gmt ),
			'post_type_slug' => sanitize_key( $post->post_type ),
			'post_type'      => get_post_type_object( $post->post_type )->label,
			'indexed_at'     => $now,
			'indexed_at_ts'  => strtotime( $now ),
			'url'            => get_permalink( $post->ID ),
		);

		if ( 'attachment' === $post->post_type && 'application/pdf' === get_post_mime_type( $post->ID ) ) {
			$pdf_content = PDFTextExtractor::get_instance()->get_attachment_text( $post->ID );
			$record['content'] = $pdf_content;
			$record['mime_type'] = 'application/pdf';
		}

		if ( $post->post_author ) {
			$record['author'] = get_the_author_meta( 'display_name', $post->post_author );
		}

		// If post has a featured image, include its URL.
		if ( has_post_thumbnail( $post->ID ) ) {
			$thumbnail_id  = get_post_thumbnail_id( $post->ID );
			$thumbnail_url = wp_get_attachment_image_url( $thumbnail_id, 'full' );
			if ( $thumbnail_url ) {
				$record['image'] = $thumbnail_url;
			}
		}

		if ( $index->index_settings['taxonomies'] ?? false ) {
			$record['taxonomy'] = array();
			foreach ( $index->index_settings['taxonomies'] as $taxonomy ) {
				$terms = get_the_terms( $post->ID, $taxonomy );
				if ( ! is_wp_error( $terms ) && ! empty( $terms ) ) {
					$term_names = array();
					foreach ( $terms as $term ) {
						$term_names[] = $term->name;
					}
					$record['taxonomy'][ $taxonomy ] = $term_names;
				}
			}
		}

		$record = apply_filters( 'instantsearch_algolia_record', $record, $post, $index );

		$default_record_includes = array_keys( $record );
		$record_includes = apply_filters( 'instantsearch_default_record_fields_to_include', $default_record_includes, $post, $index );
		$record_excludes = apply_filters( 'instantsearch_default_record_fields_to_exclude', array(), $post, $index );

		if ( is_array( $record_includes ) && ! empty( $record_includes ) ) {
			$record = array_intersect_key( $record, array_flip( $record_includes ) );
		}

		if ( is_array( $record_excludes ) && ! empty( $record_excludes ) ) {
			$record = array_diff_key( $record, array_flip( $record_excludes ) );
		}

		return $record;
	}

	/**
	 * Delete the given posts from the Algolia service.
	 *
	 * Use a search based delete in order to delete by postID.
	 *
	 * @param array $post_ids Array of post IDs to delete.
	 *
	 * @return void
	 */
	public function delete_posts( array $post_ids, $index = null ) {
		// Use Browse API to find all redords with postID in $post_ids and delete them.
		$filters = implode(
			' OR ',
			array_map(
				function ( $id ) {
					return 'postID:' . $id;
				},
				$post_ids
			)
		);

		// Browse to get all objectIDs matching the filters.
		$object_ids = array();
		try {
			$iterator = $this->client->browse(
				$index->name,
				array(
					'attributesToRetrieve' => array( 'objectID' ),
					'filters' => $filters,
				)
			);
			foreach ( $iterator['hits'] as $hit ) {
				if ( isset( $hit['objectID'] ) ) {
					$object_ids[] = $hit['objectID'];
				}
			}

			// Delete the objects by their objectIDs.
			if ( ! empty( $object_ids ) ) {
				$this->client->deleteObjects( $index->name, $object_ids );
			}
		} catch ( \Throwable $th ) {
			return;
		}
	}

	/**
	 * Search for posts in the Algolia service.
	 *
	 * @param string $query The search query.
	 * @param array  $args  Additional search arguments.
	 * @return array Search results.
	 */
	public function search_posts( $query, array $args = array() ) {
		$results = $this->client->search( $query, $args );
		return $results['hits'];
	}

	/**
	 * Update index settings when the indexes configuration changes.
	 *
	 * @return void
	 */
	public function update_index_settings( $post_id, $index_post ) {
		$index      = json_decode( $index_post->post_content, true );
		$index_name = $this->index_name( $index_post->post_name );

		$searchable_attributes = array( 'title', 'content', 'author', 'post_type' );
		$facet_attributes 	   = array( 'post_type' );

		// Allow filtering of taxonomies to be used as facets.
		if ( isset( $index['taxonomies'] ) && is_array( $index['taxonomies'] ) ) {
			foreach ( $index['taxonomies'] as $taxonomy ) {
				$facet_attributes[] = 'taxonomy.' . $taxonomy;
			}
		}

		$searchable_attributes  = apply_filters( 'instantsearch_searchable_attributes', $searchable_attributes, $index['name'] ?? 'search' );
		$filter_only_attributes = apply_filters( 'instantsearch_filterable_attributes', array( 'postID', 'post_type_slug' ), $index['name'] ?? 'search' );
		$facet_attributes       = apply_filters( 'instantsearch_facet_attributes', $facet_attributes, $index['name'] ?? 'search' );
		$index_name_for_filter  = $index['name'] ?? 'search';

		$attributes_to_retrieve_include = apply_filters(
			'instantsearch_attributes_to_retrieve_include',
			array( '*' ),
			$index_name_for_filter
		);
		$attributes_to_retrieve_exclude = apply_filters(
			'instantsearch_attributes_to_retrieve_exclude',
			array( 'indexed_at', 'indexed_at_ts', 'date_ts' ),
			$index_name_for_filter
		);
		$unretrievable_attributes = apply_filters(
			'instantsearch_unretrievable_attributes',
			array(),
			$index_name_for_filter
		);

		$attributes_to_retrieve = array();
		if ( is_array( $attributes_to_retrieve_include ) ) {
			$attributes_to_retrieve = array_values( array_filter( array_map( 'strval', $attributes_to_retrieve_include ) ) );
		}

		if ( is_array( $attributes_to_retrieve_exclude ) ) {
			foreach ( $attributes_to_retrieve_exclude as $excluded_attribute ) {
				$excluded_attribute = (string) $excluded_attribute;
				if ( '' === $excluded_attribute ) {
					continue;
				}

				$attributes_to_retrieve[] = '-' . ltrim( $excluded_attribute, '-' );
			}
		}

		$attributes_to_retrieve = array_values( array_unique( $attributes_to_retrieve ) );
		$unretrievable_attributes = is_array( $unretrievable_attributes )
			? array_values( array_unique( array_filter( array_map( 'strval', $unretrievable_attributes ) ) ) )
			: array();

		$attributes_for_faceting = array();
		foreach ( $filter_only_attributes as $attr ) {
			$attributes_for_faceting[] = 'filterOnly(' . $attr . ')';
		}
		foreach ( $facet_attributes as $attr ) {
			$attributes_for_faceting[] = 'afterDistinct(searchable(' . $attr . '))';
		}

		$index_settings = array(
			'searchableAttributes'   => array_merge( $searchable_attributes, $facet_attributes ),
			'attributesForFaceting'  => $attributes_for_faceting,
			'attributesToRetrieve'   => $attributes_to_retrieve,
			'unretrievableAttributes' => $unretrievable_attributes,
			'distinct'               => 1,
			'attributeForDistinct'   => 'postID',
			// Set searchable attributes as highligthtedAttributes to ensure they are highlighted in results.
			'attributesToHighlight'  => $searchable_attributes,
			'attributesToSnippet'    => apply_filters( 'instantsearch_attributes_to_snippet', array( 'content', 'excerpt' ), $index['name'] ?? 'search' ),
			'removeWordsIfNoResults' => apply_filters( 'instantsearch_remove_words_if_no_results', 'allOptional', $index['name'] ?? 'search' )
		);

		$index_settings = apply_filters( 'instantsearch_index_settings', $index_settings, $index['name'] ?? 'search' );

		$this->client->setSettings(
			$index_name,
			$index_settings,
			true
		);
	}

	/**
	 * Clear the index.
	 *
	 * @param mixed $index_name Index name to clear.
	 *
	 * @return void
	 */
	public function clear_index( $index_name = null ) {
		$this->client->clearObjects( $index_name );
	}
}
