import React, { useState } from "react";
import Parse from "parse";
import VideoItem from "../VideoItem/VideoItem";
import useConference from "../../../../hooks/useConference";
import TextItem from "../TextItem/TextItem";
import ButtonItem from "../ButtonItem/ButtonItem";

interface Props {
    sponsorId: string;
    sponsorColour: string;
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
                    <>
                        <div className="content-item__message">
                            Add content to your page
                        </div>
                        <div className="content-item__button">
                            <button onClick={() => setState("addingText")}
                                style={{
                                    backgroundColor: props.sponsorColour
                                }}>
                                <i className="fas fa-align-left"></i> Text
                        </button>
                            <button onClick={() => setState("addingVideo")}
                                style={{
                                    backgroundColor: props.sponsorColour
                                }}>
                                <i className="fas fa-video"></i> Video
                        </button>
                            <button onClick={() => setState("addingButton")}
                                style={{
                                    backgroundColor: props.sponsorColour
                                }}>
                                <i className="fas fa-square"></i> Button
                        </button>
                        </div>
                    </>
                );
            case "addingButton":
                return <ButtonItem editing={true} text="" link="" updateButton={createButtonContent} sponsorColour={props.sponsorColour} />;
            case "addingText":
                return <TextItem editing={true} markdown="" updateText={createTextContent} sponsorColour={props.sponsorColour} />;
            case "addingVideo":
                return <VideoItem editing={true} videoURL="" updateVideoURL={createVideoContent} sponsorColour={props.sponsorColour} />;
        }
    }

    return (
        <div className="content-item--wide">
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
