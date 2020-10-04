import { ProgramPerson, UserProfile } from "@clowdr-app/clowdr-db-schema";
import React, { useState } from "react";
import useConference from "../../../hooks/useConference";
import useSafeAsync from "../../../hooks/useSafeAsync";
import useUserProfile from "../../../hooks/useUserProfile";
import "./ProgramPersonSelector.scss";

interface Props {
    setProgramPersonId(programPersonId: string): void;
}

type Person = {
    value: string,
    label: string,
    profile: UserProfile | undefined,
}

export default function ProgramPersonSelector(props: Props) {
    const conference = useConference();
    const user = useUserProfile();
    const [allProgramPeople, setAllProgramPeople] = useState<Array<Person> | null>(null);


    // Fetch all program people
    useSafeAsync(async () => {
        const people = await ProgramPerson.getAll(conference.id);
        let peopleValues = await Promise.all(people
            .map(async person => ({
                value: person.id,
                label: person.name,
                profile: await person.profile,
            } as Person)))
        peopleValues.unshift({ value: "", label: "None", profile: undefined });
        return peopleValues;
    }, setAllProgramPeople, []);

    return <>
        <div className="program-person-selector">
            <select onChange={e => {props.setProgramPersonId(e.target.value);}}>
                {allProgramPeople?.map(person => {
                    return <option
                        key={person.value}
                        value={person.value}
                        selected={person.profile && person.profile.userId === user.userId}>
                        {person.label}
                    </option>;
                })}
            </select>
        </div>
    </>
}