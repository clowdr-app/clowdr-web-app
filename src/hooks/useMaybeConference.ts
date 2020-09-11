import { useContext } from 'react';
import ConferenceContext from '../contexts/ConferenceContext';
import { Conference } from '../classes/DataLayer';

/**
 * Use this hook to access the current conference.
 */
export default function useMaybeConference(): Conference | null {
    return useContext(ConferenceContext);
}
