import React from "react";
import { Link } from "react-router-dom";
import { LoadingSpinner } from "../../LoadingSpinner/LoadingSpinner";

export interface Item<RenderData = undefined> {
    key: string;
    text: string;
    link?: string;
    renderData: RenderData;
}

interface Props<RenderData> {
    className?: string;
    loadingMessage?: string;
    items?: Item<RenderData>[];
    itemRenderer: ItemRenderer<RenderData>;
    children?: JSX.Element;
}

export default function Column<RenderData = undefined>(props: Props<RenderData>) {
    const items = props.items
    ? props.items.map(item => {
        return <li key={item.key} className="column__item">
            {props.itemRenderer.render(item)}
        </li>;
    })
    : <LoadingSpinner message={props.loadingMessage} />;

    return <div className={`columns ${props.className}`}>
        {props.children}
        <ul className="column" >
            {items}
        </ul>
    </div>
}

export interface ItemRenderer<RenderData> {
    render(item: Item<RenderData>): JSX.Element;
}

export class DefaultItemRenderer implements ItemRenderer<undefined> {
    render(item: Item<undefined>): JSX.Element {
        return item.link ? <Link to={item.link}>{item.text}</Link> : <>{item.text}</>;
    }
}

export class FontAwesomeIconItemRenderer implements ItemRenderer<{ icon?: string }> {
    render(item: Item<{ icon?: string }>): JSX.Element {
        return <>
            <i className={item.renderData.icon}></i>
            {item.link ? <Link to={item.link}>{item.text}</Link> : <>{item.text}</>}
        </>
    }
}