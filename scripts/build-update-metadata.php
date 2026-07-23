<?php
/**
 * Build a Plugin Update Checker metadata file for InstantSearch for WP.
 *
 * Runs in CI (see .github/workflows/release-r2.yml); mirrors yoko-core's
 * scripts/build-update-metadata.php.
 *
 * Usage:
 * php scripts/build-update-metadata.php \
 *   --download-url="https://downloads.example.com/instantsearch-for-wp/instantsearch-for-wp.zip" \
 *   --output="/tmp/info.json"
 *
 * @package InstantSearchForWP
 */

$options = getopt( '', array( 'download-url:', 'output:' ) );

if ( empty( $options['download-url'] ) || empty( $options['output'] ) ) {
	fwrite( STDERR, "Missing required options: --download-url and --output\n" );
	exit( 1 );
}

$root        = dirname( __DIR__ );
$plugin_file = $root . '/instantsearch-for-wp.php';
$readme_file = $root . '/readme.txt';

$plugin_headers = isfwp_read_headers(
	$plugin_file,
	array(
		'Plugin Name',
		'Plugin URI',
		'Description',
		'Author',
		'Author URI',
		'Version',
	)
);

$readme_headers = isfwp_read_headers(
	$readme_file,
	array(
		'Requires at least',
		'Tested up to',
		'Requires PHP',
	)
);

$readme_contents = file_get_contents( $readme_file );
if ( false === $readme_contents ) {
	fwrite( STDERR, "Unable to read readme.txt\n" );
	exit( 1 );
}

$sections = array_filter(
	array(
		'description'  => isfwp_readme_section_to_html( $readme_contents, 'Description' ),
		'installation' => isfwp_readme_section_to_html( $readme_contents, 'Installation' ),
		'changelog'    => isfwp_readme_section_to_html( $readme_contents, 'Changelog' ),
	)
);

$metadata = array_filter(
	array(
		'name'            => $plugin_headers['Plugin Name'],
		'slug'            => 'instantsearch-for-wp',
		'version'         => $plugin_headers['Version'],
		'homepage'        => $plugin_headers['Plugin URI'],
		'download_url'    => $options['download-url'],
		'author'          => $plugin_headers['Author'],
		'author_homepage' => $plugin_headers['Author URI'],
		'requires'        => $readme_headers['Requires at least'],
		'tested'          => $readme_headers['Tested up to'],
		'requires_php'    => $readme_headers['Requires PHP'],
		'sections'        => $sections,
	),
	static function ( $value ) {
		return '' !== $value && array() !== $value && null !== $value;
	}
);

$json = json_encode( $metadata, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES );
if ( false === $json ) {
	fwrite( STDERR, "Unable to encode metadata JSON\n" );
	exit( 1 );
}

if ( false === file_put_contents( $options['output'], $json . PHP_EOL ) ) {
	fwrite( STDERR, "Unable to write metadata file\n" );
	exit( 1 );
}

/**
 * Read header values from a file using WordPress-style header syntax.
 *
 * @param string   $file    File to parse.
 * @param string[] $headers Header names to extract.
 * @return array<string, string>
 */
function isfwp_read_headers( $file, array $headers ) {
	$contents = file_get_contents( $file );
	if ( false === $contents ) {
		fwrite( STDERR, sprintf( "Unable to read %s\n", basename( $file ) ) );
		exit( 1 );
	}

	$values = array_fill_keys( $headers, '' );
	foreach ( $headers as $header ) {
		$pattern = sprintf( '/^[ \t\/*#@]*%s:\s*(.+)$/mi', preg_quote( $header, '/' ) );
		if ( preg_match( $pattern, $contents, $matches ) ) {
			$values[ $header ] = trim( $matches[1] );
		}
	}

	return $values;
}

/**
 * Convert a section from the WordPress.org readme into simple HTML.
 *
 * @param string $readme       Readme contents.
 * @param string $section_name Heading text without the surrounding equals signs.
 * @return string
 */
function isfwp_readme_section_to_html( $readme, $section_name ) {
	$pattern = sprintf(
		'/^==\s*%1$s\s*==\s*$(.*?)(?=^==\s*[^=]+\s*==\s*$|\z)/ms',
		preg_quote( $section_name, '/' )
	);

	if ( ! preg_match( $pattern, $readme, $matches ) ) {
		return '';
	}

	$section = trim( $matches[1] );
	if ( '' === $section ) {
		return '';
	}

	$lines       = preg_split( '/\R/', $section );
	$html_chunks = array();
	$list_items  = array();

	foreach ( $lines as $line ) {
		$trimmed = trim( $line );

		if ( '' === $trimmed ) {
			if ( ! empty( $list_items ) ) {
				$html_chunks[] = '<ul><li>' . implode( '</li><li>', $list_items ) . '</li></ul>';
				$list_items    = array();
			}
			continue;
		}

		if ( preg_match( '/^=+\s*(.+?)\s*=+$/', $trimmed, $heading_matches ) ) {
			if ( ! empty( $list_items ) ) {
				$html_chunks[] = '<ul><li>' . implode( '</li><li>', $list_items ) . '</li></ul>';
				$list_items    = array();
			}

			$html_chunks[] = '<h4>' . htmlspecialchars( trim( $heading_matches[1], " =\t" ), ENT_QUOTES ) . '</h4>';
			continue;
		}

		if ( preg_match( '/^[*-]\s+(.+)$/', $trimmed, $item_matches ) ) {
			$list_items[] = htmlspecialchars( $item_matches[1], ENT_QUOTES );
			continue;
		}

		if ( ! empty( $list_items ) ) {
			$html_chunks[] = '<ul><li>' . implode( '</li><li>', $list_items ) . '</li></ul>';
			$list_items    = array();
		}

		$html_chunks[] = '<p>' . htmlspecialchars( $trimmed, ENT_QUOTES ) . '</p>';
	}

	if ( ! empty( $list_items ) ) {
		$html_chunks[] = '<ul><li>' . implode( '</li><li>', $list_items ) . '</li></ul>';
	}

	return implode( "\n", $html_chunks );
}
