/**
 * Frontend initializer for the AI Agent Chatbot (Popup) block.
 */
import { mountAgentChat } from '../../agent-chat/mount';
import AgentChatPopup from '../../agent-chat/AgentChatPopup';

mountAgentChat( {
	selector: '[data-isfwp-agent-chat="popup"]',
	Component: AgentChatPopup,
} );
