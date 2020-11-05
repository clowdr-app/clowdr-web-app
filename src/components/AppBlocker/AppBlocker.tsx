import { ConferenceConfiguration } from '@clowdr-app/clowdr-db-schema';
import { DataUpdatedEventDetails } from '@clowdr-app/clowdr-db-schema/build/DataLayer/Cache/Cache';
import React, { useCallback, useState } from 'react';
import useDataSubscription from '../../hooks/useDataSubscription';
import useMaybeConference from '../../hooks/useMaybeConference';
import useSafeAsync from '../../hooks/useSafeAsync';
import useUserRoles from '../../hooks/useUserRoles';
import { LoadingSpinner } from '../LoadingSpinner/LoadingSpinner';

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
