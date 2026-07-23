import { __ } from "@wordpress/i18n";
import { SelectControl, TextControl, ToggleControl } from "@wordpress/components";

import { useAdminContext } from "./AdminContext";

const AlgoliaConfig = () => {
	const {
		algoliaConfig,
		setAlgoliaConfig
	} = useAdminContext();

	return <div className="algolia-config instantsearch-provider-config">
		<p>{ __('Algolia specific configuration options will go here.', 'yoko-core') }</p>
		<TextControl
			__next40pxDefaultSize
			label={ __('Application ID', 'yoko-core') }
			help={ __('Enter your Algolia Application ID.', 'yoko-core') }
			onChange={ ( value ) => setAlgoliaConfig( { ...algoliaConfig, app_id: value } ) }
			value={algoliaConfig?.app_id || '' }
		/>
		<TextControl
			__next40pxDefaultSize
			label={ __('Search-Only API Key', 'yoko-core') }
			help={ __('Enter your Algolia Search-Only API Key.', 'yoko-core') }
			onChange={ ( value ) => setAlgoliaConfig( { ...algoliaConfig, search_only_api_key: value } ) }
			value={algoliaConfig?.search_only_api_key || '' }
		/>
		<TextControl
			__next40pxDefaultSize
			label={ __('Admin API Key', 'yoko-core') }
			help={ __('Enter your Algolia Admin API Key.', 'yoko-core') }
			onChange={ ( value ) => setAlgoliaConfig( { ...algoliaConfig, admin_api_key: value } ) }
			value={algoliaConfig?.admin_api_key || '' }
		/>
		<ToggleControl
			__nextHasNoMarginBottom
			label={ __('Enable AI summaries', 'instantsearch-for-wp') }
			help={ __('When enabled, Ask AI summaries can be shown above search results.', 'instantsearch-for-wp') }
			checked={ !! algoliaConfig?.ai_summaries_enabled }
			onChange={ ( value ) => setAlgoliaConfig( { ...algoliaConfig, ai_summaries_enabled: value } ) }
		/>
		{ !! algoliaConfig?.ai_summaries_enabled && (
			<>
				<SelectControl
					__next40pxDefaultSize
					label={ __('AI Answers Engine', 'instantsearch-for-wp') }
					help={ __('Ask AI generates a one-shot summary. AI Studio uses an Algolia Agent Studio agent for multi-step agentic summaries and answers.', 'instantsearch-for-wp') }
					value={ algoliaConfig?.ai_summaries_engine === 'agent_studio' ? 'agent_studio' : 'ask_ai' }
					options={ [
						{ label: __('Ask AI (one-shot summary)', 'instantsearch-for-wp'), value: 'ask_ai' },
						{ label: __('AI Studio (multi-step agentic answers)', 'instantsearch-for-wp'), value: 'agent_studio' },
					] }
					onChange={ ( value ) => setAlgoliaConfig( { ...algoliaConfig, ai_summaries_engine: value } ) }
				/>
				{ algoliaConfig?.ai_summaries_engine === 'agent_studio' ? (
					<TextControl
						__next40pxDefaultSize
						label={ __('AI Studio Agent ID', 'instantsearch-for-wp') }
						help={ __('ID of a published Agent Studio agent. Required when the AI Studio engine is selected; otherwise summaries fall back to Ask AI.', 'instantsearch-for-wp') }
						onChange={ ( value ) => setAlgoliaConfig( { ...algoliaConfig, ai_studio_agent_id: value } ) }
						value={algoliaConfig?.ai_studio_agent_id || '' }
					/>
				) : (
					<TextControl
						__next40pxDefaultSize
						label={ __('Ask AI Agent ID', 'instantsearch-for-wp') }
						help={ __('Required when AI summaries are enabled.', 'instantsearch-for-wp') }
						onChange={ ( value ) => setAlgoliaConfig( { ...algoliaConfig, ask_ai_agent_id: value } ) }
						value={algoliaConfig?.ask_ai_agent_id || '' }
					/>
				) }
			</>
		) }
	</div>;
}
export default AlgoliaConfig;
