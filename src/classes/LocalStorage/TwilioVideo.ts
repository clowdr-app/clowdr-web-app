export default class TwilioVideo {
    private static readonly twilioVideoCameraEnabledKey = "twilioVideoCameraEnabled";
    private static readonly twilioVideoMicEnabledKey = "twilioVideoMicEnabled";
    private static readonly twilioVideoLastCameraKey = "twilioVideoLastCamera";
    private static readonly twilioVideoLastMicKey = "twilioVideoLastMic";

    static get twilioVideoCameraEnabled(): boolean | null {
        return localStorage.getItem(TwilioVideo.twilioVideoCameraEnabledKey) === "true";
    }
    static set twilioVideoCameraEnabled(value: boolean | null) {
        if (value !== null) {
            localStorage.setItem(TwilioVideo.twilioVideoCameraEnabledKey, value === true ? "true" : "false");
        }
        else {
            localStorage.removeItem(TwilioVideo.twilioVideoCameraEnabledKey);
        }
    }

    static get twilioVideoMicEnabled(): boolean | null {
        return localStorage.getItem(TwilioVideo.twilioVideoMicEnabledKey) === "true";
    }
    static set twilioVideoMicEnabled(value: boolean | null) {
        if (value !== null) {
            localStorage.setItem(TwilioVideo.twilioVideoMicEnabledKey, value === true ? "true" : "false");
        }
        else {
            localStorage.removeItem(TwilioVideo.twilioVideoMicEnabledKey);
        }
    }

    static get twilioVideoLastCamera(): string | null {
        return localStorage.getItem(TwilioVideo.twilioVideoLastCameraKey);
    }
    static set twilioVideoLastCamera(value: string | null) {
        if (value) {
            localStorage.setItem(TwilioVideo.twilioVideoLastCameraKey, value);
        }
        else {
            localStorage.removeItem(TwilioVideo.twilioVideoLastCameraKey);
        }
    }

    static get twilioVideoLastMic(): string | null {
        return localStorage.getItem(TwilioVideo.twilioVideoLastMicKey);
    }
    static set twilioVideoLastMic(value: string | null) {
        if (value) {
            localStorage.setItem(TwilioVideo.twilioVideoLastMicKey, value);
        }
        else {
            localStorage.removeItem(TwilioVideo.twilioVideoLastMicKey);
        }
    }
}
