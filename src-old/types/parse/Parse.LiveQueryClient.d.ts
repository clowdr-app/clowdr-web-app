/* eslint-disable @typescript-eslint/no-unused-vars */
declare global {
    namespace Parse {
        type LiveQueryClientOptions = {
            applicationId: string;
            serverURL: string;
            javascriptKey?: string;
            masterKey?: string;
            sessionToken?: string;
            installationId?: string;
        }

        class LiveQueryClient {
            constructor(options: LiveQueryClientOptions);

            close(): void;
            open(): void;
            subscribe(query: Query, sessionToken?: UserSessionToken): LiveQuerySubscription;
            unsubscribe(subscription: LiveQuerySubscription);
        }
    }
}

export = Parse;
