const defaultConfig = require( '@wordpress/scripts/config/webpack.config' );
const { getWebpackEntryPoints } = require( '@wordpress/scripts/utils' );
const CopyWebpackPlugin = require( 'copy-webpack-plugin' );
const path = require( 'path' );

module.exports = {
	...defaultConfig,
	entry: {
		...getWebpackEntryPoints( 'script' )(),
		admin: path.resolve( process.cwd(), 'src/admin', 'index.js' ),
		'admin-v2': path.resolve( process.cwd(), 'src/admin-v2', 'index.js' ),
		instantsearch: path.resolve( process.cwd(), 'src/instantsearch', 'index.js' ),
		'post-exclusion': path.resolve( process.cwd(), 'src/post-exclusion', 'index.js' ),
		'sitesearch-frontend': path.resolve( process.cwd(), 'src/sitesearch', 'frontend.js' ),
	},
	plugins: [
		...defaultConfig.plugins,
		// Vendor the prebuilt Algolia SiteSearch experience bundles (UMD + CSS).
		// These are self-contained dist files, not webpack entries.
		new CopyWebpackPlugin( {
			patterns: [
				{
					from: 'node_modules/@algolia/sitesearch/dist/*.min.{js,css}',
					to: 'sitesearch/[name][ext]',
				},
			],
		} ),
	],
};
