import { Popover, Tooltip } from "@material-ui/core";
import React, { useState } from "react";
import "./EventPhases.scss";

export enum EventViewMode {
    Loading,
    PreEvent,
    PreShow,
    PreRoll,
    WatchOnly,
    WatchAndQuestion,
    QuestionOnly,
    Breakout,
    Everything
}

export function EventPhases(props: {
    currentMode: EventViewMode
}) {
    const [showDescriptions, setShowDescriptions] = useState<boolean>(false);

    const names: { [K in EventViewMode]: string } = {
        0: "",
        1: "Pre-event",
        2: "Pre-show",
        3: "",
        4: "Watch",
        5: "Q&A in-stream",
        6: "Q&A out-of-band",
        7: "Breakout",
        8: "",
    };
    const explanations: { [K in EventViewMode]: JSX.Element | string } = {
        0: "",
        1: "More than 20 mins before the talk. Breakout room and Q&A chat are available.",
        2: "During the 20 mins before the talk, the breakout room and Q&A chat continue to be available. The Zoom links for session chairs and authors are made visible.",
        3: "",
        4: "The main period of the talk during which attendees should watch the YouTube stream and post questions in the Q&A chat. The Zoom links for session chairs and authors continue to be visible.",
        5: <><p>The 'live-streamed to YouTube' period of the Q&amp;A for the talk. Attendees may join the Zoom to ask questions or continue to post in the Q&amp;A chat.</p><p>At the end of this period you will be asked if you wish to join the out-of-band Q&amp;A or to watch the next talk.</p></>,
        6: <><p>Just prior to the start of this period you will be asked if you wish to join the out-of-band Q&amp;A or to watch the next talk.</p><p>The out-of-band Q&amp;A is the Zoom-only period of the Q&amp;A (that is not live-streamed to YouTube). Attendees may continue to participate in the Zoom to ask questions or continue to post in the Q&amp;A chat.</p></>,
        7: "After the event's Zoom Q&A is over, you can continue the discussion in the Clowdr Breakout Room that will become available on this page.",
        8: ""
    };

    const renderModeDescription = (mode: EventViewMode) => {
        return (
            <div className="event-phase-description">
                <h3>{names[mode]}</h3>
                <p>{explanations[mode]}</p>
            </div>
        );
    };

    const renderMode = (mode: EventViewMode) => {
        const isCurrent =
            mode === props.currentMode
            || (
                mode === EventViewMode.PreShow
                && props.currentMode === EventViewMode.PreRoll
            );
        let className = "phase ";
        const name = names[mode];
        switch (mode) {
            case EventViewMode.PreEvent:
                className += "pre-event";
                break;
            case EventViewMode.PreShow:
                className += "pre-show";
                break;
            case EventViewMode.WatchOnly:
                className += "watch-only";
                break;
            case EventViewMode.WatchAndQuestion:
                className += "watch-and-question";
                break;
            case EventViewMode.QuestionOnly:
                className += "question-only";
                break;
            case EventViewMode.Breakout:
                className += "breakout";
                break;
        }
        if (isCurrent) {
            className += " current";
        }
        return (
            <Tooltip title={explanations[mode]} key={name}>
                <div className={className}>{name}</div>
            </Tooltip>
        );
    };
    return props.currentMode === EventViewMode.Everything
        || props.currentMode === EventViewMode.Loading
        ? <></>
        : (
            <div className="event-phases-wrapper">
                <Popover
                    open={showDescriptions}
                    onClose={() => setShowDescriptions(false)}
                >
                    <div className="event-phases-popover">
                        <h2>Event Phases</h2>
                        {renderModeDescription(EventViewMode.PreEvent)}
                        {renderModeDescription(EventViewMode.PreShow)}
                        {renderModeDescription(EventViewMode.WatchOnly)}
                        {renderModeDescription(EventViewMode.WatchAndQuestion)}
                        {renderModeDescription(EventViewMode.QuestionOnly)}
                        {renderModeDescription(EventViewMode.Breakout)}
                        <button
                            aria-label="Close event descriptions"
                            onClick={(ev) => {
                                ev.stopPropagation();
                                ev.preventDefault();
                                setShowDescriptions(false);
                            }}
                        >
                            Close
                        </button>
                    </div>
                </Popover>
                <p>
                    <button
                        aria-label="Find out what each event phase means"
                        onClick={(ev) => {
                            ev.preventDefault();
                            ev.stopPropagation();
                            setShowDescriptions(true);
                        }}
                    >
                        Click here to find out more about the event phases
                    </button>
                </p>
                <div className="event-phases">
                    {renderMode(EventViewMode.PreEvent)}
                    {renderMode(EventViewMode.PreShow)}
                    {renderMode(EventViewMode.WatchOnly)}
                    {renderMode(EventViewMode.WatchAndQuestion)}
                    {renderMode(EventViewMode.QuestionOnly)}
                    {renderMode(EventViewMode.Breakout)}
                </div>
            </div>
        );
}
