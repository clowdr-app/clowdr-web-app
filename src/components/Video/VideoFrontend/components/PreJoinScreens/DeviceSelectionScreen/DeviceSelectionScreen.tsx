import React from "react";
import { makeStyles, Grid, Button, Theme, Hidden } from "@material-ui/core";
import LocalVideoPreview from "./LocalVideoPreview/LocalVideoPreview";
import SettingsMenu from "./SettingsMenu/SettingsMenu";
import ToggleAudioButton from "../../Buttons/ToggleAudioButton/ToggleAudioButton";
import ToggleVideoButton from "../../Buttons/ToggleVideoButton/ToggleVideoButton";
import { useAppState } from "../../../state";
import useVideoContext from "../../../hooks/useVideoContext/useVideoContext";
import { VideoRoom } from "@clowdr-app/clowdr-db-schema";
import assert from "assert";
import useUserProfile from "../../../../../../hooks/useUserProfile";

const useStyles = makeStyles((theme: Theme) => ({
    gutterBottom: {
        marginBottom: "1em",
    },
    marginTop: {
        marginTop: "1em",
    },
    deviceButton: {
        color: "black",
        width: "100%",
        border: "2px solid #aaa",
        margin: "1em 0",
        "&:hover": {
            color: "black",
        },
    },
    localPreviewContainer: {
        paddingRight: "2em",
        [theme.breakpoints.down("sm")]: {
            padding: "0 2.5em",
        },
    },
    joinButtons: {
        display: "flex",
        justifyContent: "space-between",
        [theme.breakpoints.down("sm")]: {
            flexDirection: "column-reverse",
            width: "100%",
            "& button": {
                margin: "0.5em 0",
            },
        },
    },
    mobileButtonBar: {
        [theme.breakpoints.down("sm")]: {
            display: "flex",
            justifyContent: "space-between",
            margin: "1.5em 0 1em",
        },
    },
    mobileButton: {
        padding: "0.8em 0",
        margin: 0,
    },
}));

interface DeviceSelectionScreenProps {
    room: VideoRoom;
    setMediaError?(error: Error): void;
}

export default function DeviceSelectionScreen({ room, setMediaError }: DeviceSelectionScreenProps) {
    const user = useUserProfile();
    const classes = useStyles();
    const { getToken, isFetching } = useAppState();
    const { connect, isAcquiringLocalTracks, isConnecting } = useVideoContext();
    const disableButtons = isFetching || isAcquiringLocalTracks || isConnecting;

    const handleJoin = () => {
        getToken(room).then(tokenData => {
            assert(tokenData.token);
            connect(tokenData.token);
        });
    };

    return (
        <>
            <Grid container justify="center" aria-label="join video room form">
                <Grid item md={7} sm={12} xs={12}>
                    <div className={classes.localPreviewContainer}>
                        <LocalVideoPreview identity={user.displayName} />
                    </div>
                    <div className={classes.mobileButtonBar}>
                        <Hidden mdUp>
                            <ToggleAudioButton
                                className={classes.mobileButton}
                                disabled={disableButtons}
                                setMediaError={setMediaError}
                            />
                            <ToggleVideoButton
                                className={classes.mobileButton}
                                disabled={disableButtons}
                                setMediaError={setMediaError}
                            />
                        </Hidden>
                        <SettingsMenu mobileButtonClass={classes.mobileButton} />
                    </div>
                </Grid>
                <Grid item md={5} sm={12} xs={12}>
                    <Grid container direction="column" justify="space-between" style={{ height: "100%" }}>
                        <div>
                            <Hidden smDown>
                                <ToggleAudioButton
                                    className={classes.deviceButton}
                                    disabled={disableButtons}
                                    setMediaError={setMediaError}
                                />
                                <ToggleVideoButton
                                    className={classes.deviceButton}
                                    disabled={disableButtons}
                                    setMediaError={setMediaError}
                                />
                            </Hidden>
                        </div>
                        <div className={classes.joinButtons}>
                            <Button
                                variant="contained"
                                color="primary"
                                data-cy-join-now
                                onClick={handleJoin}
                                disabled={disableButtons}
                            >
                                Join room
                            </Button>
                        </div>
                    </Grid>
                </Grid>
            </Grid>
        </>
    );
}
