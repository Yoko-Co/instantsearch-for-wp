import { Card, CardBody } from '@wordpress/components';
import { __ } from '@wordpress/i18n';
import { Link } from 'react-router-dom';

const NotFoundPage = () => (
	<Card>
		<CardBody>
			<p>{ __( 'That screen could not be found.', 'instantsearch-for-wp' ) }</p>
			<Link to="/">{ __( 'Back to the dashboard home.', 'instantsearch-for-wp' ) }</Link>
		</CardBody>
	</Card>
);

export default NotFoundPage;
