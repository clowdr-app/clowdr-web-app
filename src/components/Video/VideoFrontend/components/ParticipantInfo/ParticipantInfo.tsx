import React, { useCallback, useMemo } from "react";
import clsx from "clsx";
import { createStyles, makeStyles, Theme } from "@material-ui/core/styles";
import { LocalAudioTrack, LocalVideoTrack, Participant, RemoteAudioTrack, RemoteVideoTrack } from "twilio-video";

import AudioLevelIndicator from "../AudioLevelIndicator/AudioLevelIndicator";
import AvatarIcon from "../../icons/AvatarIcon";
import NetworkQualityLevel from "../NetworkQualityLevel/NetworkQualityLevel";
import PinIcon from "./PinIcon/PinIcon";
import ScreenShareIcon from "../../icons/ScreenShareIcon";
import Typography from "@material-ui/core/Typography";

import useIsTrackSwitchedOff from "../../hooks/useIsTrackSwitchedOff/useIsTrackSwitchedOff";
import usePublications from "../../hooks/usePublications/usePublications";
import useTrack from "../../hooks/useTrack/useTrack";
import useParticipantIsReconnecting from "../../hooks/useParticipantIsReconnecting/useParticipantIsReconnecting";
import { UserProfile } from "@clowdr-app/clowdr-db-schema";
import BioPopover from "../../../../Profile/BioPopover/BioPopover";
import { Link } from "react-router-dom";

const BORDER_SIZE = 3;

const useStyles = makeStyles((theme: Theme) =>
    createStyles<any, {}>({
        container: {
            position: "relative",
            display: "flex",
            alignItems: "center",
            height: 0,
            overflow: "hidden",
            "& video": {
                filter: "none",
                objectFit: "contain !important" as any,
            },
            paddingTop: `calc(${(9 / 16) * 100}% - ${BORDER_SIZE}px)`,
            border: `${BORDER_SIZE}px solid black`,
            background: "black",
        },
        notContainedInGrid: {
            [theme.breakpoints.down("sm")]: {
                height: theme.sidebarMobileHeight,
                width: `${(theme.sidebarMobileHeight * 16) / 9}px`,
                marginRight: "8px",
                marginBottom: "0",
                fontSize: "10px",
                paddingTop: `${theme.sidebarMobileHeight - 2}px`,
            },
        },
        innerContainer: {
            position: "absolute",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
        },
        infoContainer: {
            position: "absolute",
            zIndex: 2,
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            height: "100%",
            width: "100%",
            background: "transparent",
            top: 0,
        },
        avatarContainer: {
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "black",
            position: "absolute",
            top: 0,
            right: 0,
            bottom: 0,
            left: 0,
            zIndex: 1,
            [theme.breakpoints.down("sm")]: {
                "& svg": {
                    transform: "scale(0.7)",
                },
            },
        },
        reconnectingContainer: {
            position: "absolute",
            top: 0,
            right: 0,
            bottom: 0,
            left: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "rgba(40, 42, 43, 0.75)",
            zIndex: 1,
        },
        screenShareIconContainer: {
            background: "rgba(0, 0, 0, 0.5)",
            padding: "0.18em 0.3em",
            marginRight: "0.3em",
            display: "flex",
            "& path": {
                fill: "white",
            },
        },
        identity: {
            background: "rgba(0, 0, 0, 0.5)",
            color: "white",
            padding: "0.18em 0.3em",
            margin: 0,
            display: "flex",
            alignItems: "center",
        },
        infoRowBottom: {
            display: "flex",
            justifyContent: "space-between",
            position: "absolute",
            bottom: 0,
            left: 0,
        },
        networkQualityContainer: {
            width: "28px",
            height: "28px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "rgba(0, 0, 0, 0.5)",
        },
        typeography: {
            color: "white",
            [theme.breakpoints.down("sm")]: {
                fontSize: "0.75rem",
            },
        },
        hideParticipant: {
            display: "none",
        },
        cursorPointer: {
            cursor: "pointer",
        },
        highlightParticipant: {
            border: `${BORDER_SIZE}px solid ${theme.palette.primary.main}`,
        },
    })
);

interface ParticipantInfoProps {
    participant: Participant;
    profile?: UserProfile;
    children: React.ReactNode;
    onClick?: () => void;
    isSelected?: boolean;
    isLocalParticipant?: boolean;
    hideParticipant?: boolean;
    slot?: number;
    insideGrid: boolean;
    highlight?: boolean;
}

export default function ParticipantInfo({
    participant,
    profile,
    onClick,
    isSelected,
    children,
    isLocalParticipant,
    hideParticipant,
    slot,
    insideGrid,
    highlight,
}: ParticipantInfoProps) {
    const publications = usePublications(participant);

    const audioPublication = publications.find(p => p.kind === "audio");
    const videoPublication = publications.find(p => p.trackName.includes("camera"));

    const isVideoEnabled = Boolean(videoPublication);
    const isScreenShareEnabled = publications.find(p => p.trackName.includes("screen"));

    const videoTrack = useTrack(videoPublication);
    const isVideoSwitchedOff = useIsTrackSwitchedOff(videoTrack as LocalVideoTrack | RemoteVideoTrack);

    const audioTrack = useTrack(audioPublication) as LocalAudioTrack | RemoteAudioTrack | undefined;
    const isParticipantReconnecting = useParticipantIsReconnecting(participant);

    const classes = useStyles();

    const [anchorEl, setAnchorEl] = React.useState<HTMLElement | null>(null);

    const handlePopoverOpen = useCallback((event: React.MouseEvent<HTMLElement, MouseEvent>) => {
        setAnchorEl(event.currentTarget);
    }, []);

    const handlePopoverClose = useCallback(() => {
        setAnchorEl(null);
    }, []);

    const bioPopoverOpen = Boolean(anchorEl);

    const profilePopoverEl = useMemo(() => {
        return profile ? (
            <BioPopover
                id={`${profile.id}-mouse-over-popover`}
                profile={profile}
                open={bioPopoverOpen}
                anchorEl={anchorEl}
                onClose={handlePopoverClose}
            />
        ) : <></>;
    }, [anchorEl, bioPopoverOpen, handlePopoverClose, profile]);

    return (
        <div
            className={clsx(
                classes.container,
                {
                    [classes.hideParticipant]: hideParticipant,
                    [classes.cursorPointer]: Boolean(onClick),
                    [classes.notContainedInGrid]: !insideGrid,
                    [classes.highlightParticipant]: highlight,
                },
                slot !== undefined ? `area-${slot}` : undefined
            )}
            onClick={onClick}
            data-cy-participant={participant.identity}
        >
            <div className={classes.infoContainer}>
                <div className={classes.networkQualityContainer}>
                    <NetworkQualityLevel participant={participant} />
                </div>
                <div className={classes.infoRowBottom}>
                    {isScreenShareEnabled && (
                        <span className={classes.screenShareIconContainer}>
                            <ScreenShareIcon />
                        </span>
                    )}
                    {profilePopoverEl}
                    <a
                        className={classes.identity}
                        id={profile ? `${profile.id}-mouse-over-popover` : undefined}
                        aria-haspopup="true"
                        onMouseEnter={handlePopoverOpen}
                        onMouseLeave={handlePopoverClose}
                        href={`/profile/${profile ? profile.id : ""}`}
                        target="_blank"
                        rel="noopener noreferrer"
                    >
                        <AudioLevelIndicator audioTrack={audioTrack} />
                        <Typography variant="body1" className={classes.typeography} component="span">
                            {profile ? profile.displayName : ""}
                            {isLocalParticipant && " (You)"}
                        </Typography>
                    </a>
                </div>
                <div>{isSelected && <PinIcon />}</div>
            </div>
            <div className={classes.innerContainer}>
                {(!isVideoEnabled || isVideoSwitchedOff) && (
                    <div className={classes.avatarContainer}>
                        <AvatarIcon />
                    </div>
                )}
                {isParticipantReconnecting && (
                    <div className={classes.reconnectingContainer}>
                        <Typography variant="body1" className={classes.typeography}>
                            Reconnecting...
                        </Typography>
                    </div>
                )}
                {children}
            </div>
        </div>
    );
}
