import React from "react";
import { Emoji, Picker } from 'emoji-mart'

interface EmojiPickerPopoverProps {
    emojiSelected: ()=>{};
}
interface EmojiPickerPopoverState{
    visible: boolean;
}
export default class EmojiPickerPopover extends React.Component<EmojiPickerPopoverProps, EmojiPickerPopoverState>{
   constructor(props: EmojiPickerPopoverProps) {
       super(props);
       this.state = {visible :false}
   }
   render(): React.ReactElement<any, string | React.JSXElementConstructor<any>> | string | number | {} | React.ReactNodeArray | React.ReactPortal | boolean | null | undefined {
       if(this.state.visible){
           return <div></div>
       }
       return <Emoji emoji="smiley" size={16} />
   }
}