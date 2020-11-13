import { Tooltip } from "@material-ui/core";
import React from "react";
import { Link } from "react-router-dom";

interface Props {
    icon?: JSX.Element;
    title: string;
    label: string;
    bold?: boolean;
    action: string | ((event: React.MouseEvent<HTMLButtonElement>) => void);
    children?: React.ReactNode | React.ReactNodeArray;
    className?: string;
    onClick?: () => void;
    tooltip?: string;
}

export default function MenuItem(props: Props) {
    const contents = (
        <>
            <div className="head-row">
                {props.icon ? props.icon : <></>}
                <span className={"title" + (props.bold ? " bolded" : "")}>{props.title}</span>
            </div>
            {props.children ? <div className="child-content">{props.children}</div> : <></>}
        </>
    );
    const linkEl = () => {
        if (typeof props.action === "string") {
            return (
                <Link
                    className={`menu-item ${props.className ?? ""}`}
                    aria-label={props.label}
                    to={props.action}
                    onClick={props.onClick}
                >
                    {contents}
                </Link>
            );
        } else {
            return (
                <button className={`menu-item ${props.className ?? ""}`} aria-label={props.label} onClick={props.action}>
                    {contents}
                </button>
            );
        }
    };

    if (props.tooltip) {
        return (
            <Tooltip title={props.tooltip}>
                {linkEl()}
            </Tooltip>
        );
    }
    else {
        return linkEl();
    }
}
