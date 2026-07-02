import './admin-v2.scss';
import domReady from '@wordpress/dom-ready';
import { createRoot } from '@wordpress/element';
import App from './App';

domReady( () => {
	const adminAppElement = document.getElementById( 'instantsearch-admin-app' );
	if ( adminAppElement ) {
		const root = createRoot( adminAppElement );
		root.render( <App /> );
	}
} );
