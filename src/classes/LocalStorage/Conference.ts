/**
 * Hint: You probably shouldn't be using this directly. Check to see if you
 * should be using a hook.
 */
export default class LocalStorage {
    private static readonly currentConferenceIdKey = "currentConferenceId";
    private static readonly wasBannedFromNameKey = "wasBannedFromName";
    private static readonly wasManagerOrAdminKey = "wasManagerOrAdmin";
    private static readonly previousUserIdKey = "previousUserId";

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

    static get wasManagerOrAdmin(): boolean | null {
        return localStorage.getItem(LocalStorage.wasManagerOrAdminKey) === "true";
    }
    static set wasManagerOrAdmin(value: boolean | null) {
        if (value) {
            localStorage.setItem(LocalStorage.wasManagerOrAdminKey, value === true ? "true" : "false");
        }
        else {
            localStorage.removeItem(LocalStorage.wasManagerOrAdminKey);
        }
    }

    static get previousUserId(): string | null {
        return localStorage.getItem(LocalStorage.previousUserIdKey);
    }
    static set previousUserId(value: string | null) {
        if (value) {
            localStorage.setItem(LocalStorage.previousUserIdKey, value);
        }
        else {
            localStorage.removeItem(LocalStorage.previousUserIdKey);
        }
    }
}
