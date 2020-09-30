import { DataDeletedEventDetails, DataUpdatedEventDetails } from "@clowdr-app/clowdr-db-schema/build/DataLayer/Cache/Cache";
import { ContentFeed, ProgramSession } from "@clowdr-app/clowdr-db-schema";
import React, { useCallback, useState } from "react";
import { LoadingSpinner } from "../../../LoadingSpinner/LoadingSpinner";
import SessionGroup from "../All/SessionGroup";
import useConference from "../../../../hooks/useConference";
import useDataSubscription from "../../../../hooks/useDataSubscription";
import useHeading from "../../../../hooks/useHeading";
import useSafeAsync from "../../../../hooks/useSafeAsync";
import "../All/WholeProgram.scss";
import "./ViewSession.scss";
import { ActionButton } from "../../../../contexts/HeadingContext";
import SplitterLayout from "react-splitter-layout";
import ViewContentFeed from "../../../ContentFeed/ViewContentFeed";

interface Props {
    sessionId: string;
}

export default function ViewSession(props: Props) {
    const conference = useConference();
    const [session, setSession] = useState<ProgramSession | null>(null);
    const [feed, setFeed] = useState<ContentFeed | null>(null);
    const [chatSize, setChatSize] = useState(30);

    // Initial data fetch
    useSafeAsync(
        async () => await ProgramSession.get(props.sessionId, conference.id),
        setSession,
        [props.sessionId, conference.id]);

    useSafeAsync(
        async () => (await session?.feed) ?? null,
        setFeed,
        [session]);

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

    const onContentFeedUpdated = useCallback(function _onContentFeedUpdated(ev: DataUpdatedEventDetails<"ContentFeed">) {
        if (feed && ev.object.id === feed.id) {
            setFeed(ev.object as ContentFeed);
        }
    }, [feed]);

    const onContentFeedDeleted = useCallback(function _onContentFeedDeleted(ev: DataDeletedEventDetails<"ContentFeed">) {
        if (feed && ev.objectId === feed.id) {
            setFeed(null);
        }
    }, [feed]);

    useDataSubscription("ProgramSession", onSessionUpdated, onSessionDeleted, !session, conference);
    useDataSubscription("ContentFeed", onContentFeedUpdated, onContentFeedDeleted, !feed, conference);

    const buttons: Array<ActionButton> = [];
    if (session) {
        buttons.push({
            label: "Track",
            action: `/track/${session.trackId}`,
            icon: <i className="fas fa-eye"></i>
        });
    }

    useHeading({
        title: session?.title ?? "Session",
        buttons: buttons.length > 0 ? buttons : undefined
    });

    // TODO: Render the content feed(s) above the session events list
    // We will allow 1 video and/or 1 chat feed per content feed

    const sessionEl = <div className="whole-program single-track single-session">
        {session
            ? <SessionGroup
                key={session.id}
                session={session}
                overrideTitle="Events in this session"
            />
            : <LoadingSpinner />}
    </div>;

    return <div className="view-track">
        <SplitterLayout
            vertical={true}
            percentage={true}
            ref={component => { component?.setState({ secondaryPaneSize: chatSize }) }}
            onSecondaryPaneSizeChange={newSize => setChatSize(newSize)}
        >
            <div className="split top-split">
                <button onClick={() => setChatSize(100)}>
                    &#9650;
                    </button>
                <div className="embedded-content">
                    {!feed
                        ? <LoadingSpinner />
                        : <ViewContentFeed feed={feed} />}
                </div>
            </div>
            <div className="split bottom-split">
                {sessionEl}
                <button onClick={() => setChatSize(0)}>
                    &#9660;
                </button>
            </div>
        </SplitterLayout>
    </div>;
}
