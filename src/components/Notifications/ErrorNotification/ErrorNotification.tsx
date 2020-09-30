import React from 'react';
import "./ErrorNotification.scss";

interface Props {
    content: string,
}

/**
 * React component for a toast notification representing an error.
 */
export default function ErrorNotification(props: Props) {
    return <div>
        <p>{props.content}</p>
    </div>;
}