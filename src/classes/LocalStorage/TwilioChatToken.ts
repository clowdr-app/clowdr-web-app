/**
 * Hint: You probably shouldn't be using this directly. Check to see if you
 * should be using the Chat API.
 */
export default class LocalStorage {
    private static readonly twilioChatTokenKey = "twilioChatToken";

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

    private static readonly twilioChatTokenExpiryKey = "twilioChatTokenExpiry";

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
}
