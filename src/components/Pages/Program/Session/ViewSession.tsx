import { DataDeletedEventDetails, DataUpdatedEventDetails } from "@clowdr-app/clowdr-db-schema/build/DataLayer/Cache/Cache";
import { ProgramSession } from "@clowdr-app/clowdr-db-schema/build/DataLayer";
import React, { useCallback, useState } from "react";
import { LoadingSpinner } from "../../../LoadingSpinner/LoadingSpinner";
import SessionGroup from "../All/SessionGroup";
import useConference from "../../../../hooks/useConference";
import useDataSubscription from "../../../../hooks/useDataSubscription";
import useHeading from "../../../../hooks/useHeading";
import useSafeAsync from "../../../../hooks/useSafeAsync";
import "../All/WholeProgram.scss";

interface Props {
    sessionId: string;
}

export default function ViewSession(props: Props) {
    const conference = useConference();
    const [session, setSession] = useState<ProgramSession | null>(null);

    // Initial data fetch
    useSafeAsync(
        async () => await ProgramSession.get(props.sessionId, conference.id),
        setSession,
        [props.sessionId, conference.id]);

    // Subscribe to data updates
    const onSessionUpdated = useCallback(function _onSessionUpdated(ev: DataUpdatedEventDetails<"ProgramSession">) {
        if (session && ev.object.id === session.id) {
            setSession(ev.object as ProgramSession);
        }
    }, [session]);

    const onSessionDeleted = useCallback(function _onSessionDeleted(ev: DataDeletedEventDetails<"ProgramSession">) {
        if (session && ev.objectId === session.id) {
            setSession(null);
        }
    }, [session]);

    useDataSubscription("ProgramSession", onSessionUpdated, onSessionDeleted, !session, conference);

    useHeading(session?.title ?? "Session");

    // TODO: Render the content feed(s) above the session events list
    // We will allow 1 video and/or 1 chat feed per content feed

    return <div className="whole-program single-track single-session">
        {session
            ? <SessionGroup
                key={session.id}
                session={session}
                overrideTitle="Events in this session"
            />
            : <LoadingSpinner />}
    </div>;
}
