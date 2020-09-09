import { getTimeString } from "./Util";

class DebugLogger {
    private enabled: boolean = false;
    
    constructor(
        private prefix: string
    ) {
    }

    enable(): void {
        this.enabled = true;
    }

    disable(): void {
        this.enabled = false;
    }

    get isEnabled(): boolean {
        return this.enabled;
    }

    prefixMessage(msg: string): string {
        return `${getTimeString(new Date())} [${this.prefix}]: ${msg}`;
    }

    info(msg: string, ...params: any[]) {
        if (this.enabled) {
            console.info(this.prefixMessage(msg), ...params);
        }
    }

    warn(msg: string, ...params: any[]) {
        if (this.enabled) {
            console.warn(this.prefixMessage(msg), ...params);
        }
    }

    error(msg: string, ...params: any[]) {
        console.error(this.prefixMessage(msg), ...params);
    }
}

export default DebugLogger;
