# InstantSearch for WP

## Road Map

- [X] Chunking
- [X] Distinct on post id

## Coming Up

- [] Algolia custom ranking configuration on first sync so that it can be overriden after.

## Filters

### should_index_unattached_media

Controls whether unattached media attachments should be indexed when attachment indexing is enabled.

- Default: false
- Parameters:
  - bool $should_index_unattached_media
  - \WP_Post $post
  - Index|null $index

Example:

	add_filter(
		'should_index_unattached_media',
		function ( $should_index_unattached_media, $post, $index ) {
			return true;
		},
		10,
		3
	);