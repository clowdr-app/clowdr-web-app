import React, { useEffect, useRef } from "react";
import { styled, Theme } from "@material-ui/core/styles";

import { MuiThemeProvider } from "@material-ui/core/styles";

import { Room as TwilioRoom } from "twilio-video";

import theme from "../VideoFrontend/theme";

import Room from "../VideoFrontend/components/Room/Room";
import ErrorDialog from "../VideoFrontend/components/ErrorDialog/ErrorDialog";
import MenuBar from "../VideoFrontend/components/MenuBar/MenuBar";
import MobileTopMenuBar from "../VideoFrontend/components/MobileTopMenuBar/MobileTopMenuBar";
import PreJoinScreens from "../VideoFrontend/components/PreJoinScreens/PreJoinScreens";
import ReconnectingNotification from "../VideoFrontend/components/ReconnectingNotification/ReconnectingNotification";
import { VideoProvider } from "../VideoFrontend/components/VideoProvider";
import useRoomState from "../VideoFrontend/hooks/useRoomState/useRoomState";
import AppStateProvider, { useAppState } from "../VideoFrontend/state";
import useConnectionOptions from "../VideoFrontend/utils/useConnectionOptions/useConnectionOptions";
import UnsupportedBrowserWarning from "../VideoFrontend/components/UnsupportedBrowserWarning/UnsupportedBrowserWarning";
import { VideoRoom } from "@clowdr-app/clowdr-db-schema";
import useLocalAudioToggle from "../VideoFrontend/hooks/useLocalAudioToggle/useLocalAudioToggle";
import useVideoContext from "../VideoFrontend/hooks/useVideoContext/useVideoContext";
import useLocalVideoToggle from "../VideoFrontend/hooks/useLocalVideoToggle/useLocalVideoToggle";
import { Prompt } from "react-router-dom";
import "./VideoGrid.scss";

const Container = styled("div")({
    display: "grid",
    gridTemplateRows: "1fr auto",
});

const Main = styled("main")(({ theme: _theme }: { theme: Theme }) => ({
    overflow: "hidden",
    paddingBottom: `${_theme.footerHeight}px`, // Leave some space for the footer
    [_theme.breakpoints.down("sm")]: {
        paddingBottom: `${_theme.mobileFooterHeight + _theme.mobileTopBarHeight}px`, // Leave some space for the mobile header and footer
    },
}));

interface Props {
    room: VideoRoom;
    sponsorView: boolean;
}

function VideoGrid(props: Props) {
    const { room } = useVideoContext();
    const roomState = useRoomState();

    const { stopAudio } = useLocalAudioToggle();
    const { stopVideo } = useLocalVideoToggle();
    const unmountRef = useRef<() => void>();
    const unloadRef = useRef<EventListener>();
    const existingRoomRef = useRef<TwilioRoom | undefined>();

    useEffect(() => {
        function stop() {
            try {
                stopAudio();
            } catch {}

            try {
                stopVideo();
            } catch {}

            try {
                if (roomState === "connected" || roomState === "reconnecting") {
                    room.disconnect();
                }
            } catch {}
        }

        unmountRef.current = () => {
            stop();
        };
        unloadRef.current = ev => {
            ev.preventDefault();
            stop();
        };
    }, [room, roomState, stopAudio, stopVideo]);

    useEffect(() => {
        return () => {
            if (unmountRef && unmountRef.current) {
                unmountRef.current();
            }
        };
    }, []);

    useEffect(() => {
        if (unloadRef && unloadRef.current) {
            window.addEventListener("beforeunload", unloadRef.current);
        }
        return () => {
            if (unloadRef && unloadRef.current) window.removeEventListener("beforeunload", unloadRef.current);
        };
    }, []);

    useEffect(() => {
        if (
            existingRoomRef.current &&
            (room.sid !== existingRoomRef.current.sid || props.room.twilioID !== existingRoomRef.current.sid)
        ) {
            if (existingRoomRef.current.state === "connected") {
                existingRoomRef.current.disconnect();
            }
        }
        existingRoomRef.current = room;
    }, [room.sid, room, props.room.id, props.room]);

    return (
        <>
            <Prompt when={roomState !== "disconnected"} message="Are you sure you want to leave the video room?" />
            <Container style={{ height: "100%" }} className="video-grid">
                {roomState === "disconnected" ? (
                    <PreJoinScreens room={props.room} />
                ) : (
                    <Main>
                        <ReconnectingNotification />
                        <MobileTopMenuBar />
                        <Room sponsorView={props.sponsorView} />
                        <MenuBar />
                    </Main>
                )}
            </Container>
        </>
    );
}

function VideoGridVideoWrapper(props: Props) {
    const { error, setError } = useAppState();
    const connectionOptions = useConnectionOptions();

    return (
        <UnsupportedBrowserWarning>
            <VideoProvider options={connectionOptions} onError={setError}>
                <ErrorDialog dismissError={() => setError(null)} error={error} />
                <VideoGrid {...props} />
            </VideoProvider>
        </UnsupportedBrowserWarning>
    );
}

export default function VideoGridStateWrapper(props: Props) {
    return (
        <MuiThemeProvider theme={theme}>
            <AppStateProvider>
                <VideoGridVideoWrapper {...props} />
            </AppStateProvider>
        </MuiThemeProvider>
    );
}
