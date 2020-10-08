import React, { useEffect, useReducer } from "react";
import "./LoadingSpinner.scss";

interface Props {
    interval?: number;
    message?: string;
}

export function LoadingSpinner(props: Props) {
    const [loadingSpinnerCount, dispatchLoadingSpinner] = useReducer(
        (prevState: number) => {
            return prevState < 3 ? prevState + 1 : 0;
        }, 0);

    useEffect(() => {
        const loadingSpinnerIntervalId = window.setInterval(() => {
            dispatchLoadingSpinner();
        }, props.interval || 1000);

        return () => {
            clearInterval(loadingSpinnerIntervalId);
        }
    }, [props.interval]);

    return <div className="loading-spinner">
        <span>
            {props.message !== undefined ? props.message : "Loading"}{".".repeat(loadingSpinnerCount)}
        </span>
    </div>;
}
