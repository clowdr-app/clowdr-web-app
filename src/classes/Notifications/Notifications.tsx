import React from "react";
import { toast } from "react-toastify";
import Notification from "../../components/Notifications/Notification/Notification";
import ErrorNotification from "../../components/Notifications/ErrorNotification/ErrorNotification";

/**
 * Display a global notification toast using `react-toastify`.
 */
function addNotification(content: string | JSX.Element, action?: { url: string, text: string }) {
    toast(
        (<Notification content={content} action={action} />),
        {
            className: "clowdr-notification",
            hideProgressBar: true,
            autoClose: 8000
        });
}

/**
 * Display a global error notification toast using `react-toastify`.
 */
function addError(content: string) {
    toast(
        (<ErrorNotification content={content} />),
        {
            className: "clowdr-error-notification",
            hideProgressBar: true,
            position: 'bottom-center',
            autoClose: 8000
        }
    )
}

export { addNotification, addError }
