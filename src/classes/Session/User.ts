/**
 * Hint: You probably shouldn't be using this directly. Check to see if you
 * should be using a context.
 */
export default class Session {
    private static readonly currentUserIdKey = "currentUserId";

    static get currentUserId(): string | null {
        return sessionStorage.getItem(Session.currentUserIdKey);
    }
    static set currentUserId(value: string | null) {
        if (value) {
            sessionStorage.setItem(Session.currentUserIdKey, value);
        }
        else {
            sessionStorage.removeItem(Session.currentUserIdKey);
        }
    }
}
