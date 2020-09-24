import { useContext } from 'react';
import ChatContext from '../contexts/ChatContext';

/**
 * Use this hook to access the chat instance.
 */
export default function useMaybeChat() {
    return useContext(ChatContext);
}
