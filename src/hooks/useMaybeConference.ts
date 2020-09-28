import { useContext } from 'react';
import ConferenceContext from '../contexts/ConferenceContext';
import { Conference } from '@clowdr-app/clowdr-db-schema/build/DataLayer';

/**
 * Use this hook to access the current conference.
 */
export default function useMaybeConference(): Conference | null {
    return useContext(ConferenceContext);
}
