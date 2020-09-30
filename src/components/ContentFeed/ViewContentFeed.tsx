import { ContentFeed, TextChat, VideoRoom, YouTubeFeed, ZoomRoom } from "@clowdr-app/clowdr-db-schema";
import React, { useState } from "react";
import ReactPlayer from "react-player";
import useSafeAsync from "../../hooks/useSafeAsync";
import ChatFrame from "../Chat/ChatFrame/ChatFrame";
import VideoGrid from "../Video/VideoGrid/VideoGrid";
import "./ViewContentFeed.scss";

interface Props {
    feed: ContentFeed;
}

export default function ViewContentFeed(props: Props) {
    const feed = props.feed;
    const [textChat, setTextChat] = useState<TextChat | "not present" | null>(null);
    const [videoRoom, setVideoRoom] = useState<VideoRoom | "not present" | null>(null);
    const [youTubeFeed, setYouTubeFeed] = useState<YouTubeFeed | "not present" | null>(null);
    const [zoomRoom, setZoomRoom] = useState<ZoomRoom | "not present" | null>(null);

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

    return <div className="content-feed">
        {textChat && textChat !== "not present"
            ? <ChatFrame chatSid={textChat.twilioID} />
            : videoRoom && videoRoom !== "not present"
                ? <VideoGrid room={videoRoom} />
                : youTubeFeed && youTubeFeed !== "not present"
                    ? <ReactPlayer className="video-player"
                        width="" height="" playsinline controls={true} muted={false}
                        volume={1} url={`https://www.youtube.com/watch?v=${youTubeFeed.videoId}`}
                    />
                    : zoomRoom && zoomRoom !== "not present"
                        ? <div>
                            <h3>Connect to Zoom</h3>
                            <p>
                                This content is available from Zoom. You may choose to join directly in your browser
                                (only compatible with Chrome and Edge), or install the Zoom application if you haven't
                                already and join in the app. We suggest joining through the Zoom app if possible.
                        </p>
                            <a className="button"
                                href={zoomRoom.url}
                                rel="noopener noreferrer"
                                target="_blank">
                                Join by Zoom App
                        </a>
                            <p>TODO: Embed zoom within the webapp</p>
                            {/* TODO: Embed zoom within the webapp:
                            <button onClick={() => joinZoomByBrowser()}>Join by Browser</button>
                        */}
                        </div>
                        : <div className="invalid">Unfortunately this is an invalid or unsupported feed configuration.</div>
        }</div>;
}
