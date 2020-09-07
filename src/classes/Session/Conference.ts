/**
 * Hint: You probably shouldn't be using this directly. Check to see if you
 * should be using a context.
 */
export default class Session {
    private static readonly currentConferenceIdKey = "currentConferenceId";

    static get currentConferenceId(): string | null {
        return sessionStorage.getItem(Session.currentConferenceIdKey);
    }
    static set currentConferenceId(value: string | null) {
        if (value) {
            sessionStorage.setItem(Session.currentConferenceIdKey, value);
        }
        else {
            sessionStorage.removeItem(Session.currentConferenceIdKey);
        }
    }
}
