import React, { useCallback, useMemo, useRef, useState } from "react";
import Parse from "parse";
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
import useMaybeUserProfile from "../../../hooks/useMaybeUserProfile";
import useUserRoles from "../../../hooks/useUserRoles";
import VideoItem from "./VideoItem/VideoItem";
import NewItem from "./NewItem/NewItem";
import TextItem from "./TextItem/TextItem";
import ButtonItem from "./ButtonItem/ButtonItem";
import { handleParseFileURLWeirdness } from "../../../classes/Utils";
import SplitterLayout from "react-splitter-layout";
import ChatFrame from "../../Chat/ChatFrame/ChatFrame";
import { addError, addNotification } from "../../../classes/Notifications/Notifications";
import ColourDialog from "./ColourDialog/ColourDialog";

interface Props {
    sponsorId: string;
}

export default function _Sponsor(props: Props) {
    const conference = useConference();
    const mUser = useMaybeUserProfile();
    const { isAdmin } = useUserRoles();
    const [size, setSize] = useState(30);
    const [sponsor, setSponsor] = useState<Sponsor | null>(null);
    const [content, setContent] = useState<SponsorContent[] | null>(null);
    const [videoRoom, setVideoRoom] = useState<VideoRoom | "none" | null>(null);
    const [itemBeingEdited, setItemBeingEdited] = useState<string | null>(null);
    const [editingColour, setEditingColour] = useState<boolean>(false);
    const uploadRef = useRef<HTMLInputElement>(null);

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
    const onContentUpdated = useCallback(
        function _onContentUpdated(ev: DataUpdatedEventDetails<"SponsorContent">) {
            setContent(oldContent => {
                if (oldContent) {
                    const newContent = Array.from(oldContent);
                    for (const object of ev.objects) {
                        const content = object as SponsorContent;
                        if (content.sponsorId && content.sponsorId === sponsor?.id) {
                            const idx = newContent?.findIndex(x => x.id === object.id);
                            if (idx === -1) {
                                newContent.push(content);
                            } else {
                                newContent.splice(idx, 1, content);
                            }
                        }
                    }
                    return newContent;
                }
                return null;
            });
        },
        [sponsor]
    );

    const onContentDeleted = useCallback(function _onContentDeleted(ev: DataDeletedEventDetails<"SponsorContent">) {
        setContent(oldContent => oldContent?.filter(x => x.id !== ev.objectId) ?? null);
    }, []);

    useDataSubscription("SponsorContent", onContentUpdated, onContentDeleted, !content, conference);

    // Subscribe to sponsor updates
    const onSponsorUpdated = useCallback(function _onSponsorUpdated(ev: DataUpdatedEventDetails<"Sponsor">) {
        setSponsor(oldSponsor => (ev.objects.find(x => x.id === oldSponsor?.id) as Sponsor) ?? oldSponsor);
    }, []);

    const onSponsorDeleted = useCallback(function _onSponsorDeleted(ev: DataDeletedEventDetails<"Sponsor">) {
        setSponsor(oldSponsor => (ev.objectId === oldSponsor?.id ? null : oldSponsor));
    }, []);

    useDataSubscription("Sponsor", onSponsorUpdated, onSponsorDeleted, !sponsor, conference);

    const canEdit = useMemo(() => mUser && (sponsor?.representativeProfileIds.includes(mUser.id) || isAdmin), [
        isAdmin,
        mUser,
        sponsor,
    ]);

    async function uploadFile(file: File): Promise<Parse.File | undefined> {
        if (file) {
            const data = new Uint8Array(await file.arrayBuffer());
            const parseFile = new Parse.File(`logo-${file.name}`, [...data]);
            await parseFile.save();

            return parseFile;
        }
        return undefined;
    }

    const uploadLogo = useCallback(async () => {
        let logo: Parse.File | undefined = undefined;
        if (uploadRef.current?.files?.length && uploadRef.current?.files?.length > 0) {
            if (!["image/gif", "image/jpeg", "image/png", "image/webp"].includes(uploadRef.current.files[0].type)) {
                addError("Failed to upload logo. It must be a GIF, JPEG, PNG or WEBP file.");
                return;
            }
            logo = await uploadFile(uploadRef.current.files[0]);
        }

        if (sponsor) {
            try {
                await Parse.Cloud.run("edit-sponsor", {
                    sponsor: sponsor.id,
                    colour: sponsor.colour,
                    description: sponsor.description,
                    logo: logo,
                    conference: conference.id,
                });
            } catch (e) {
                addError(`Failed to upload logo. Error: ${e}`, 5000);
            } finally {
                addNotification(`Uploaded logo`);
            }
        }
    }, [conference.id, sponsor]);

    async function deleteLogo() {
        if (sponsor) {
            try {
                await Parse.Cloud.run("edit-sponsor", {
                    sponsor: sponsor.id,
                    colour: sponsor.colour,
                    description: sponsor.description,
                    logo: undefined,
                    conference: conference.id,
                });
            } catch (e) {
                addError(`Failed to delete logo. Error: ${e}`, 5000);
            } finally {
                addNotification(`Removed logo`);
            }
        }
    }

    async function updateColour(colour: string) {
        if (sponsor) {
            try {
                await Parse.Cloud.run("edit-sponsor", {
                    sponsor: sponsor.id,
                    colour: colour,
                    description: sponsor.description,
                    logo: sponsor.logo,
                    conference: conference.id,
                });
            } catch (e) {
                addError(`Failed to update colour. Error: ${e}`, 5000);
            } finally {
                addNotification(`Updated colour`);
            }
        }
    }

    useHeading({
        title: sponsor?.name ?? "Sponsor",
        icon: (
            <div className="logo-container">
                <input id="logo-upload" type="file" hidden ref={uploadRef} onChange={() => uploadLogo()} />
                {canEdit && (
                    <div className="button-group" style={sponsor?.logo ? {} : { position: "static", margin: "0.2em" }}>
                        {sponsor?.logo ? (
                            <button onClick={() => deleteLogo()} aria-label="Remove logo" title="Remove logo">
                                <i className="fas fa-window-close" style={{ margin: 0 }}></i>
                            </button>
                        ) : (
                            <>
                                <button
                                    onClick={() => uploadRef.current?.click()}
                                    aria-label="Upload logo"
                                    title="Upload logo"
                                >
                                    <i className="fas fa-cloud-upload-alt" style={{ margin: 0 }}></i>
                                </button>
                            </>
                        )}
                        <button onClick={() => setEditingColour(true)} aria-label="Change colour" title="Change colour">
                            <i className="fas fa-paint-brush" style={{ margin: 0 }}></i>
                        </button>
                    </div>
                )}
                {sponsor?.logo && (
                    <img
                        src={handleParseFileURLWeirdness(sponsor?.logo) ?? ""}
                        alt={`${sponsor?.name} logo`}
                        style={{ marginRight: "1em", maxHeight: "2em" }}
                    />
                )}
            </div>
        ),
    });

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

    async function moveItemUp(idx: number) {
        if (idx > 0 && content) {
            const item = content[idx];
            const itemBefore = content[idx - 1];
            const itemOrdering = item.ordering;
            const itemBeforeOrdering = itemBefore.ordering;
            item.ordering = itemBeforeOrdering;
            await item.save();
            itemBefore.ordering = itemOrdering;
            await itemBefore.save();
        }
    }

    async function moveItemDown(idx: number) {
        if (content && idx < content.length - 1) {
            const item = content[idx];
            const itemAfter = content[idx + 1];
            const itemOrdering = item.ordering;
            const itemAfterOrdering = itemAfter.ordering;
            item.ordering = itemAfterOrdering;
            await item.save();
            itemAfter.ordering = itemOrdering;
            await itemAfter.save();
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
                ?.sort((a, b) => a.id.localeCompare(b.id))
                ?.sort((a, b) => (a.ordering === b.ordering ? 0 : a.ordering < b.ordering ? -1 : 1))
                ?.map((item, idx) => (
                    <div key={item.id} className={`content-item ${item.wide ? "content-item--wide" : ""}`}>
                        <div className="button-group">
                            {canEdit && (
                                <>
                                    <button onClick={async () => moveItemUp(idx)} aria-label="Move up" title="Move up">
                                        <i className="far fa-arrow-alt-circle-left"></i>
                                    </button>
                                    <button
                                        onClick={async () => moveItemDown(idx)}
                                        aria-label="Move down"
                                        title="Move down"
                                    >
                                        <i className="far fa-arrow-alt-circle-right"></i>
                                    </button>
                                    <button
                                        onClick={async () => toggleItemWide(item.id)}
                                        aria-label="Toggle wide"
                                        title="Toggle wide"
                                    >
                                        <i className="fas fa-arrows-alt-h"></i>
                                    </button>
                                </>
                            )}
                            {canEdit && itemBeingEdited !== item.id && (
                                <>
                                    <button onClick={() => setItemBeingEdited(item.id)} aria-label="Edit" title="Edit">
                                        <i className="fas fa-edit"></i>
                                    </button>
                                    <button
                                        onClick={async () => deleteItem(item.id)}
                                        aria-label="Delete"
                                        title="Delete"
                                    >
                                        <i className="fas fa-trash"></i>
                                    </button>
                                </>
                            )}
                            {canEdit && itemBeingEdited === item.id && (
                                <button
                                    onClick={() => setItemBeingEdited(null)}
                                    aria-label="Cancel editing"
                                    title="Cancel editing"
                                >
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
                <SplitterLayout
                    vertical={true}
                    percentage={true}
                    ref={component => {
                        component?.setState({ secondaryPaneSize: size });
                    }}
                    onSecondaryPaneSizeChange={newSize => setSize(newSize)}
                >
                    <div className="split top-split">
                        {videoRoom ? <VideoGrid room={videoRoom} sponsorView={true} /> : <LoadingSpinner />}
                        <button onClick={() => setSize(100)}>&#9650;</button>
                    </div>
                    <div className="split bottom-split">
                        <button onClick={() => setSize(0)}>&#9660;</button>
                        {videoRoom.textChatId ? (
                            videoRoom.textChatId !== "not present" ? (
                                <ChatFrame chatId={videoRoom.textChatId} />
                            ) : (
                                <>This room does not have a chat.</>
                            )
                        ) : (
                            <LoadingSpinner />
                        )}
                    </div>
                </SplitterLayout>
            </div>
        )
    ) : (
        <LoadingSpinner />
    );

    return sponsor && content && videoRoom ? (
        <section className={`sponsor${videoRoom === "none" ? " no-room" : ""}`}>
            <ColourDialog
                colour={sponsor.colour}
                onClose={() => setEditingColour(false)}
                showDialog={editingColour}
                updateColour={updateColour}
            />
            {contentEl}
            {videoRoomEl}
        </section>
    ) : (
        <LoadingSpinner />
    );
}
