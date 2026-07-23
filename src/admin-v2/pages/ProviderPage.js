/**
 * Provider Setup page — reuses the v1 ProviderConfig component so every
 * provider configuration option stays in parity with v1.
 */
import { Card } from '@wordpress/components';

import ProviderConfig from '../../admin/components/ProviderConfig';

const ProviderPage = () => (
	<Card>
		<ProviderConfig />
	</Card>
);

export default ProviderPage;
