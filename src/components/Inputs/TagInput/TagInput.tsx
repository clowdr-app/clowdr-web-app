import React from 'react';

interface Props {
    name: string;
    tags: string[];
    setTags: (tags: string[]) => void;
}

/**
 * React component for a simple toast notification with a link.
 */
export default function TagInput(props: Props) {
    return <>
        <input
            type="text"
            name={props.name}
            onChange={e => props.setTags(e.target.value.split(",").map(s => s.trim()))}
            value={props.tags.reduce((x, y) => `${x},${y}`)}
        />
    </>;
}