const defaultConfig = require( '@wordpress/scripts/config/webpack.config' );
const { getWebpackEntryPoints } = require( '@wordpress/scripts/utils' );
const path = require( 'path' );

module.exports = {
	...defaultConfig,
	entry: {
		...getWebpackEntryPoints( 'script' )(),
		admin: path.resolve( process.cwd(), 'src/admin', 'index.js' ),
		'admin-v2': path.resolve( process.cwd(), 'src/admin-v2', 'index.js' ),
		instantsearch: path.resolve( process.cwd(), 'src/instantsearch', 'index.js' ),
		'post-exclusion': path.resolve( process.cwd(), 'src/post-exclusion', 'index.js' ),
	},
};
