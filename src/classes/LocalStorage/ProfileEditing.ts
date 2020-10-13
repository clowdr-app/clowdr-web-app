/**
 * Hint: You probably shouldn't be using this directly. Check to see if you
 * should be using a hook.
 */
export default class LocalStorage {
    private static readonly justSavedProfileKey = "profileEditor_justSavedProfile";

    static get justSavedProfile(): boolean {
        return localStorage.getItem(LocalStorage.justSavedProfileKey) === "true";
    }
    static set justSavedProfile(value: boolean) {
        localStorage.setItem(LocalStorage.justSavedProfileKey, value ? "true" : "false");
    }
}
