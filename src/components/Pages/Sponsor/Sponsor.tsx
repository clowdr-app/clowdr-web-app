import React, { useCallback, useMemo, useState } from "react";
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
import { Link } from "react-router-dom";
import ReactMarkdown from "react-markdown";
import useMaybeUserProfile from "../../../hooks/useMaybeUserProfile";
import useUserRoles from "../../../hooks/useUserRoles";
import VideoItem from "./VideoItem/VideoItem";
import NewItem from "./NewItem/NewItem";
import TextItem from "./TextItem/TextItem";
import ButtonItem from "./ButtonItem/ButtonItem";
import { handleParseFileURLWeirdness } from "../../../classes/Utils";

interface Props {
    sponsorId: string;
}

export default function _Sponsor(props: Props) {
    const conference = useConference();
    const mUser = useMaybeUserProfile();
    const { isAdmin } = useUserRoles();
    const [sponsor, setSponsor] = useState<Sponsor | null>(null);
    const [content, setContent] = useState<SponsorContent[] | null>(null);
    const [videoRoom, setVideoRoom] = useState<VideoRoom | "none" | null>(null);
    const [itemBeingEdited, setItemBeingEdited] = useState<string | null>(null);
    useHeading({
        title: sponsor?.name ?? "Sponsor",
        icon: sponsor?.logo ? (
            <img
                src={handleParseFileURLWeirdness(sponsor?.logo) ?? ""}
                alt={`${sponsor?.name} logo`}
                style={{ marginRight: "1em", maxHeight: "2em" }}
            />
        ) : (
            <></>
        ),
    });

    useSafeAsync(
        async () => await Sponsor.get(props.sponsorId, conference.id),
        setSponsor,
        [conference.id, props.sponsorId],
        "Sponsor:setSponsor"
    );

    useSafeAsync(
        async () => (sponsor ? (await sponsor.videoRoom) ?? "none" : null),
        setVideoRoom,
        [sponsor?.videoRoomId, conference.id, sponsor],
        "Sponsor:setVideoRoom"
    );

    useSafeAsync(
        async () => (await sponsor?.contents) ?? null,
        setContent,
        [conference.id, props.sponsorId, sponsor],
        "Sponsor:setContent"
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

    const canEdit = useMemo(() => mUser && (sponsor?.representativeProfileIds.includes(mUser.id) || isAdmin), [
        isAdmin,
        mUser,
        sponsor,
    ]);

    async function deleteItem(sponsorContentId: string) {
        const sponsorContent = await SponsorContent.get(sponsorContentId, conference.id);
        sponsorContent?.delete();
    }

    async function toggleItemWide(sponsorContentId: string) {
        const sponsorContent = await SponsorContent.get(sponsorContentId, conference.id);
        if (sponsorContent) {
            sponsorContent.wide = !sponsorContent.wide;
            await sponsorContent.save();
        }
    }

    function renderItem(item: SponsorContent) {
        if (item.videoURL) {
            return (
                <VideoItem
                    editing={(canEdit && itemBeingEdited === item.id) ?? false}
                    updateVideoURL={async videoURL => {
                        item.videoURL = videoURL;
                        await item.save();
                        setItemBeingEdited(null);
                    }}
                    videoURL={item.videoURL}
                    sponsorColour={sponsor?.colour ?? ""}
                />
            );
        } else if (item.buttonContents) {
            return (
                <ButtonItem
                    editing={(canEdit && itemBeingEdited === item.id) ?? false}
                    text={item.buttonContents.text}
                    link={item.buttonContents.link}
                    updateButton={async (text, link) => {
                        item.buttonContents = { text, link };
                        await item.save();
                        setItemBeingEdited(null);
                    }}
                    sponsorColour={sponsor?.colour ?? ""}
                />
            );
        } else if (item.markdownContents) {
            return (
                <TextItem
                    editing={(canEdit && itemBeingEdited === item.id) ?? false}
                    markdown={item.markdownContents}
                    updateText={async markdown => {
                        item.markdownContents = markdown;
                        await item.save();
                        setItemBeingEdited(null);
                    }}
                    sponsorColour={sponsor?.colour ?? ""}
                />
            );
        } else {
            return <>Could not load content</>;
        }
    }

    const contentEl = (
        <div className="sponsor__content">
            {content
                ?.sort((a, b) => (a.ordering === b.ordering ? 0 : a.ordering < b.ordering ? -1 : 1))
                ?.map(item => (
                    <div key={item.id} className={`content-item ${item.wide && "content-item--wide"}`}>
                        <div className="content-item__buttons">
                            {canEdit && (
                                <button onClick={() => toggleItemWide(item.id)} aria-label="Toggle wide">
                                    <i className="fas fa-arrows-alt-h"></i>
                                </button>
                            )}
                            {canEdit && itemBeingEdited !== item.id && (
                                <>
                                    <button onClick={() => setItemBeingEdited(item.id)} aria-label="Edit">
                                        <i className="fas fa-edit"></i>
                                    </button>
                                    <button onClick={() => deleteItem(item.id)} aria-label="Delete">
                                        <i className="fas fa-trash"></i>
                                    </button>
                                </>
                            )}
                            {canEdit && itemBeingEdited === item.id && (
                                <button onClick={() => setItemBeingEdited(null)} aria-label="Cancel editing">
                                    <i className="fas fa-window-close"></i>
                                </button>
                            )}
                        </div>
                        {renderItem(item)}
                    </div>
                ))}
            {canEdit && <NewItem sponsorId={props.sponsorId} sponsorColour={sponsor?.colour ?? ""} />}
        </div>
    );

    const videoRoomEl = videoRoom ? (
        videoRoom === "none" ? (
            <></>
        ) : (
            <div className="sponsor__video-room">
                <VideoGrid room={videoRoom} sponsorView={true} />
            </div>
        )
    ) : (
        <LoadingSpinner />
    );

    return sponsor && content && videoRoom ? (
        <section className={`sponsor${videoRoom === "none" ? " no-room" : ""}`}>
            {contentEl}
            {videoRoomEl}
        </section>
    ) : (
        <LoadingSpinner />
    );
}
