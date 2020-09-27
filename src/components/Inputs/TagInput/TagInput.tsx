import React, { useState } from 'react';
import "./TagInput.scss";

interface Props {
    name: string;
    tags: string[];
    setTags: (tags: string[]) => void;
}

export default function TagInput(props: Props) {
    const [currentTag, setCurrentTag] = useState("");

    const handleKeyDown = (e: React.KeyboardEvent) => {
        switch (e.key) {
            case "Enter":
            case "Tab":
                if (currentTag !== "") {
                    e.preventDefault();
                    props.setTags([...props.tags, currentTag]);
                    setCurrentTag("");
                }
                return;
            case " ":
                e.preventDefault(); // If space, always prevent default
                if (currentTag !== "") {
                    props.setTags([...props.tags, currentTag]);
                    setCurrentTag("");
                }
                return;
            case "Backspace":
                if (e.key === "Backspace" && currentTag === "") {
                    e.preventDefault();
                    props.setTags(props.tags.slice(0, -1));
                }
                return;
        }
    };

    return <div className="tag-input">
        {props.tags.map((tag, i) =>
            <div key={i} className="tag-container">
                <span className="tag-chip">{tag}</span>
            </div>
        )}
        <input
            type="text"
            name={props.name}
            onChange={e => setCurrentTag(e.target.value)}
            onKeyDown={handleKeyDown}
            value={currentTag}
        />
    </div >;
}