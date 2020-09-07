export default class Session {
    static get currentConferenceId(): string | null {
        return sessionStorage.getItem("currentConferenceId");
    }
}
