import { ConferenceConfiguration } from '@clowdr-app/clowdr-db-schema';
import { DataUpdatedEventDetails } from '@clowdr-app/clowdr-db-schema/build/DataLayer/Cache/Cache';
import React, { useCallback, useState } from 'react';
import useDataSubscription from '../../hooks/useDataSubscription';
import useMaybeConference from '../../hooks/useMaybeConference';
import useSafeAsync from '../../hooks/useSafeAsync';
import useUserRoles from '../../hooks/useUserRoles';
import { LoadingSpinner } from '../LoadingSpinner/LoadingSpinner';
import { detect as detectBrowser } from "detect-browser";

export default function AppBlocker(props: {
    children: JSX.Element
}) {
    const conference = useMaybeConference();
    const { isAdmin } = useUserRoles();
    const [maintenanceMode, setMaintenanceMode] = useState<string | false | null>(null);

    function handleConfigs(configs: Array<ConferenceConfiguration>) {
        if (configs[0].value === "false") {
            return false;
        }
        else {
            return configs[0].value;
        }
    }

    useSafeAsync(async () => {
        const configs = conference ? await ConferenceConfiguration.getByKey("MAINTENANCE_MODE", conference.id) : [];
        if (configs.length > 0) {
            return handleConfigs(configs);
        }
        return false;
    }, setMaintenanceMode, [], "AppBlocker:setMaintenanceMode");

    const onConfigUpdated = useCallback(function _onTrackUpdated(ev: DataUpdatedEventDetails<"ConferenceConfiguration">) {
        for (const _object of ev.objects) {
            const object = _object as ConferenceConfiguration;
            if (object.key === "MAINTENANCE_MODE") {
                setMaintenanceMode(handleConfigs([object]));
            }
        }
    }, []);
    useDataSubscription("ConferenceConfiguration", onConfigUpdated, null, maintenanceMode === null, conference);

    const browser = detectBrowser();
    if (browser?.name !== "android" &&
        browser?.name !== "chrome" &&
        browser?.name !== "chromium-webview" &&
        browser?.name !== "edge" &&
        browser?.name !== "edge-chromium" &&
        browser?.name !== "edge-ios" &&
        browser?.name !== "firefox" &&
        browser?.name !== "fxios" &&
        browser?.name !== "ios" &&
        browser?.name !== "ios-webview" &&
        browser?.name !== "samsung") {
        return <div className="page-wrapper">
            <div className="page">
                <p>
                    Clowdr (<a href="https://github.com/clowdr-app/clowdr-web-app/">open source on GitHub</a>) does not currently support your chosen browser. Please use Firefox, Chrome or Edge. Android and iOS sort of work but the experience is a bit patchy - we're working on it.
                </p>
            </div>
        </div>;
    }

    if (maintenanceMode !== null) {
        if (isAdmin || maintenanceMode === false) {
            return props.children;
        }
        else {
            return <div className="page-wrapper">
                <div className="page">
                    <p>
                        {maintenanceMode}
                    </p>
                </div>
            </div>;
        }
    }
    else {
        return <LoadingSpinner message="Please wait" />;
    }
}
