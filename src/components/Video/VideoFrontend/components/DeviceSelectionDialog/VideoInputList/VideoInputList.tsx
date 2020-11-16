import React, { useCallback, useState } from "react";
import { DEFAULT_VIDEO_CONSTRAINTS } from "../../../constants";
import { FormControl, MenuItem, Typography, Select } from "@material-ui/core";
import { makeStyles } from "@material-ui/core/styles";
import VideoTrack from "../../VideoTrack/VideoTrack";
import useMediaStreamTrack from "../../../hooks/useMediaStreamTrack/useMediaStreamTrack";
import useVideoContext from "../../../hooks/useVideoContext/useVideoContext";
import { useVideoInputDevices } from "../../../hooks/deviceHooks/deviceHooks";
import LocalStorage_TwilioVideo from "../../../../../../classes/LocalStorage/TwilioVideo";

const useStyles = makeStyles({
    preview: {
        width: "300px",
        maxHeight: "200px",
        margin: "0.5em auto",
        "& video": {
            maxHeight: "200px",
        },
    },
});

export default function VideoInputList() {
    const classes = useStyles();
    const videoInputDevices = useVideoInputDevices();
    const { localVideoTrack } = useVideoContext();
    const mediaStreamTrack = useMediaStreamTrack(localVideoTrack);
    const localVideoInputDeviceId = mediaStreamTrack?.getSettings().deviceId;
    const [lastVideoDeviceId, _setLastVideoDeviceId] = useState<string | null>(
        LocalStorage_TwilioVideo.twilioVideoLastCamera
    );

    const setLastVideoDeviceId = useCallback((deviceId: string | null) => {
        LocalStorage_TwilioVideo.twilioVideoLastCamera = deviceId;
        _setLastVideoDeviceId(deviceId);
    }, []);

    function replaceTrack(newDeviceId: string) {
        setLastVideoDeviceId(newDeviceId);
        if (localVideoTrack) {
            localVideoTrack.restart({
                ...(DEFAULT_VIDEO_CONSTRAINTS as {}),
                deviceId: { exact: newDeviceId },
            });
        }
    }

    return (
        <div>
            {localVideoTrack && (
                <div className={classes.preview}>
                    <VideoTrack isLocal track={localVideoTrack} />
                </div>
            )}
            {videoInputDevices.length > 1 ? (
                <FormControl fullWidth>
                    <Typography variant="subtitle2" gutterBottom>
                        Video Input
                    </Typography>
                    <Select
                        onChange={e => replaceTrack(e.target.value as string)}
                        value={localVideoInputDeviceId || lastVideoDeviceId}
                        variant="outlined"
                    >
                        {videoInputDevices.map(device => (
                            <MenuItem value={device.deviceId} key={device.deviceId}>
                                {device.label}
                            </MenuItem>
                        ))}
                    </Select>
                </FormControl>
            ) : (
                <>
                    <Typography variant="subtitle2" gutterBottom>
                        Video Input
                    </Typography>
                    <Typography>{localVideoTrack?.mediaStreamTrack.label || "No Local Video"}</Typography>
                </>
            )}
        </div>
    );
}
