import { Button, __experimentalNumberControl as NumberControl, SelectControl, TextControl, ToggleControl } from "@wordpress/components";
import { useEffect, useState } from "@wordpress/element";
import { __ } from "@wordpress/i18n";
import { useAdminContext } from "./AdminContext";

const indexName = (indexCptName) => `${window.instantsearchAdmin.indexPrefix}${indexCptName}`;

const SearchConfiguration = ({ index, indexCpt }) => {
	const {
		loading,
		saveSettings,
		setLoading,
		settings,
		provider,
		algoliaConfig,
		setAlgoliaConfig
	} = useAdminContext();
	
	const [useSearchSettings, setUseSearchSettings] = useState({
		algolia: settings?.algolia || {},
		use_as_sitesearch: settings?.use_as_sitesearch || false,
		sitesearch_settings: settings?.sitesearch_settings || {}
	});

	useEffect(() => {
		setUseSearchSettings({
			algolia: settings?.algolia || {},
			use_as_sitesearch: settings?.use_as_sitesearch || false,
			sitesearch_settings: settings?.sitesearch_settings || {}
		});
	}, [settings?.use_as_sitesearch, settings?.sitesearch_settings, settings?.algolia]);
	
	const saveSearchSettings = async () => {
		setLoading(true);
		await saveSettings(useSearchSettings);
		setLoading(false);
	}
	return (
		<>
			<h3>{__('Search Configuration', 'instantsearch-for-wp')}</h3>
			{ provider === 'algolia' && (
				<>
					<h4>{__('AI Summaries', 'instantsearch-for-wp')}</h4>
					<ToggleControl
						label={__('Enable AI summaries', 'instantsearch-for-wp')}
						help={__('Use Algolia Ask AI to show a summary above the hits list.', 'instantsearch-for-wp')}
						checked={!!algoliaConfig?.ai_summaries_enabled}
						onChange={(value) => setAlgoliaConfig({ ...algoliaConfig, ai_summaries_enabled: value })}
					/>
					{ !!algoliaConfig?.ai_summaries_enabled && (
						<>
							<TextControl
								label={__('Ask AI Agent ID', 'instantsearch-for-wp')}
								help={__('Required when AI summaries are enabled.', 'instantsearch-for-wp')}
								value={algoliaConfig?.ask_ai_agent_id || ''}
								onChange={(value) => setAlgoliaConfig({ ...algoliaConfig, ask_ai_agent_id: value })}
							/>
							<Button
								variant="secondary"
								href={`https://dashboard.algolia.com/apps/${settings?.algolia?.app_id}/ask-ai`}
								target="_blank"
								rel="noopener noreferrer"
							>
								{__('Edit Agent Instructions', 'instantsearch-for-wp')}
							</Button>
						</>
					)}
					<hr />
				</>
			)}
			<ToggleControl
				label={__('Enable Instant Search for WP site search.', 'instantsearch-for-wp')}
				checked={useSearchSettings?.use_as_sitesearch}
				onChange={(value) => setUseSearchSettings((prev) => ({ ...prev, use_as_sitesearch: value ? true : false }))}
			/>
			{
				useSearchSettings?.use_as_sitesearch && (
					<>
						<p>{__('Instant Search is enabled. Your site search will now use Instant Search for WP.', 'instantsearch-for-wp')}</p>
						<h3>{__('Sidebar Settings', 'instantsearch-for-wp')}</h3>

						<h4>{__('Facet Display', 'instantsearch-for-wp')}</h4>
						<p>{__('Configure Site Search facets directly in the Algolia indext Facet Display screen.', 'instantsearch-for-wp')}</p>
						<Button variant="primary" href={`https://dashboard.algolia.com/apps/${settings.algolia.app_id}/explorer/configuration/${indexName(indexCpt?.slug)}/facet-display`} target="_blank" rel="noopener noreferrer">
							{__('Go to index Facet Display settings.', 'instantsearch-for-wp')}
						</Button>

						<h4>{__('Ranking', 'instantsearch-for-wp')}</h4>
						<p>{__('Configure Site Search ranking directly in the Algolia index Ranking screen.', 'instantsearch-for-wp')}</p>
						<Button variant="primary" href={`https://dashboard.algolia.com/apps/${settings.algolia.app_id}/explorer/configuration/${indexName(indexCpt?.slug)}/ranking-and-sorting`} target="_blank" rel="noopener noreferrer">
							{__('Go to index Ranking settings.', 'instantsearch-for-wp')}
						</Button>

						<h4>{__('Other Settings', 'instantsearch-for-wp')}</h4>
						<TextControl
							label={__('Search Input Placeholder Text', 'instantsearch-for-wp')}
							value={useSearchSettings?.sitesearch_settings?.placeholder_text || __('Search...', 'instantsearch-for-wp')}
							onChange={(value) => setUseSearchSettings((prev) => ({
								...prev,
								sitesearch_settings: {
									...prev.sitesearch_settings,
									placeholder_text: value,
								}
							}))}
						/>
						<NumberControl
							label={__('Snippet Length (in words)', 'instantsearch-for-wp')}
							value={useSearchSettings?.sitesearch_settings?.snippet_length || 50}
							onChange={(value) => setUseSearchSettings((prev) => ({
								...prev,
								sitesearch_settings: {
									...prev.sitesearch_settings,
									snippet_length: parseInt(value, 10),
								}
							}))}
						/>
						<SelectControl
							label={__('Sidebar Position', 'instantsearch-for-wp')}
							value={useSearchSettings?.sitesearch_settings?.sidebar_position || 'left'}
							options={[
								{ label: __('Left', 'instantsearch-for-wp'), value: 'left' },
								{ label: __('Right', 'instantsearch-for-wp'), value: 'right' },
							]}
							onChange={(value) => setUseSearchSettings((prev) => ({
								...prev,
								sitesearch_settings: {
									...prev.sitesearch_settings,
									sidebar_position: value,
								}
							}))}
						/>
						<ToggleControl
							help={__('Free Algolia accounts are required to show the Powered by Algolia badge. You can hide it if you have a paid account.', 'instantsearch-for-wp')}
							label={__('Hide Powered by Algolia Badge', 'instantsearch-for-wp')}
							checked={useSearchSettings?.algolia?.hide_algolia_badge || false}
							onChange={(value) => setUseSearchSettings((prev) => ({
								...prev,
								algolia: {
									...prev.algolia,
									hide_algolia_badge: !!value,
								}
							}))}
						/>
						<TextControl
							label={__('Search Trigger CSS Selectors', 'instantsearch-for-wp')}
							help={__('Comma-separated CSS selectors for elements that open the search dialog when clicked. The .isfwp-search-trigger class is automatically added to the built-in floating button.', 'instantsearch-for-wp')}
							value={useSearchSettings?.sitesearch_settings?.trigger_selectors ?? '.isfwp-search-trigger,.menu-item .fl-search-form .fl-button-wrap > a,.swp-input--search'}
							onChange={(value) => setUseSearchSettings((prev) => ({
								...prev,
								sitesearch_settings: {
									...prev.sitesearch_settings,
									trigger_selectors: value,
								}
							}))}
						/>
						<NumberControl
							label={__('Debounce Delay (in milliseconds)', 'instantsearch-for-wp')}
							value={useSearchSettings?.sitesearch_settings?.debounce_delay || 0}
							onChange={(value) => setUseSearchSettings((prev) => ({
								...prev,
								sitesearch_settings: {
									...prev.sitesearch_settings,
									debounce_delay: parseInt(value, 10),
								}
							}))}
							help={__('Set a debounce delay for search input to improve performance. Enter the delay in milliseconds. Set to 0 to disable and only trigger search on enter key press.', 'instantsearch-for-wp')}
						/>

					{/* TODO: Add hits template field. */}

						{/* TODO: Finish Facet Overrides */}
						{/* <FacetOverrides index={index} /> */}
					</>
				)
			}
			<br /><br />
			<Button disabled={ loading } variant="primary" onClick={ () => saveSearchSettings() } __next40pxDefaultSize>
				{ loading ? __('Saving...', 'instantsearch-for-wp') : __('Save Search Settings', 'instantsearch-for-wp') }
			</Button>
		</>
	);
}

export default SearchConfiguration;