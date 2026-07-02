import apiFetch from '@wordpress/api-fetch';
import { useState, useEffect } from '@wordpress/element';
import { __ } from '@wordpress/i18n';
import {
    Card, 
    CardBody, 
    CardHeader,
	Spinner
} from '@wordpress/components';
import ProviderConfig from './ProviderConfig';
import { Notices } from './Notices';
import AdminNavigation from './AdminNavigation';
import { useAdminContext } from './AdminContext';
import SearchConfiguration from './SearchConfiguration';
import AdminIndexes from './AdminIndexes';
import TryV2Notice from './TryV2Notice';

const AdminApp = () => {
    const [activeScreen, setActiveScreen] = useState('index');

	const {
		algoliaConfig,
		initialLoading,
		provider
	} = useAdminContext();

    // Hash-based routing
    useEffect(() => {
        const handleHashChange = () => {
            const hash = window.location.hash.substr(1);
            // Only allow navigation to certain screens if provider is selected
            const allowedScreens = ['provider', 'index', 'search', 'analytics'];
                
            if (hash && allowedScreens.includes(hash)) {
                setActiveScreen(hash);
            } else if (!provider) {
                setActiveScreen('provider');
				window.location.hash = 'provider';
            } else {
				setActiveScreen('index');
			}
        };

        window.addEventListener('hashchange', handleHashChange);
        handleHashChange(); // Check hash on initial load

        return () => {
            window.removeEventListener('hashchange', handleHashChange);
        };
    }, [provider]);

    const handleScreenChange = (screen) => {
        // Prevent navigation if provider not selected (except to provider screen)
        if (!provider && screen !== 'provider') {
            return;
        }
        setActiveScreen(screen);
        window.location.hash = screen;
    };

    const renderScreen = () => {
        switch (activeScreen) {
            case 'provider':
				return (<ProviderConfig />);
            case 'index':
				return <AdminIndexes />;
            case 'search':
				return <SearchConfiguration />;
            case 'analytics':
            default:
                return (
                    <>
                        <CardHeader>
                            <h2>{__('Instant Search for WordPress', 'instantsearch-for-wp')}</h2>
                        </CardHeader>
                        <CardBody>
							<p>{__('This section is under construction. Please check back later.', 'instantsearch-for-wp')}</p>
                        </CardBody>
                    </>
                );
        }
    };

    return (
        <div id="instantsearch-admin">

			<TryV2Notice />

			<Notices />

			<Card className="instantsearch-admin__page">
				<CardBody className="instantsearch-admin__navigation">
					<AdminNavigation currentScreen={activeScreen} handleScreenChange={handleScreenChange} />
				</CardBody>
				<CardBody className="instantsearch-admin__content">
					{initialLoading ? <Spinner /> : renderScreen()}
				</CardBody>
			</Card>
        </div>
    );
};

export default AdminApp;
