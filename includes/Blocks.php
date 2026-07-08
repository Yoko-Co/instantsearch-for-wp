<?php
/**
 * Blocks class — registers Gutenberg blocks and block patterns.
 *
 * @package InstantSearchForWP
 * @since   1.1.0
 */

namespace InstantSearchForWP;

// Exit if accessed directly.
if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Handles block category registration, block type registration, and block patterns.
 */
class Blocks {

	/**
	 * Block names managed by this plugin.
	 *
	 * @var string[]
	 */
	private static array $blocks = [
		'instantsearch',
		'ask-ai',
		'search-box',
		'hits',
		'hits-per-page',
		'configure',
		'refinement-list',
		'pagination',
		'stats',
		'sort-by',
		'current-refinements',
		'clear-refinements',
		'menu-select',
	];

	/**
	 * Wire up all hooks.
	 *
	 * @return void
	 */
	public function __construct() {
		add_filter( 'block_categories_all', [ $this, 'register_block_category' ], 10, 2 );
		add_action( 'init', [ $this, 'register_blocks' ] );
		add_action( 'init', [ $this, 'register_block_patterns' ] );
		add_action( 'init', [ $this, 'register_block_pattern_categories' ] );
	}

	/**
	 * Prepend an "InstantSearch" category in the block inserter.
	 *
	 * @param  array    $categories Existing block categories.
	 * @param  \WP_Post $post       Current post object.
	 * @return array
	 */
	public function register_block_category( array $categories, $post ): array {
		return array_merge(
			[
				[
					'slug'  => 'instantsearch-for-wp',
					'title' => __( 'InstantSearch', 'instantsearch-for-wp' ),
					'icon'  => 'search',
				],
			],
			$categories
		);
	}

	/**
	 * Register all block types from the build directory.
	 *
	 * @return void
	 */
	public function register_blocks(): void {
		$build_dir = INSTANTSEARCH_FOR_WP_PATH . '/build/blocks';

		if ( ! is_dir( $build_dir ) ) {
			return;
		}

		$blocks = self::$blocks;

		// The Search Button block hosts the native Algolia SiteSearch trigger
		// and is only registered while a SiteSearch experience is active.
		if ( 'instant_search' !== Settings::get_search_experience() ) {
			$blocks[] = 'search-button';
		}

		foreach ( $blocks as $block_name ) {
			$block_path = $build_dir . '/' . $block_name;

			if ( is_dir( $block_path ) ) {
				register_block_type( $block_path );
			}
		}
	}

	/**
	 * Register the "instantsearch-for-wp" pattern category.
	 *
	 * @return void
	 */
	public function register_block_pattern_categories(): void {
		register_block_pattern_category(
			'instantsearch-for-wp',
			[
				'label'       => __( 'InstantSearch', 'instantsearch-for-wp' ),
				'description' => __( 'Search interface patterns powered by InstantSearch for WP.', 'instantsearch-for-wp' ),
			]
		);
	}

	/**
	 * Register block patterns.
	 *
	 * @return void
	 */
	public function register_block_patterns(): void {
		register_block_pattern(
			'instantsearch-for-wp/search-with-sidebar-filters',
			[
				'title'       => __( 'Search with Sidebar Filters', 'instantsearch-for-wp' ),
				'description' => __( 'A two-column search layout with a search box and results on the left, and facet filters on the right.', 'instantsearch-for-wp' ),
				'categories'  => [ 'instantsearch-for-wp' ],
				'keywords'    => [ 'search', 'filter', 'facet', 'sidebar', 'instantsearch' ],
				'content'     => $this->get_pattern_search_with_sidebar(),
			]
		);

		register_block_pattern(
			'instantsearch-for-wp/simple-search-bar-results',
			[
				'title'       => __( 'Simple Search Bar + Results', 'instantsearch-for-wp' ),
				'description' => __( 'A clean single-column search interface with a search bar, result count, and paginated results.', 'instantsearch-for-wp' ),
				'categories'  => [ 'instantsearch-for-wp' ],
				'keywords'    => [ 'search', 'results', 'simple', 'instantsearch' ],
				'content'     => $this->get_pattern_simple_search(),
			]
		);
	}

	/**
	 * Block pattern: Search with Sidebar Filters.
	 *
	 * @return string
	 */
	private function get_pattern_search_with_sidebar(): string {
		return '<!-- wp:instantsearch-for-wp/instantsearch {"metadata":{"name":"Search with Sidebar Filters"}} -->
<!-- wp:columns -->
<div class="wp-block-columns">
<!-- wp:column {"width":"66.66%","metadata":{"name":"Results Column"}} -->
<div class="wp-block-column" style="flex-basis:66.66%">
<!-- wp:instantsearch-for-wp/search-box {"metadata":{"name":"Search Box"}} /-->
<!-- wp:instantsearch-for-wp/stats {"metadata":{"name":"Result Count"}} /-->
<!-- wp:instantsearch-for-wp/current-refinements {"metadata":{"name":"Active Filters"}} /-->
<!-- wp:instantsearch-for-wp/hits {"metadata":{"name":"Search Results"}} /-->
<!-- wp:instantsearch-for-wp/pagination {"metadata":{"name":"Pagination"}} /-->
</div>
<!-- /wp:column -->
<!-- wp:column {"width":"33.33%","metadata":{"name":"Filters Column"}} -->
<div class="wp-block-column" style="flex-basis:33.33%">
<!-- wp:instantsearch-for-wp/clear-refinements {"metadata":{"name":"Clear Filters"}} /-->
<!-- wp:instantsearch-for-wp/refinement-list {"attribute":"post_type","label":"Content Type","metadata":{"name":"Content Type Filter"}} /-->
<!-- wp:instantsearch-for-wp/refinement-list {"attribute":"taxonomies.category","label":"Category","metadata":{"name":"Category Filter"}} /-->
</div>
<!-- /wp:column -->
</div>
<!-- /wp:columns -->
<!-- /wp:instantsearch-for-wp/instantsearch -->';
	}

	/**
	 * Block pattern: Simple Search Bar + Results.
	 *
	 * @return string
	 */
	private function get_pattern_simple_search(): string {
		return '<!-- wp:instantsearch-for-wp/instantsearch {"metadata":{"name":"Simple Search"}} -->
<!-- wp:instantsearch-for-wp/search-box {"metadata":{"name":"Search Box"}} /-->
<!-- wp:instantsearch-for-wp/stats {"metadata":{"name":"Result Count"}} /-->
<!-- wp:instantsearch-for-wp/hits {"metadata":{"name":"Search Results"}} /-->
<!-- wp:instantsearch-for-wp/pagination {"metadata":{"name":"Pagination"}} /-->
<!-- /wp:instantsearch-for-wp/instantsearch -->';
	}
}
