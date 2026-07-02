/**
 * Partial webpack config that builds only the admin dashboard bundles.
 * Useful for quick iteration on the settings SPA without rebuilding blocks:
 *   npx wp-scripts build --config webpack.admin-only.config.js
 */
const defaultConfig = require( '@wordpress/scripts/config/webpack.config' );
const path = require( 'path' );

module.exports = {
	...defaultConfig,
	entry: {
		admin: path.resolve( process.cwd(), 'src/admin', 'index.js' ),
		'admin-v2': path.resolve( process.cwd(), 'src/admin-v2', 'index.js' ),
	},
	output: {
		...defaultConfig.output,
		clean: false,
	},
	plugins: defaultConfig.plugins.filter(
		( plugin ) => plugin.constructor.name !== 'CleanWebpackPlugin'
	),
};
