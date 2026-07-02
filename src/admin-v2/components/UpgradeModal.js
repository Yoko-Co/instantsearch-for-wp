/**
 * Upsell modal shown when a free-plan user tries to create a second index.
 */
import { __ } from '@wordpress/i18n';
import { Button, Modal } from '@wordpress/components';
import { Icon, lock } from '@wordpress/icons';

import { useIndexes } from './IndexesContext';

const UpgradeModal = ( { onClose } ) => {
	const { licensing } = useIndexes();

	return (
		<Modal
			title={ __( 'Multiple Indexes is a Professional feature', 'instantsearch-for-wp' ) }
			onRequestClose={ onClose }
			className="instantsearch-admin-v2__upgrade-modal"
		>
			<div className="instantsearch-admin-v2__upgrade-modal-body">
				<Icon icon={ lock } size={ 32 } />
				<p>
					{ __(
						'The free version of InstantSearch for WP includes one search index. Upgrade to Professional to create additional indexes with subsets of your content — for example a dedicated index for products, documentation, or a specific post type.',
						'instantsearch-for-wp'
					) }
				</p>
			</div>
			<div className="instantsearch-admin-v2__upgrade-modal-actions">
				{ licensing.upgradeUrl && (
					<Button variant="primary" href={ licensing.upgradeUrl } __next40pxDefaultSize>
						{ __( 'Upgrade to Professional', 'instantsearch-for-wp' ) }
					</Button>
				) }
				{ licensing.trialUrl && ! licensing.isTrialUtilized && (
					<Button variant="secondary" href={ licensing.trialUrl } __next40pxDefaultSize>
						{ __( 'Start free trial', 'instantsearch-for-wp' ) }
					</Button>
				) }
				<Button variant="tertiary" onClick={ onClose } __next40pxDefaultSize>
					{ __( 'Maybe later', 'instantsearch-for-wp' ) }
				</Button>
			</div>
		</Modal>
	);
};

export default UpgradeModal;
