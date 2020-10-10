import { useContext } from 'react';
import ConferenceContext from '../contexts/ConferenceContext';
import { Conference } from '@clowdr-app/clowdr-db-schema/build/DataLayer';
import assert from 'assert';

/**
 * Use this hook to access the current conference.
 */
export default function useConference(): Conference {
    const ctx = useContext(ConferenceContext);
    assert(ctx, "Conference should be defined.");
    return ctx;
}
