import React, { useState } from 'react';
import { Flair } from '@clowdr-app/clowdr-db-schema/build/DataLayer';
import "./FlairInput.scss";
import FlairChip from '../../Profile/FlairChip/FlairChip';
import useSafeAsync from '../../../hooks/useSafeAsync';
import useConference from '../../../hooks/useConference';
import useUserRoles from '../../../hooks/useUserRoles';

interface Props {
    name: string;
    flairs: Flair[];
    setFlairs: (flairs: Flair[]) => void;
    disabled?: boolean;
}

export default function FlairInput(props: Props) {
    const conference = useConference();
    const [allFlairs, setAllFlairs] = useState<Flair[]>([]);
    const { isAdmin, isManager } = useUserRoles();

    useSafeAsync(async () => {
        let results = await Flair.getAll(conference.id);
        if (!isAdmin) {
            results = results.filter(x =>
                x.label.toLowerCase() !== "admin"
            );
        }
        if (!isManager) {
            results = results.filter(x =>
                x.label.toLowerCase() !== "manager"
                && x.label.toLowerCase() !== "moderator"
                && x.label.toLowerCase() !== "mod"
            );
        }
        return results;
    }, setAllFlairs, [], "FlairInput:getAll");

    const isSelected = (flair: Flair) => props.flairs.find(x => x.id === flair.id) !== undefined;

    return <div className="flair-input">
        {allFlairs
            .sort((x, y) => x.label.localeCompare(y.label))
            .map((flair, i) =>
            <div className="chip-container" key={i}>
                <FlairChip
                    flair={flair}
                    unselected={!isSelected(flair)}
                    onClick={() => {
                        if (props.disabled) {
                            return;
                        }
                        if (isSelected(flair)) {
                            props.setFlairs(props.flairs.filter(x => x.id !== flair.id));
                        } else {
                            props.setFlairs([...props.flairs, flair])
                        }
                    }}
                />
            </div>
        )}
    </div>;
}
