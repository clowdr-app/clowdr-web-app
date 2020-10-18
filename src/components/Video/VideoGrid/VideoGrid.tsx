import React from "react";
import { styled, Theme } from '@material-ui/core/styles';

import { CssBaseline } from '@material-ui/core';
import { MuiThemeProvider } from '@material-ui/core/styles';

import theme from '../VideoFrontend/theme';

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

const Container = styled('div')({
    display: 'grid',
    gridTemplateRows: '1fr auto',
});

const Main = styled('main')(({ theme: _theme }: { theme: Theme }) => ({
    overflow: 'hidden',
    paddingBottom: `${_theme.footerHeight}px`, // Leave some space for the footer
    background: 'black',
    [_theme.breakpoints.down('sm')]: {
        paddingBottom: `${_theme.mobileFooterHeight + _theme.mobileTopBarHeight}px`, // Leave some space for the mobile header and footer
    },
}));

interface Props {
    room: VideoRoom;
}

function VideoGrid(props: Props) {
    const roomState = useRoomState();

    return <Container style={{ height: "100%" }}>
        {roomState === 'disconnected' ? (
            <PreJoinScreens room={props.room} />
        ) : (
                <Main>
                    <ReconnectingNotification />
                    <MobileTopMenuBar />
                    <Room />
                    <MenuBar />
                </Main>
            )}
    </Container>;
}

function VideoGridVideoWrapper(props: Props) {
    const { error, setError } = useAppState();
    const connectionOptions = useConnectionOptions();

    return <UnsupportedBrowserWarning>
        <VideoProvider options={connectionOptions} onError={setError}>
            <ErrorDialog dismissError={() => setError(null)} error={error} />
            <VideoGrid {...props} />
        </VideoProvider>
    </UnsupportedBrowserWarning>;
}

export default function VideoGridStateWrapper(props: Props) {
    return <MuiThemeProvider theme={theme}>
        <CssBaseline />
        <AppStateProvider>
            <VideoGridVideoWrapper {...props} />
        </AppStateProvider>
    </MuiThemeProvider>;
}
