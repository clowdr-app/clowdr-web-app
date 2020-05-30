import React from 'react';
import Parse from "parse";
import ParseLiveContext from "../parse/context";

class VideoWatchers extends React.Component {
    constructor(props) {
        // props.video and props.expanded available here
        super(props);
        this.state = {
            count: 0
        };
    }

    componentDidUpdate(prevProps, prevState) {
        console.log("componentDidUpdate " + prevProps.expanded + " new " + this.props.expanded);
        if (this.props.expanded !== prevProps.expanded) {
            this.changeCount(this.props.expanded);
            // if (this.props.expanded) {
            //     this.setState({count: this.state.count + 1}, () => {
            //        console.log("Watchers: expanded " + this.state.count);
            //     })
            // } else {
            //     this.setState({count: this.state.count - 1}, () => {
            //         console.log("Watchers: closed " + this.state.count);
            //         this.changeCount(false);
            //     });
            // }
        }
    }

    async changeCount(isIncrement) {
        const name = this.props.video.get("title");
        const WatchersCount = Parse.Object.extend("LiveVideoWatchers");
        let q = new Parse.Query(WatchersCount);
        q.equalTo("name", name);
        console.log("Changing count for " + name);
        const record = await q.first();
        console.log("Updating watchers count for " + name + " " + isIncrement + " " + JSON.stringify(record));
        if (isIncrement)
            record.increment("count");
        else
            record.decrement("count");
        record.save();
    }

    componentDidMount() {
        let q = new Parse.Query("LiveVideoWatchers");
        const name = this.props.video.get("title");
        q.equalTo("name", name);
        this.sub = this.props.parseLive.subscribe(q);
        this.sub.on('update', watchRecord => {
            console.log("Updating watchers count for " + watchRecord.get("name") + " to " + watchRecord.get("count"));
            this.setState({ count: watchRecord.get("count")});
        });
    }

    componentWillUnmount() {
        if(this.sub)
            this.sub.unsubscribe();
    }

    render() {
        return (
            <div>{"Watching now: " + this.state.count}
            </div>
        )
    }
}

const LiveVideoWatchers = (props) => (
    <ParseLiveContext.Consumer>
        {value => (
            <VideoWatchers {...props} parseLive={value}/>
        )}
    </ParseLiveContext.Consumer>
);

export default LiveVideoWatchers;