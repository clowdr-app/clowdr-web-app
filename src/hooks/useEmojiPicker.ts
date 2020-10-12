import { useContext } from 'react';
import Context, { EmojiContext } from '../contexts/EmojiContext';

export default function useEmojiPicker(): EmojiContext | null {
    const ctx = useContext(Context);
    return ctx;
}
