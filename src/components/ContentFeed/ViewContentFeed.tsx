import { ContentFeed, TextChat, VideoRoom, YouTubeFeed, ZoomRoom } from "@clowdr-app/clowdr-db-schema";
import React, { useState } from "react";
import ReactPlayer from "react-player";
import Parse from "parse";
import useConference from "../../hooks/useConference";
import useSafeAsync from "../../hooks/useSafeAsync";
import ChatFrame from "../Chat/ChatFrame/ChatFrame";
import VideoGrid from "../Video/VideoGrid/VideoGrid";
import IframeResizer from 'iframe-resizer-react'
import "./ViewContentFeed.scss";
import useUserProfile from "../../hooks/useUserProfile";

interface Props {
    feed: ContentFeed;
    hideZoom: boolean;
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
    const [zoomDetails, setZoomDetails] = useState<{ signature: string, apiKey: string } | undefined>(undefined);

    useSafeAsync(
        async () => feed ? ((await feed.textChat) ?? "not present") : null,
        setTextChat,
        [feed]);

    useSafeAsync(
        async () => feed ? ((await feed.videoRoom) ?? "not present") : null,
        setVideoRoom,
        [feed]);

    useSafeAsync(
        async () => feed ? ((await feed.youtube) ?? "not present") : null,
        setYouTubeFeed,
        [feed]);

    useSafeAsync(
        async () => feed ? ((await feed.zoomRoom) ?? "not present") : null,
        setZoomRoom,
        [feed]);

    useSafeAsync(
        async () => joinZoom ? await Parse.Cloud.run("zoom-generate-signature", { meetingNumber: zoomRoomToMeetingDetails()?.meetingNumber, conference: conf.id }) : undefined,
        setZoomDetails,
        [joinZoom]);

    function handleZoomFrameRedirect(location: string) {
        // If the Zoom iframe has been redirected to about:blank, hide it
        if (location === "about:blank") {
            setJoinZoom(false);
            setZoomDetails(undefined);
        }
    }

    function zoomRoomToMeetingDetails(): { meetingNumber: string, password: string } | undefined {
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
    if (zoomRoom && zoomRoom !== "not present") {
        className += " zoom";
    }
    return <div className={className}>
        {!props.hideZoom && zoomRoom && zoomRoom !== "not present"
            ? <div className="zoom">
                <h3>Connect to Zoom</h3>
                <p>
                    This content is available from Zoom. You may choose to join directly in your browser
                    (only compatible with Chrome and Edge), or install the Zoom application if you haven't
                    already and join in the app. We suggest joining through the Zoom app if possible.
                        </p>
                <a className="button"
                    style={{ marginRight: "1em", fontWeight: "bold" }}
                    href={zoomRoom.url}
                    rel="noopener noreferrer"
                    target="_blank">
                    Join by Zoom App (recommended)
                        </a>
                {(zoomDetails && joinZoom)
                    ? <div className="zoom-frame-container">
                        <IframeResizer
                            className="zoom-frame"
                            title="zoom-frame"
                            src={`/zoom.html?signature=${zoomDetails.signature}&meetingNumber=${zoomRoomToMeetingDetails()?.meetingNumber}&password=${zoomRoomToMeetingDetails()?.password}&apiKey=${zoomDetails.apiKey}&userName=${user.displayName}`}
                            allowFullScreen={true}
                            frameBorder="0"
                            onLoad={(event) => {
                                // @ts-ignore
                                handleZoomFrameRedirect(event.target.contentWindow.location.href);
                            }}
                            style={{ width: '1px', minWidth: '100%', minHeight: '60vh' }}
                            allow="microphone; camera" />
                    </div>
                    : <button className="zoom-frame-button" onClick={() => setJoinZoom(true)}>Join Zoom in browser</button>}
            </div>
            : <></>
        }
        {youTubeFeed && youTubeFeed !== "not present"
            ? <ReactPlayer className="video-player"
                width="" height="" playsinline controls={true} muted={false}
                volume={1} url={`https://www.youtube.com/watch?v=${youTubeFeed.videoId}`}
            />
            : <></>
        }
        {videoRoom && videoRoom !== "not present"
            ? <VideoGrid room={videoRoom} />
            : <></>
        }
        {textChat && textChat !== "not present"
            ? <ChatFrame chatId={textChat.id} />
            : <></>
        }
        {(props.hideZoom || !zoomRoom) && !youTubeFeed && !videoRoom && !textChat
            && <>There is currently no content to display. The content may be scheduled for a particular time later on.</>
        }
    </div>;
}
