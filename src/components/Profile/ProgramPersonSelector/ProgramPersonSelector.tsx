import { ProgramPerson, UserProfile } from "@clowdr-app/clowdr-db-schema";
import { DataUpdatedEventDetails } from "@clowdr-app/clowdr-db-schema/build/DataLayer/Cache/Cache";
import React, { useCallback, useState } from "react";
import useConference from "../../../hooks/useConference";
import useDataSubscription from "../../../hooks/useDataSubscription";
import useSafeAsync from "../../../hooks/useSafeAsync";
import "./ProgramPersonSelector.scss";

interface Props {
    setProgramPersonId(programPersonId: string): void;
    programPersonId?: string;
    disabled?: boolean;
}

type Person = {
    personId: string;
    personName: string;
    profile: UserProfile | undefined;
};

export default function ProgramPersonSelector(props: Props) {
    const conference = useConference();
    const [allProgramPersons, setAllProgramPersons] = useState<Array<Person> | null>(null);

    async function convert(persons: ProgramPerson[]) {
        return Promise.all(
            persons.map(
                async person =>
                    ({
                        personId: person.id,
                        personName: person.name,
                        profile: await person.profile,
                    } as Person)
            )
        );
    }

    // Fetch all program people
    useSafeAsync(
        async () => {
            const persons = await ProgramPerson.getAll(conference.id);
            const people = await convert(persons);
            return people;
        },
        setAllProgramPersons,
        [conference],
        "ProgramPersonSelector:setAllProgramPersons"
    );

    const onPersonsUpdated = useCallback(
        async function _onPersonsUpdated(ev: DataUpdatedEventDetails<"ProgramPerson">) {
            if (allProgramPersons) {
                setAllProgramPersons(
                    await Promise.all(
                        allProgramPersons.map(async person => {
                            const newPerson = ev.objects.find(y => y.id === person.personId);
                            if (newPerson) {
                                return (await convert([newPerson as ProgramPerson]))[0];
                            }
                            return person;
                        })
                    )
                );
            }
        },
        [allProgramPersons]
    );

    useDataSubscription("ProgramPerson", onPersonsUpdated, _ => {}, !allProgramPersons, conference);

    return (
        <>
            <div className="program-person-selector">
                <select
                    onChange={e => {
                        props.setProgramPersonId(e.target.value);
                    }}
                    value={props.programPersonId}
                    disabled={props.disabled}
                >
                    <option value={undefined} label="Choose an author" />
                    {allProgramPersons
                        ?.sort((x, y) => x.personName.localeCompare(y.personName))
                        ?.map(person => {
                            return <option key={person.personId} value={person.personId} label={person.personName} />;
                        })}
                </select>
            </div>
        </>
    );
}
