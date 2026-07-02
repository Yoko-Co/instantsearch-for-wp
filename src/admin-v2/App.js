/**
 * InstantSearch for WP — Dashboard v2.
 *
 * Hash-routed (React Router HashRouter) admin SPA with a left-hand
 * navigation sidebar. v1 remains available; users toggle between the two
 * via a per-user preference.
 */
import { HashRouter, Routes, Route } from 'react-router-dom';
import { Spinner } from '@wordpress/components';

import { AdminProvider, useAdminContext } from '../admin/components/AdminContext';
import { Notices } from '../admin/components/Notices';
import { IndexesProvider } from './components/IndexesContext';
import Sidebar from './components/Sidebar';
import HomePage from './pages/HomePage';
import ProviderPage from './pages/ProviderPage';
import SearchSettingsPage from './pages/SearchSettingsPage';
import IndexPage from './pages/IndexPage';
import NotFoundPage from './pages/NotFoundPage';

const Layout = () => {
	const { initialLoading } = useAdminContext();

	return (
		<div id="instantsearch-admin" className="instantsearch-admin-v2">
			<Notices />
			<div className="instantsearch-admin-v2__layout">
				<Sidebar />
				<main className="instantsearch-admin-v2__content">
					{ initialLoading ? (
						<Spinner />
					) : (
						<Routes>
							<Route path="/" element={ <HomePage /> } />
							<Route path="/provider" element={ <ProviderPage /> } />
							<Route path="/search" element={ <SearchSettingsPage /> } />
							<Route path="/indexes/:indexId" element={ <IndexPage /> } />
							<Route path="*" element={ <NotFoundPage /> } />
						</Routes>
					) }
				</main>
			</div>
		</div>
	);
};

const App = () => (
	<AdminProvider>
		<IndexesProvider>
			<HashRouter>
				<Layout />
			</HashRouter>
		</IndexesProvider>
	</AdminProvider>
);

export default App;
