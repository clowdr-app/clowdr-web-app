import React from 'react';
import { Link } from 'react-router-dom';
import "./Notification.scss";

interface Props {
    content: string,
    actionUrl: string,
    actionText: string,
}

/**
 * React component for a simple toast notification with a link.
 */
export default function Notification(props: Props) {
    return <div>
        <p>{props.content}</p>
        <p className="notification-action">
            <Link to={props.actionUrl}>
                {props.actionText}
                <i className="fas fa-chevron-circle-right icon"></i>
            </Link>
        </p>
    </div>;
}