import { ContentFeed, TextChat, VideoRoom, YouTubeFeed, ZoomRoom } from "@clowdr-app/clowdr-db-schema";
import React, { useState } from "react";
import ReactPlayer from "react-player";
import Parse from "parse";
import useConference from "../../hooks/useConference";
import useSafeAsync from "../../hooks/useSafeAsync";
import ChatFrame from "../Chat/ChatFrame/ChatFrame";
import VideoGrid from "../Video/VideoGrid/VideoGrid";
import IframeResizer from "iframe-resizer-react";
import "./ViewContentFeed.scss";
import useUserProfile from "../../hooks/useUserProfile";
import { Tooltip } from "@material-ui/core";

interface Props {
    feed: ContentFeed;

    autoJoinZoom?: boolean;
    hideZoomRoom?: boolean;
    hideYouTube?: boolean;
    hideVideoRoom?: boolean;
    hideTextChat?: boolean;

    setIsInZoom?: (value: boolean) => void;

    zoomButtonText?: {
        app: string;
        browser: string;
    }
    zoomAboveYouTube?: boolean;
}

export default function ViewContentFeed(props: Props) {
    const feed = props.feed;
    const conf = useConference();
    const user = useUserProfile();
    const [textChat, setTextChat] = useState<TextChat | "not present" | null>(null);
    const [videoRoom, setVideoRoom] = useState<VideoRoom | "not present" | null>(null);
    const [youTubeFeed, setYouTubeFeed] = useState<YouTubeFeed | "not present" | null>(null);
    const [zoomRoom, setZoomRoom] = useState<ZoomRoom | "not present" | null>(null);
    const [joinZoom, setJoinZoom] = useState<boolean>(false);
    const [zoomDetails, setZoomDetails] = useState<{ signature: string; apiKey: string } | undefined>(undefined);

    useSafeAsync(
        async () => (feed ? (await feed.textChat) ?? "not present" : null),
        setTextChat,
        [feed],
        "ViewContentFeed:setTextChat"
    );

    useSafeAsync(
        async () => (feed ? (await feed.videoRoom) ?? "not present" : null),
        setVideoRoom,
        [feed],
        "ViewContentFeed:setVideoRoom"
    );

    useSafeAsync(
        async () => (feed ? (await feed.youtube) ?? "not present" : null),
        setYouTubeFeed,
        [feed],
        "ViewContentFeed:setYouTubeFeed"
    );

    useSafeAsync(
        async () => (feed ? (await feed.zoomRoom) ?? "not present" : null),
        setZoomRoom,
        [feed],
        "ViewContentFeed:setZoomRoom"
    );

    useSafeAsync(
        async () =>
            joinZoom || props.autoJoinZoom
                ? await Parse.Cloud.run("zoom-generate-signature", {
                    meetingNumber: zoomRoomToMeetingDetails()?.meetingNumber,
                    conference: conf.id,
                })
                : undefined,
        setZoomDetails,
        [joinZoom, props.autoJoinZoom],
        "ViewContentFeed:generate-zoom-signature"
    );

    function handleZoomFrameRedirect(location: string) {
        // If the Zoom iframe has been redirected to about:blank, hide it
        if (location === "about:blank") {
            setJoinZoom(false);
            setZoomDetails(undefined);
        }
    }

    function zoomRoomToMeetingDetails(): { meetingNumber: string; password: string } | undefined {
        if (zoomRoom && zoomRoom !== "not present") {
            const url = new URL(zoomRoom.url);
            const meetingNumber = url.pathname.slice(3);
            const password = url.searchParams.get("pwd");
            return meetingNumber && password ? { meetingNumber, password } : undefined;
        }
        return undefined;
    }

    // TODO: Limit zoom room height by available panel height

    let className = "content-feed";
    if (youTubeFeed && youTubeFeed !== "not present") {
        className += " youtube";
    }
    if (!props.hideZoomRoom && zoomRoom && zoomRoom !== "not present") {
        className += " zoom";
    }

    const zoom = !props.hideZoomRoom && zoomRoom && zoomRoom !== "not present"
        ? (
            <>
                <div className="zoom">
                    <div className="buttons">
                        <a
                            className="button"
                            style={{ marginRight: "1em", fontWeight: "bold" }}
                            href={zoomRoom.url}
                            rel="noopener noreferrer"
                            target="_blank"
                        >
                            {props.zoomButtonText ? props.zoomButtonText.app : "Join by Zoom App (recommended)"}
                        </a><br />
                        {zoomDetails && (props.autoJoinZoom || joinZoom) ? (
                            <div className="zoom-frame-container">
                                <IframeResizer
                                    className="zoom-frame"
                                    title="zoom-frame"
                                    src={`/zoom.html?signature=${zoomDetails.signature}&meetingNumber=${zoomRoomToMeetingDetails()?.meetingNumber
                                        }&password=${zoomRoomToMeetingDetails()?.password}&apiKey=${zoomDetails.apiKey
                                        }&userName=${user.displayName}`}
                                    allowFullScreen={true}
                                    frameBorder="0"
                                    onLoad={event => {
                                        props.setIsInZoom?.(true);
                                        // @ts-ignore
                                        handleZoomFrameRedirect(event.target.contentWindow.location.href);
                                    }}
                                    style={{ width: "1px", minWidth: "100%", minHeight: "60vh" }}
                                    allow="microphone; camera"
                                />
                            </div>
                        ) : (
                                <Tooltip title="Google Chrome and Microsoft Edge only">
                                    <button className="zoom-frame-button" onClick={() => setJoinZoom(true)}>
                                        {props.zoomButtonText ? props.zoomButtonText.browser : "Join Zoom in browser"}
                                    </button>
                                </Tooltip>
                            )}
                    </div>
                </div>
            </>
        )
        : <></>;

    // TODO: Detect if the Zoom is a webinar and hide the Join In Browser thing
    //       or somehow supply the user's email address to Zoom to join the webinar? Consent?
    return (
        <div className={className}>
            {!props.hideZoomRoom && props.zoomAboveYouTube
                ? zoom
                : <></>
            }
            {!props.hideYouTube && youTubeFeed && youTubeFeed !== "not present"
                ? (
                    <ReactPlayer
                        className="video-player"
                        width=""
                        height=""
                        playsinline
                        controls={true}
                        muted={false}
                        volume={1}
                        url={`https://www.youtube.com/watch?v=${youTubeFeed.videoId}`}
                    />
                )
                : <></>
            }
            {!props.hideZoomRoom && !props.zoomAboveYouTube
                ? zoom
                : <></>
            }
            {!props.hideVideoRoom && videoRoom && videoRoom !== "not present"
                ? (
                    <>
                        <p>Join the discussion by entering this breakout room.</p>
                        <VideoGrid room={videoRoom} preferredMode="fullwidth" />
                    </>
                ) : <></>
            }
            {!props.hideTextChat && textChat && textChat !== "not present"
                ? <ChatFrame chatId={textChat.id} />
                : <></>
            }
        </div>
    );
}
