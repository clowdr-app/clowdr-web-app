import { UserProfile } from "@clowdr-app/clowdr-db-schema";
import React, { useState } from "react";
import MultiSelect from "react-multi-select-component";
import useConference from "../../../../hooks/useConference";
import useSafeAsync from "../../../../hooks/useSafeAsync";
import "./ProfileSelector.scss";

interface Props {
    setUserProfiles(profileIds: string[]): void;
    userProfiles: string[];
    disabled?: boolean;
}

type Option = {
    label: string;
    value: string;
};

export default function ProfileSelector(props: Props) {
    const conference = useConference();
    const [people, setPeople] = useState<Array<UserProfile> | null>();

    useSafeAsync(
        async () => {
            const profiles = await UserProfile.getAll(conference.id);
            return profiles.sort((a, b) =>
                a.realName.localeCompare(b.realName)
            );
        },
        setPeople,
        [conference.id]
    );

    const options =
        people?.map(person => ({
            label: person.realName,
            value: person.id,
        })) ?? [];

    const selected = options.filter(option =>
        props.userProfiles.includes(option.value)
    );

    return (
        <div className="profile-selector">
            <MultiSelect
                disabled={props.disabled}
                labelledBy="Choose people"
                options={options}
                onChange={(values: Option[]) => {
                    props.setUserProfiles(values.map(value => value.value));
                }}
                value={selected}
            />
        </div>
    );
}
