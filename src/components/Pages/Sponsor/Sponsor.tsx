import React, { useCallback, useState } from "react";
import { Sponsor, SponsorContent, VideoRoom } from "@clowdr-app/clowdr-db-schema";
import useHeading from "../../../hooks/useHeading";
import useSafeAsync from "../../../hooks/useSafeAsync";
import useConference from "../../../hooks/useConference";
import useDataSubscription from "../../../hooks/useDataSubscription";
import {
    DataDeletedEventDetails,
    DataUpdatedEventDetails,
} from "@clowdr-app/clowdr-db-schema/build/DataLayer/Cache/Cache";
import "./Sponsor.scss";
import { LoadingSpinner } from "../../LoadingSpinner/LoadingSpinner";
import VideoGrid from "../../Video/VideoGrid/VideoGrid";
import ReactPlayer from "react-player";
import { Link } from "react-router-dom";
import ReactMarkdown from "react-markdown";

interface Props {
    sponsorId: string;
}

export default function _Sponsor(props: Props) {
    const conference = useConference();
    const [sponsor, setSponsor] = useState<Sponsor | null>(null);
    const [content, setContent] = useState<SponsorContent[] | null>(null);
    const [videoRoom, setVideoRoom] = useState<VideoRoom | null>(null);
    useHeading(sponsor?.name ?? "Sponsor");

    useSafeAsync(
        async () => await Sponsor.get(props.sponsorId, conference.id),
        setSponsor,
        [conference.id, props.sponsorId],
        "Sponsor:Sponsor.get"
    );

    useSafeAsync(
        async () => (sponsor?.videoRoomId ? await VideoRoom.get(sponsor.videoRoomId, conference.id) : null),
        setVideoRoom,
        [sponsor?.videoRoomId, conference.id],
        "Sponsor:VideoRoom.get"
    );

    useSafeAsync(
        async () => await SponsorContent.getAll(conference.id),
        setContent,
        [conference.id],
        "Sponsor:SponsorContent.getAll"
    );

    // Subscribe to content updates
    const onContentUpdated = useCallback(function _onContentUpdated(ev: DataUpdatedEventDetails<"SponsorContent">) {
        setContent(oldContent => {
            if (oldContent) {
                const newContent = Array.from(oldContent);
                for (const object of ev.objects) {
                    const idx = newContent?.findIndex(x => x.id === object.id);
                    if (idx === -1) {
                        newContent.push(object as SponsorContent);
                    } else {
                        newContent.splice(idx, 1, object as SponsorContent);
                    }
                }
                return newContent;
            }
            return null;
        });
    }, []);

    const onContentDeleted = useCallback(function _onContentDeleted(ev: DataDeletedEventDetails<"SponsorContent">) {
        setContent(oldContent => oldContent?.filter(x => x.id !== ev.objectId) ?? null);
    }, []);

    useDataSubscription("SponsorContent", onContentUpdated, onContentDeleted, !content, conference);

    function renderItem(item: SponsorContent) {
        if (item.videoURL) {
            return (
                <ReactPlayer
                    className="video-player"
                    width=""
                    height=""
                    playsinline
                    controls={true}
                    muted={false}
                    volume={1}
                    url={item.videoURL}
                />
            );
        } else if (item.buttonContents) {
            return (
                <div className="content-item__button">
                    <Link to={item.buttonContents.link}>{item.buttonContents.text}</Link>
                </div>
            );
        } else if (item.markdownContents) {
            return <ReactMarkdown escapeHtml={true} source={item.markdownContents} />;
        } else {
            return <>Could not load content</>;
        }
    }

    const contentEl = (
        <div className="sponsor__content">
            {content?.map(item => (
                <div className={`content-item ${item.wide && "content-item--wide"}`}>{renderItem(item)}</div>
            ))}
        </div>
    );

    const videoRoomEl = (
        <div className="sponsor__video-room">
            {videoRoom ? <VideoGrid room={videoRoom} sponsorView={true} /> : <LoadingSpinner />}
        </div>
    );

    return sponsor ? (
        <section className="sponsor">
            {contentEl}
            {videoRoomEl}
        </section>
    ) : (
        <LoadingSpinner />
    );
}
