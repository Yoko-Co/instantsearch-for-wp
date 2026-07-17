/**
 * Frontend initializer for the inline AI Agent Chat block.
 */
import { mountAgentChat } from '../../agent-chat/mount';
import AgentChat from '../../agent-chat/AgentChat';

mountAgentChat( {
	selector: '[data-isfwp-agent-chat="inline"]',
	Component: AgentChat,
} );
