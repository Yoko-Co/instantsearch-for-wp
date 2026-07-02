/**
 * Left-hand navigation for Dashboard v2.
 */
import { useState } from '@wordpress/element';
import { __ } from '@wordpress/i18n';
import { Button, Icon } from '@wordpress/components';
import {
	home,
	search,
	settings,
	category,
	plus,
	lock,
	chartBar,
} from '@wordpress/icons';
import { NavLink } from 'react-router-dom';

import { useIndexes } from './IndexesContext';
import CreateIndexModal from './CreateIndexModal';
import UpgradeModal from './UpgradeModal';
import { setDashboardV2Preference } from '../utils/preferences';

const NavItem = ( { to, icon, label, end = false } ) => (
	<NavLink
		to={ to }
		end={ end }
		className={ ( { isActive } ) =>
			'instantsearch-admin-v2__nav-item' +
			( isActive ? ' is-active' : '' )
		}
	>
		<Icon icon={ icon } size={ 20 } />
		<span>{ label }</span>
	</NavLink>
);

const Sidebar = () => {
	const { indexes, canCreateIndex, licensing } = useIndexes();
	const [ showCreateModal, setShowCreateModal ] = useState( false );
	const [ showUpgradeModal, setShowUpgradeModal ] = useState( false );
	const [ switchingBack, setSwitchingBack ] = useState( false );

	const handleCreateClick = () => {
		if ( canCreateIndex ) {
			setShowCreateModal( true );
		} else {
			setShowUpgradeModal( true );
		}
	};

	const handleSwitchBack = async () => {
		setSwitchingBack( true );
		await setDashboardV2Preference( false );
		window.location.hash = '';
		window.location.reload();
	};

	return (
		<nav className="instantsearch-admin-v2__sidebar">
			<div className="instantsearch-admin-v2__nav-group">
				<NavItem to="/" end icon={ chartBar } label={ __( 'Home', 'instantsearch-for-wp' ) } />
				<NavItem to="/search" icon={ search } label={ __( 'Search Configuration', 'instantsearch-for-wp' ) } />
				<NavItem to="/provider" icon={ settings } label={ __( 'Provider Setup', 'instantsearch-for-wp' ) } />
			</div>

			<div className="instantsearch-admin-v2__nav-group">
				<div className="instantsearch-admin-v2__nav-heading">
					{ __( 'Indexes', 'instantsearch-for-wp' ) }
				</div>
				{ indexes.map( ( index ) => (
					<NavItem
						key={ index.id }
						to={ `/indexes/${ index.id }` }
						icon={ category }
						label={ index.title?.rendered || index.slug }
					/>
				) ) }
				<Button
					className="instantsearch-admin-v2__create-index"
					icon={ canCreateIndex ? plus : lock }
					onClick={ handleCreateClick }
					variant="tertiary"
					__next40pxDefaultSize
				>
					{ __( 'Create Index', 'instantsearch-for-wp' ) }
				</Button>
			</div>

			<div className="instantsearch-admin-v2__sidebar-footer">
				{ ! licensing.canUseMultipleIndexes && (
					<Button
						variant="link"
						href={ licensing.upgradeUrl || '#' }
					>
						{ __( 'Upgrade to Professional', 'instantsearch-for-wp' ) }
					</Button>
				) }
				<Button
					variant="link"
					disabled={ switchingBack }
					onClick={ handleSwitchBack }
				>
					{ __( 'Switch back to the v1 dashboard', 'instantsearch-for-wp' ) }
				</Button>
			</div>

			{ showCreateModal && (
				<CreateIndexModal onClose={ () => setShowCreateModal( false ) } />
			) }
			{ showUpgradeModal && (
				<UpgradeModal onClose={ () => setShowUpgradeModal( false ) } />
			) }
		</nav>
	);
};

export default Sidebar;
