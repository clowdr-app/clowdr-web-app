import React from "react";
import { toast } from "react-toastify";
import Notification from "../../components/Notification/Notification";

/**
 * Display a global notification toast using `react-toastify`.
 */
function addNotification(content: string, actionUrl: string, actionText: string) {
    toast(
        (<Notification content={content} actionUrl={actionUrl} actionText={actionText} />),
        {
            className: "clowdr-notification",
            hideProgressBar: true,
        });
}

export { addNotification }