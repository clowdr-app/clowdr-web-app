import React, { useState } from "react";
import Parse from "parse";
import VideoItem from "../VideoItem/VideoItem";
import useConference from "../../../../hooks/useConference";
import TextItem from "../TextItem/TextItem";
import ButtonItem from "../ButtonItem/ButtonItem";

interface Props {
    sponsorId: string;
}

type State = "addingText" | "addingVideo" | "addingButton" | "choose";

export default function NewItem(props: Props) {
    const conference = useConference();
    const [state, setState] = useState<State>("choose");

    async function createVideoContent(videoURL: string) {
        await Parse.Cloud.run("create-sponsorContent", {
            sponsor: props.sponsorId,
            conference: conference.id,
            videoURL,
        });
        setState("choose");
    }

    async function createTextContent(markdown: string) {
        await Parse.Cloud.run("create-sponsorContent", {
            sponsor: props.sponsorId,
            conference: conference.id,
            markdownContents: markdown,
        });
        setState("choose");
    }

    async function createButtonContent(text: string, link: string) {
        await Parse.Cloud.run("create-sponsorContent", {
            sponsor: props.sponsorId,
            conference: conference.id,
            buttonText: text,
            buttonLink: link,
        });
        setState("choose");
    }

    function getContents() {
        switch (state) {
            case "choose":
                return (
                    <div className="content-item__button">
                        <button onClick={() => setState("addingText")}>
                            <i className="fas fa-align-left"></i> Add text
                        </button>
                        <button onClick={() => setState("addingVideo")}>
                            <i className="fas fa-video"></i> Add video
                        </button>
                        <button onClick={() => setState("addingButton")}>
                            <i className="fas fa-square"></i> Add button
                        </button>
                    </div>
                );
            case "addingButton":
                return <ButtonItem editing={true} text="" link="" updateButton={createButtonContent} />;
            case "addingText":
                return <TextItem editing={true} markdown="" updateText={createTextContent} />;
            case "addingVideo":
                return <VideoItem editing={true} videoURL="" updateVideoURL={createVideoContent} />;
        }
    }

    return (
        <div className="content-item">
            <div className="content-item__buttons">
                {state !== "choose" && (
                    <button onClick={() => setState("choose")} aria-label="Cancel">
                        <i className="fas fa-window-close"></i>
                    </button>
                )}
            </div>
            {getContents()}
        </div>
    );
}
