/**
 * Hint: You probably shouldn't be using this directly. Check to see if you
 * should be using a hook.
 */
export default class LocalStorage {
    private static readonly currentConferenceIdKey = "currentConferenceId";

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
}
