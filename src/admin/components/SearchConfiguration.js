import {
	Button,
	__experimentalNumberControl as NumberControl,
	SelectControl,
	TextControl,
	ToggleControl,
} from '@wordpress/components';
import { useEffect, useState } from '@wordpress/element';
import { __ } from '@wordpress/i18n';
import { useAdminContext } from './AdminContext';

const indexName = ( indexCptName ) =>
	`${ window.instantsearchAdmin.indexPrefix }${ indexCptName }`;

const SearchConfiguration = ( { index, indexCpt } ) => {
	const {
		loading,
		saveSettings,
		setLoading,
		settings,
		provider,
		algoliaConfig,
		setAlgoliaConfig,
	} = useAdminContext();

	// NOTE: algolia settings intentionally live in the shared `algoliaConfig`
	// context state, not in this local state. Keeping a second copy here means
	// the stale copy wins on save (spread order in saveSettings) and silently
	// reverts AI summaries / agent ID changes.
	const [ useSearchSettings, setUseSearchSettings ] = useState( {
		use_as_sitesearch: settings?.use_as_sitesearch || false,
		conversational_search: settings?.conversational_search ?? true,
		search_experience: settings?.search_experience || 'instant_search',
		sitesearch_options: settings?.sitesearch_options || {},
		sitesearch_settings: settings?.sitesearch_settings || {},
	} );

	useEffect( () => {
		setUseSearchSettings( {
			use_as_sitesearch: settings?.use_as_sitesearch || false,
			conversational_search: settings?.conversational_search ?? true,
			search_experience: settings?.search_experience || 'instant_search',
			sitesearch_options: settings?.sitesearch_options || {},
			sitesearch_settings: settings?.sitesearch_settings || {},
		} );
	}, [
		settings?.use_as_sitesearch,
		settings?.conversational_search,
		settings?.sitesearch_settings,
		settings?.search_experience,
		settings?.sitesearch_options,
	] );

	const searchExperience =
		useSearchSettings?.search_experience || 'instant_search';
	const isSiteSearchExperience = searchExperience !== 'instant_search';
	const isAskAiExperience = [
		'sitesearch_askai',
		'sitesearch_sidepanel',
	].includes( searchExperience );
	const hasAskAiAgent = !! algoliaConfig?.ask_ai_agent_id;

	const setSiteSearchOption = ( key, value ) =>
		setUseSearchSettings( ( prev ) => ( {
			...prev,
			sitesearch_options: {
				...prev.sitesearch_options,
				[ key ]: value,
			},
		} ) );

	const setSiteSearchAttribute = ( key, value ) =>
		setUseSearchSettings( ( prev ) => ( {
			...prev,
			sitesearch_options: {
				...prev.sitesearch_options,
				attributes: {
					...( prev.sitesearch_options?.attributes || {} ),
					[ key ]: value,
				},
			},
		} ) );

	const saveSearchSettings = async () => {
		setLoading( true );
		await saveSettings( useSearchSettings );
		setLoading( false );
	};
	return (
		<>
			<h3>{ __( 'Search Configuration', 'instantsearch-for-wp' ) }</h3>
			<ToggleControl
				label={ __(
					'Enable Instant Search for WP site search.',
					'instantsearch-for-wp'
				) }
				checked={ useSearchSettings?.use_as_sitesearch }
				onChange={ ( value ) =>
					setUseSearchSettings( ( prev ) => ( {
						...prev,
						use_as_sitesearch: value ? true : false,
					} ) )
				}
			/>
			{ useSearchSettings?.use_as_sitesearch && (
				<>
					<p>
						{ __(
							'Instant Search is enabled. Your site search will now use Instant Search for WP.',
							'instantsearch-for-wp'
						) }
					</p>

					{ provider === 'algolia' && (
						<SelectControl
							label={ __(
								'Search Experience',
								'instantsearch-for-wp'
							) }
							help={ __(
								'The built-in experience includes the facet sidebar and AI summaries. Algolia SiteSearch experiences are prebuilt, keyboard-friendly UIs (⌘K / Ctrl+K) from the SiteSearch library.',
								'instantsearch-for-wp'
							) }
							value={ searchExperience }
							options={ [
								{
									label: __(
										'Built-in Instant Search (sidebar + facets)',
										'instantsearch-for-wp'
									),
									value: 'instant_search',
								},
								{
									label: __(
										'Algolia SiteSearch — Search modal (⌘K)',
										'instantsearch-for-wp'
									),
									value: 'sitesearch_modal',
								},
								{
									label: hasAskAiAgent
										? __(
												'Algolia SiteSearch — Search with Ask AI',
												'instantsearch-for-wp'
										  )
										: __(
												'Algolia SiteSearch — Search with Ask AI (requires Ask AI Agent ID)',
												'instantsearch-for-wp'
										  ),
									value: 'sitesearch_askai',
									disabled: ! hasAskAiAgent,
								},
								{
									label: hasAskAiAgent
										? __(
												'Algolia SiteSearch — Sidepanel Ask AI',
												'instantsearch-for-wp'
										  )
										: __(
												'Algolia SiteSearch — Sidepanel Ask AI (requires Ask AI Agent ID)',
												'instantsearch-for-wp'
										  ),
									value: 'sitesearch_sidepanel',
									disabled: ! hasAskAiAgent,
								},
							] }
							onChange={ ( value ) =>
								setUseSearchSettings( ( prev ) => ( {
									...prev,
									search_experience: value,
								} ) )
							}
							__next40pxDefaultSize
						/>
					) }

					{ isSiteSearchExperience && (
						<>
							<h3>
								{ __(
									'Algolia SiteSearch Options',
									'instantsearch-for-wp'
								) }
							</h3>
							<p>
								{ __(
									'SiteSearch renders its own accessible search button and modal. Place the button anywhere with the "InstantSearch Search Button" block, or let the floating fallback handle it. The facet sidebar, AI summaries, and Powered-by badge settings below do not apply to SiteSearch experiences.',
									'instantsearch-for-wp'
								) }
							</p>
							{ searchExperience === 'sitesearch_modal' && (
								<TextControl
									label={ __(
										'Button Text',
										'instantsearch-for-wp'
									) }
									value={
										useSearchSettings?.sitesearch_options
											?.button_text ??
										__( 'Search', 'instantsearch-for-wp' )
									}
									onChange={ ( value ) =>
										setSiteSearchOption(
											'button_text',
											value
										)
									}
								/>
							) }
							<TextControl
								label={ __(
									'Search Input Placeholder Text',
									'instantsearch-for-wp'
								) }
								value={
									useSearchSettings?.sitesearch_options
										?.placeholder_text ??
									__( 'Search…', 'instantsearch-for-wp' )
								}
								onChange={ ( value ) =>
									setSiteSearchOption(
										'placeholder_text',
										value
									)
								}
							/>
							<NumberControl
								label={ __(
									'Hits Per Page',
									'instantsearch-for-wp'
								) }
								min={ 1 }
								max={ 50 }
								value={
									useSearchSettings?.sitesearch_options
										?.hits_per_page ?? 10
								}
								onChange={ ( value ) =>
									setSiteSearchOption(
										'hits_per_page',
										parseInt( value, 10 ) || 10
									)
								}
							/>
							<SelectControl
								label={ __(
									'Color Scheme',
									'instantsearch-for-wp'
								) }
								value={
									useSearchSettings?.sitesearch_options
										?.dark_mode || 'light'
								}
								options={ [
									{
										label: __(
											'Light',
											'instantsearch-for-wp'
										),
										value: 'light',
									},
									{
										label: __(
											'Dark',
											'instantsearch-for-wp'
										),
										value: 'dark',
									},
									{
										label: __(
											'Match visitor preference (auto)',
											'instantsearch-for-wp'
										),
										value: 'auto',
									},
								] }
								onChange={ ( value ) =>
									setSiteSearchOption( 'dark_mode', value )
								}
							/>
							<ToggleControl
								label={ __(
									'Send Algolia Insights events',
									'instantsearch-for-wp'
								) }
								help={ __(
									'Click and conversion analytics for the SiteSearch UI.',
									'instantsearch-for-wp'
								) }
								checked={
									useSearchSettings?.sitesearch_options
										?.insights ?? true
								}
								onChange={ ( value ) =>
									setSiteSearchOption( 'insights', !! value )
								}
							/>
							<TextControl
								label={ __(
									'Search Trigger CSS Selectors',
									'instantsearch-for-wp'
								) }
								help={ __(
									'Comma-separated CSS selectors for existing theme elements (nav links, page-builder buttons) that should open the SiteSearch modal when clicked.',
									'instantsearch-for-wp'
								) }
								value={
									useSearchSettings?.sitesearch_settings
										?.trigger_selectors ??
									'.isfwp-search-trigger'
								}
								onChange={ ( value ) =>
									setUseSearchSettings( ( prev ) => ( {
										...prev,
										sitesearch_settings: {
											...prev.sitesearch_settings,
											trigger_selectors: value,
										},
									} ) )
								}
							/>
							{ isAskAiExperience && (
								<>
									<TextControl
										label={ __(
											'Ask AI Agent ID',
											'instantsearch-for-wp'
										) }
										help={ __(
											'Required when AI summaries are enabled.',
											'instantsearch-for-wp'
										) }
										value={
											algoliaConfig?.ask_ai_agent_id || ''
										}
										onChange={ ( value ) =>
											setAlgoliaConfig( {
												...algoliaConfig,
												ask_ai_agent_id: value,
											} )
										}
									/>
									<ToggleControl
										label={ __(
											'Use Agent Studio endpoints',
											'instantsearch-for-wp'
										) }
										help={ __(
											'Enable if your assistant runs on Algolia Agent Studio instead of Ask AI.',
											'instantsearch-for-wp'
										) }
										checked={
											useSearchSettings
												?.sitesearch_options
												?.agent_studio ?? false
										}
										onChange={ ( value ) =>
											setSiteSearchOption(
												'agent_studio',
												!! value
											)
										}
									/>
									<p>
										{ __(
											'Note: SiteSearch Ask AI calls askai.algolia.com directly from the browser. Your site origin must be allowlisted in the Ask AI configuration in the Algolia dashboard.',
											'instantsearch-for-wp'
										) }
									</p>
									{ useSearchSettings?.sitesearch_options
										?.agent_studio && (
										<p>
											{ __(
												'IMPORTANT: AI Studio agent suggestions must be turned off for this experience to work.',
												'instantsearch-for-wp'
											) }
										</p>
									) }
								</>
							) }
							<h4>
								{ __(
									'Attribute Mapping (advanced)',
									'instantsearch-for-wp'
								) }
							</h4>
							<p>
								{ __(
									'Which indexed record fields SiteSearch displays for each hit. Defaults match the fields this plugin indexes.',
									'instantsearch-for-wp'
								) }
							</p>
							<TextControl
								label={ __(
									'Primary Text',
									'instantsearch-for-wp'
								) }
								value={
									useSearchSettings?.sitesearch_options
										?.attributes?.primary_text ?? 'title'
								}
								onChange={ ( value ) =>
									setSiteSearchAttribute(
										'primary_text',
										value
									)
								}
							/>
							<TextControl
								label={ __(
									'Secondary Text',
									'instantsearch-for-wp'
								) }
								value={
									useSearchSettings?.sitesearch_options
										?.attributes?.secondary_text ??
									'excerpt'
								}
								onChange={ ( value ) =>
									setSiteSearchAttribute(
										'secondary_text',
										value
									)
								}
							/>
							<TextControl
								label={ __(
									'Tertiary Text',
									'instantsearch-for-wp'
								) }
								value={
									useSearchSettings?.sitesearch_options
										?.attributes?.tertiary_text ??
									'post_type'
								}
								onChange={ ( value ) =>
									setSiteSearchAttribute(
										'tertiary_text',
										value
									)
								}
							/>
							<TextControl
								label={ __(
									'URL Field',
									'instantsearch-for-wp'
								) }
								value={
									useSearchSettings?.sitesearch_options
										?.attributes?.url ?? 'url'
								}
								onChange={ ( value ) =>
									setSiteSearchAttribute( 'url', value )
								}
							/>
							<TextControl
								label={ __(
									'Image Field',
									'instantsearch-for-wp'
								) }
								value={
									useSearchSettings?.sitesearch_options
										?.attributes?.image ?? 'image'
								}
								onChange={ ( value ) =>
									setSiteSearchAttribute( 'image', value )
								}
							/>
						</>
					) }

					{ ! isSiteSearchExperience && (
						<>
							<h3>
								{ __(
									'Sidebar Settings',
									'instantsearch-for-wp'
								) }
							</h3>

							<h4>
								{ __(
									'Facet Display',
									'instantsearch-for-wp'
								) }
							</h4>
							<p>
								{ __(
									'Configure Site Search facets directly in the Algolia indext Facet Display screen.',
									'instantsearch-for-wp'
								) }
							</p>
							<Button
								variant="primary"
								href={ `https://dashboard.algolia.com/apps/${
									settings.algolia.app_id
								}/explorer/configuration/${ indexName(
									indexCpt?.slug
								) }/facet-display` }
								target="_blank"
								rel="noopener noreferrer"
							>
								{ __(
									'Go to index Facet Display settings.',
									'instantsearch-for-wp'
								) }
							</Button>

							<h4>{ __( 'Ranking', 'instantsearch-for-wp' ) }</h4>
							<p>
								{ __(
									'Configure Site Search ranking directly in the Algolia index Ranking screen.',
									'instantsearch-for-wp'
								) }
							</p>
							<Button
								variant="primary"
								href={ `https://dashboard.algolia.com/apps/${
									settings.algolia.app_id
								}/explorer/configuration/${ indexName(
									indexCpt?.slug
								) }/ranking-and-sorting` }
								target="_blank"
								rel="noopener noreferrer"
							>
								{ __(
									'Go to index Ranking settings.',
									'instantsearch-for-wp'
								) }
							</Button>

							<h4>
								{ __(
									'Other Settings',
									'instantsearch-for-wp'
								) }
							</h4>
							<TextControl
								label={ __(
									'Search Input Placeholder Text',
									'instantsearch-for-wp'
								) }
								value={
									useSearchSettings?.sitesearch_settings
										?.placeholder_text ||
									__( 'Search...', 'instantsearch-for-wp' )
								}
								onChange={ ( value ) =>
									setUseSearchSettings( ( prev ) => ( {
										...prev,
										sitesearch_settings: {
											...prev.sitesearch_settings,
											placeholder_text: value,
										},
									} ) )
								}
							/>
							<NumberControl
								label={ __(
									'Snippet Length (in words)',
									'instantsearch-for-wp'
								) }
								value={
									useSearchSettings?.sitesearch_settings
										?.snippet_length || 50
								}
								onChange={ ( value ) =>
									setUseSearchSettings( ( prev ) => ( {
										...prev,
										sitesearch_settings: {
											...prev.sitesearch_settings,
											snippet_length: parseInt(
												value,
												10
											),
										},
									} ) )
								}
							/>
							<SelectControl
								label={ __(
									'Sidebar Position',
									'instantsearch-for-wp'
								) }
								value={
									useSearchSettings?.sitesearch_settings
										?.sidebar_position || 'left'
								}
								options={ [
									{
										label: __(
											'Left',
											'instantsearch-for-wp'
										),
										value: 'left',
									},
									{
										label: __(
											'Right',
											'instantsearch-for-wp'
										),
										value: 'right',
									},
								] }
								onChange={ ( value ) =>
									setUseSearchSettings( ( prev ) => ( {
										...prev,
										sitesearch_settings: {
											...prev.sitesearch_settings,
											sidebar_position: value,
										},
									} ) )
								}
							/>
							<ToggleControl
								label={ __(
									'Show Floating Search Button',
									'instantsearch-for-wp'
								) }
								help={ __(
									'When enabled, the default floating .isfwp-search-trigger button is rendered in InstantSearch mode. You can still open search using your configured trigger selectors.',
									'instantsearch-for-wp'
								) }
								checked={
									! (
										useSearchSettings?.sitesearch_settings
											?.hide_floating_search_button ??
										true
									)
								}
								onChange={ ( value ) =>
									setUseSearchSettings( ( prev ) => ( {
										...prev,
										sitesearch_settings: {
											...prev.sitesearch_settings,
											hide_floating_search_button:
												! value,
										},
									} ) )
								}
							/>
							<ToggleControl
								help={ __(
									'Free Algolia accounts are required to show the Powered by Algolia badge. You can hide it if you have a paid account.',
									'instantsearch-for-wp'
								) }
								label={ __(
									'Hide Powered by Algolia Badge',
									'instantsearch-for-wp'
								) }
								checked={
									algoliaConfig?.hide_algolia_badge || false
								}
								onChange={ ( value ) =>
									setAlgoliaConfig( {
										...algoliaConfig,
										hide_algolia_badge: !! value,
									} )
								}
							/>
							<TextControl
								label={ __(
									'Search Trigger CSS Selectors',
									'instantsearch-for-wp'
								) }
								help={ __(
									'Comma-separated CSS selectors for elements that open the search dialog when clicked. The .isfwp-search-trigger class is automatically added to the built-in floating button.',
									'instantsearch-for-wp'
								) }
								value={
									useSearchSettings?.sitesearch_settings
										?.trigger_selectors ??
									'.isfwp-search-trigger,.menu-item .fl-search-form .fl-button-wrap > a,.swp-input--search'
								}
								onChange={ ( value ) =>
									setUseSearchSettings( ( prev ) => ( {
										...prev,
										sitesearch_settings: {
											...prev.sitesearch_settings,
											trigger_selectors: value,
										},
									} ) )
								}
							/>
							<NumberControl
								label={ __(
									'Debounce Delay (in milliseconds)',
									'instantsearch-for-wp'
								) }
								value={
									useSearchSettings?.sitesearch_settings
										?.debounce_delay || 0
								}
								onChange={ ( value ) =>
									setUseSearchSettings( ( prev ) => ( {
										...prev,
										sitesearch_settings: {
											...prev.sitesearch_settings,
											debounce_delay: parseInt(
												value,
												10
											),
										},
									} ) )
								}
								help={ __(
									'Set a debounce delay for search input to improve performance. Enter the delay in milliseconds. Set to 0 to disable and only trigger search on enter key press.',
									'instantsearch-for-wp'
								) }
							/>

							{ /* TODO: Add hits template field. */ }

							{ /* TODO: Finish Facet Overrides */ }
							{ /* <FacetOverrides index={index} /> */ }

							{ provider === 'algolia' && (
								<>
									<h3>
										{ __(
											'AI Summaries',
											'instantsearch-for-wp'
										) }
									</h3>
									<ToggleControl
										label={ __(
											'Enable AI summaries',
											'instantsearch-for-wp'
										) }
										help={ __(
											'Use Algolia Ask AI to show a summary above the hits list.',
											'instantsearch-for-wp'
										) }
										checked={
											!! algoliaConfig?.ai_summaries_enabled
										}
										onChange={ ( value ) =>
											setAlgoliaConfig( {
												...algoliaConfig,
												ai_summaries_enabled: value,
											} )
										}
									/>
									{ !! algoliaConfig?.ai_summaries_enabled && (
										<>
											<SelectControl
												label={ __(
													'AI Answers Engine',
													'instantsearch-for-wp'
												) }
												help={ __(
													'Ask AI generates a one-shot summary. AI Studio uses an Algolia Agent Studio agent for multi-step agentic summaries and answers.',
													'instantsearch-for-wp'
												) }
												value={
													algoliaConfig?.ai_summaries_engine ===
													'agent_studio'
														? 'agent_studio'
														: 'ask_ai'
												}
												options={ [
													{
														label: __(
															'Ask AI (one-shot summary)',
															'instantsearch-for-wp'
														),
														value: 'ask_ai',
													},
													{
														label: __(
															'AI Studio (multi-step agentic answers)',
															'instantsearch-for-wp'
														),
														value: 'agent_studio',
													},
												] }
												onChange={ ( value ) =>
													setAlgoliaConfig( {
														...algoliaConfig,
														ai_summaries_engine:
															value,
													} )
												}
												__next40pxDefaultSize
											/>
											{ algoliaConfig?.ai_summaries_engine ===
											'agent_studio' ? (
												<TextControl
													label={ __(
														'AI Studio Agent ID',
														'instantsearch-for-wp'
													) }
													help={ __(
														'ID of a published Agent Studio agent. Required when the AI Studio engine is selected; otherwise summaries fall back to Ask AI.',
														'instantsearch-for-wp'
													) }
													value={
														algoliaConfig?.ai_studio_agent_id ||
														''
													}
													onChange={ ( value ) =>
														setAlgoliaConfig( {
															...algoliaConfig,
															ai_studio_agent_id:
																value,
														} )
													}
												/>
											) : (
												<TextControl
													label={ __(
														'Ask AI Agent ID',
														'instantsearch-for-wp'
													) }
													help={ __(
														'Required when AI summaries are enabled.',
														'instantsearch-for-wp'
													) }
													value={
														algoliaConfig?.ask_ai_agent_id ||
														''
													}
													onChange={ ( value ) =>
														setAlgoliaConfig( {
															...algoliaConfig,
															ask_ai_agent_id:
																value,
														} )
													}
												/>
											) }
											<TextControl
												label={ __(
													'AI Disclaimer',
													'instantsearch-for-wp'
												) }
												help={ __(
													'Optional text shown below the AI summary, for example to remind readers that AI can make mistakes and results should be verified.',
													'instantsearch-for-wp'
												) }
												value={
													algoliaConfig?.ai_disclaimer ||
													''
												}
												onChange={ ( value ) =>
													setAlgoliaConfig( {
														...algoliaConfig,
														ai_disclaimer: value,
													} )
												}
											/>
											<Button
												variant="secondary"
												href={
													algoliaConfig?.ai_summaries_engine ===
													'agent_studio'
														? 'https://dashboard.algolia.com/generativeAi/agent-studio/agents'
														: `https://dashboard.algolia.com/apps/${ settings?.algolia?.app_id }/ask-ai`
												}
												target="_blank"
												rel="noopener noreferrer"
											>
												{ algoliaConfig?.ai_summaries_engine ===
												'agent_studio'
													? __(
															'Manage Agents in AI Studio',
															'instantsearch-for-wp'
													  )
													: __(
															'Edit Agent Instructions',
															'instantsearch-for-wp'
													  ) }
											</Button>
										</>
									) }
									<hr />
									<h3>
										{ __(
											'Conversational Chat',
											'instantsearch-for-wp'
										) }
									</h3>
									<ToggleControl
										label={ __(
											'Enable Conversational Chat Experience',
											'instantsearch-for-wp'
										) }
										help={ __(
											'Turns on the built-in InstantSearch.js chat experience.',
											'instantsearch-for-wp'
										) }
										checked={
											useSearchSettings?.conversational_search ??
											true
										}
										onChange={ ( value ) =>
											setUseSearchSettings(
												( prev ) => ( {
													...prev,
													conversational_search:
														!! value,
												} )
											)
										}
									/>
									{ ( useSearchSettings?.conversational_search ??
										true ) && (
										<>
											<h4>
												{ __(
													'AI Agent Configuration',
													'instantsearch-for-wp'
												) }
											</h4>
											<TextControl
												label={ __(
													'Conversational Search Agent ID',
													'instantsearch-for-wp'
												) }
												help={ __(
													'Dedicated Ask AI agent ID for the built-in conversational chat experience. This is separate from the AI summaries agent ID and the SiteSearch Ask AI experience agent ID.',
													'instantsearch-for-wp'
												) }
												value={
													algoliaConfig?.conversational_search_agent_id ||
													''
												}
												onChange={ ( value ) =>
													setAlgoliaConfig( {
														...algoliaConfig,
														conversational_search_agent_id:
															value,
													} )
												}
											/>
											<SelectControl
												label={ __(
													'Chat Trigger Position',
													'instantsearch-for-wp'
												) }
												help={ __(
													'Choose where the fixed chat trigger button appears on screen.',
													'instantsearch-for-wp'
												) }
												value={
													useSearchSettings
														?.sitesearch_settings
														?.chat_trigger_position ||
													'right'
												}
												options={ [
													{
														label: __(
															'Bottom Right',
															'instantsearch-for-wp'
														),
														value: 'right',
													},
													{
														label: __(
															'Bottom Left',
															'instantsearch-for-wp'
														),
														value: 'left',
													},
												] }
												onChange={ ( value ) =>
													setUseSearchSettings(
														( prev ) => ( {
															...prev,
															sitesearch_settings:
																{
																	...prev.sitesearch_settings,
																	chat_trigger_position:
																		value,
																},
														} )
													)
												}
											/>
											{ !! algoliaConfig?.conversational_search_agent_id && (
												<Button
													variant="secondary"
													href={ `https://dashboard.algolia.com/apps/${ settings?.algolia?.app_id }/ask-ai` }
													target="_blank"
													rel="noopener noreferrer"
												>
													{ __(
														'Edit Chat Agent Instructions',
														'instantsearch-for-wp'
													) }
												</Button>
											) }
										</>
									) }
								</>
							) }
						</>
					) }
				</>
			) }
			<br />
			<br />
			<Button
				disabled={ loading }
				variant="primary"
				onClick={ () => saveSearchSettings() }
				__next40pxDefaultSize
			>
				{ loading
					? __( 'Saving...', 'instantsearch-for-wp' )
					: __( 'Save Search Settings', 'instantsearch-for-wp' ) }
			</Button>
		</>
	);
};

export default SearchConfiguration;
