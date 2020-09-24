/**
 * Hint: You probably shouldn't be using this directly. Check to see if you
 * should be using the Chat API.
 */
export default class LocalStorage {
    private static readonly twilioChatTokenKey = "twilioChatToken";
    private static readonly twilioChatTokenExpiryKey = "twilioChatTokenExpiry";
    private static readonly twilioChatTokenConferenceIdKey = "twilioChatTokenConferenceId";
    private static readonly twilioChatUserProfileIdKey = "twilioChatUserProfileId";

    static get twilioChatToken(): string | null {
        return localStorage.getItem(LocalStorage.twilioChatTokenKey);
    }
    static set twilioChatToken(value: string | null) {
        if (value) {
            localStorage.setItem(LocalStorage.twilioChatTokenKey, value);
        }
        else {
            localStorage.removeItem(LocalStorage.twilioChatTokenKey);
        }
    }

    static get twilioChatTokenExpiry(): Date | null {
        let str = localStorage.getItem(LocalStorage.twilioChatTokenExpiryKey);
        return str ? new Date(parseInt(str)) : null;
    }
    static set twilioChatTokenExpiry(value: Date | null) {
        if (value) {
            localStorage.setItem(LocalStorage.twilioChatTokenExpiryKey, value.getTime().toString());
        }
        else {
            localStorage.removeItem(LocalStorage.twilioChatTokenExpiryKey);
        }
    }

    static get twilioChatTokenConferenceId(): string | null {
        return localStorage.getItem(LocalStorage.twilioChatTokenConferenceIdKey);
    }
    static set twilioChatTokenConferenceId(value: string | null) {
        if (value) {
            localStorage.setItem(LocalStorage.twilioChatTokenConferenceIdKey, value);
        }
        else {
            localStorage.removeItem(LocalStorage.twilioChatTokenConferenceIdKey);
        }
    }

    static get twilioChatUserProfileId(): string | null {
        return localStorage.getItem(LocalStorage.twilioChatUserProfileIdKey);
    }
    static set twilioChatUserProfileId(value: string | null) {
        if (value) {
            localStorage.setItem(LocalStorage.twilioChatUserProfileIdKey, value);
        }
        else {
            localStorage.removeItem(LocalStorage.twilioChatUserProfileIdKey);
        }
    }
}
