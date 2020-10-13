import React from "react";
import { Link } from "react-router-dom";
import { Item, ItemRenderer } from "./Column";

export class FontAwesomeIconItemRenderer implements ItemRenderer<{ icon?: string }> {
    render(item: Item<{ icon?: string }>): JSX.Element {
        return <>
            <i className={`${item.renderData.icon} column-item__icon`}></i>
            {item.link ? <Link to={item.link}>{item.text}</Link> : <>{item.text}</>}
        </>
    }
}
