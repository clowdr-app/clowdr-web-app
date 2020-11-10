import React, { useCallback } from "react";

import Button from "@material-ui/core/Button";
import MicIcon from "../../../icons/MicIcon";
import MicOffIcon from "../../../icons/MicOffIcon";

import useLocalAudioToggle from "../../../hooks/useLocalAudioToggle/useLocalAudioToggle";
import useVideoContext from "../../../hooks/useVideoContext/useVideoContext";
import { useHasAudioInputDevices } from "../../../hooks/deviceHooks/deviceHooks";

export default function ToggleAudioButton(props: {
    disabled?: boolean;
    className?: string;
    setMediaError?(error: Error): void;
}) {
    const { isEnabled: isAudioEnabled, toggleAudioEnabled } = useLocalAudioToggle();
    const { localAudioTrack, getLocalAudioTrack } = useVideoContext();
    const hasAudioDevices = useHasAudioInputDevices();
    const hasAudioTrack = !!localAudioTrack;

    const toggleAudio = useCallback(async () => {
        if (!hasAudioTrack && hasAudioDevices) {
            try {
                await getLocalAudioTrack();
            } catch (e) {
                if (props.setMediaError) {
                    props.setMediaError(e);
                }
            }
        }
        toggleAudioEnabled();
    }, [getLocalAudioTrack, hasAudioDevices, hasAudioTrack, props, toggleAudioEnabled]);

    return (
        <Button
            className={props.className}
            onClick={toggleAudio}
            disabled={props.disabled || !hasAudioDevices}
            startIcon={isAudioEnabled ? <MicIcon /> : <MicOffIcon />}
            data-cy-audio-toggle
        >
            {!hasAudioDevices
                ? "No audio devices"
                : !hasAudioTrack
                ? "Start Audio"
                : isAudioEnabled
                ? "Mute"
                : "Unmute"}
        </Button>
    );
}
