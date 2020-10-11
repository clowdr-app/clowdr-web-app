/**
 * Hint: You probably shouldn't be using this directly. Check to see if you
 * should be using a hook.
 */
export default class LocalStorage {
    private static readonly currentConferenceIdKey = "currentConferenceId";
    private static readonly wasBannedFromNameKey = "wasBannedFromName";

    static get currentConferenceId(): string | null {
        return localStorage.getItem(LocalStorage.currentConferenceIdKey);
    }
    static set currentConferenceId(value: string | null) {
        if (value) {
            localStorage.setItem(LocalStorage.currentConferenceIdKey, value);
        }
        else {
            localStorage.removeItem(LocalStorage.currentConferenceIdKey);
        }
    }

    static get wasBannedFromName(): string | null {
        return localStorage.getItem(LocalStorage.wasBannedFromNameKey);
    }
    static set wasBannedFromName(value: string | null) {
        if (value) {
            localStorage.setItem(LocalStorage.wasBannedFromNameKey, value);
        }
        else {
            localStorage.removeItem(LocalStorage.wasBannedFromNameKey);
        }
    }
}
