import DebugLogger from "../../DebugLogger";

export default class Cache {
    private isInitialised: boolean = false;

    private logger: DebugLogger = new DebugLogger("Cache");

    constructor(
        public readonly conferenceId: string,
        enableDebug: boolean = false) {
        if (enableDebug) {
            this.logger.enable();
        }
        else {
            this.logger.disable();
        }

        this.logger.warn("Cache not implemented yet");

        // TODO
    }

    get IsDebugEnabled(): boolean {
        return this.logger.isEnabled;
    }

    set IsDebugEnabled(value: boolean) {
        if (value !== this.logger.isEnabled) {
            if (value) {
                this.logger.enable();
            }
            else {
                this.logger.disable();
            }
        }
    }

    get IsInitialised(): boolean {
        return this.isInitialised;
    }

    async initialise(): Promise<void> {
        // TODO
        this.isInitialised = true;
    }
}
