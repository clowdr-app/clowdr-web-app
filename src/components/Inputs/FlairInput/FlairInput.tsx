import React, { useState } from 'react';
import { Flair } from 'clowdr-db-schema/src/classes/DataLayer';
import "./FlairInput.scss";
import FlairChip from '../../Profile/FlairChip/FlairChip';
import useSafeAsync from '../../../hooks/useSafeAsync';

interface Props {
    name: string;
    flairs: Flair[];
    setFlairs: (flairs: Flair[]) => void;
}

export default function FlairInput(props: Props) {
    const [allFlairs, setAllFlairs] = useState<Flair[]>([]);

    useSafeAsync(async () => {
        return await Flair.getAll().then(fs => fs.filter(x => x.id !== "<empty>"));
    }, setAllFlairs, []);

    const isSelected = (flair: Flair) => props.flairs.find(x => x.id === flair.id) !== undefined;

    return <div className="flair-input">
        {allFlairs.map((flair, i) =>
            <div className="chip-container" key={i}>
                <FlairChip
                    flair={flair}
                    unselected={!isSelected(flair)}
                    onClick={() => {
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