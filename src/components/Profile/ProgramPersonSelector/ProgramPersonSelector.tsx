import { ProgramPerson, UserProfile } from "@clowdr-app/clowdr-db-schema";
import { DataUpdatedEventDetails } from "@clowdr-app/clowdr-db-schema/build/DataLayer/Cache/Cache";
import React, { useCallback, useEffect, useState } from "react";
import useConference from "../../../hooks/useConference";
import useDataSubscription from "../../../hooks/useDataSubscription";
import useSafeAsync from "../../../hooks/useSafeAsync";
import useUserProfile from "../../../hooks/useUserProfile";
import "./ProgramPersonSelector.scss";

interface Props {
    setProgramPersonId(programPersonId: string): void;
    disabled?: boolean;
}

type Person = {
    personId: string,
    personName: string,
    profile: UserProfile | undefined,
}

export default function ProgramPersonSelector(props: Props) {
    const conference = useConference();
    const profile = useUserProfile();
    const [allProgramPersons, setAllProgramPersons] = useState<Array<Person> | null>(null);
    const [chosenPerson, setChosenPerson] = useState<string | null>(null);


    async function convert(persons: ProgramPerson[]) {
        return Promise.all(persons
            .map(async person => ({
                personId: person.id,
                personName: person.name,
                profile: await person.profile,
            } as Person)));
    }

    // Fetch all program people
    useSafeAsync(async () => {
        const persons = await ProgramPerson.getAll(conference.id);
        let people = await convert(persons);
        people.unshift({ personId: "", personName: "None", profile: undefined });
        return people;
    }, setAllProgramPersons, [conference]);

    const onPersonsUpdated = useCallback(async function _onPersonsUpdated(ev: DataUpdatedEventDetails<"ProgramPerson">) {
        if (allProgramPersons) {
            setAllProgramPersons(await Promise.all(allProgramPersons.map(async person => {
                if (person.personId === ev.object.id) {
                    return (await convert([ev.object as ProgramPerson]))[0];
                }
                return person;
            })));
        }
    }, [allProgramPersons]);

    useDataSubscription("ProgramPerson", onPersonsUpdated, _ => { }, !allProgramPersons, conference);

    useEffect(() => {
        props.setProgramPersonId(chosenPerson ?? "");
    }, [props, chosenPerson])

    return <>
        <div className="program-person-selector">
            <select
                onChange={e => { setChosenPerson(e.target.value) }}
                value={chosenPerson ?? allProgramPersons?.find(p => p.profile?.id === profile.id)?.personId ?? ""}
                disabled={props.disabled}>
                {allProgramPersons?.map(person => {
                    return <option
                        key={person.personId}
                        value={person.personId}
                        label={person.personName} />;
                })}
            </select>
        </div>
    </>
}