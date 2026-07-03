/**
 * Partial webpack config for iterating on the SiteSearch integration:
 * admin bundles, the SiteSearch frontend glue, the search-button block,
 * and the vendored @algolia/sitesearch bundles. Does not clean build/.
 *   npx wp-scripts build --webpack-copy-php --config webpack.sitesearch.config.js
 */
const defaultConfig = require( '@wordpress/scripts/config/webpack.config' );
const CopyWebpackPlugin = require( 'copy-webpack-plugin' );
const path = require( 'path' );

module.exports = {
	...defaultConfig,
	entry: {
		admin: path.resolve( process.cwd(), 'src/admin', 'index.js' ),
		'admin-v2': path.resolve( process.cwd(), 'src/admin-v2', 'index.js' ),
		'sitesearch-frontend': path.resolve( process.cwd(), 'src/sitesearch', 'frontend.js' ),
		'blocks/search-button/index': path.resolve( process.cwd(), 'src/blocks/search-button', 'index.js' ),
	},
	output: {
		...defaultConfig.output,
		clean: false,
	},
	plugins: [
		...defaultConfig.plugins.filter(
			( plugin ) => plugin.constructor.name !== 'CleanWebpackPlugin'
		),
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
