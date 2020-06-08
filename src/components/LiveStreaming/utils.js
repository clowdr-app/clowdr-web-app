const LiveVideoSourceMappings = {
    YouTube : {
        url : "https://www.youtube.com/embed/",
        vars : {
            mute : 1,
            autoplay : 1,
            version: 3,
            enablejsapi: 1
        }
    },
    Twitch : {
        url : "https://player.twitch.com/",
        vars : {
            mute : 1,
            autoplay : 1
        }
    }
}

export function videoURLFromData(src, id) {
//    console.log("videoURLFromData " + src + " " + id);
    const queryVars = Object.keys(LiveVideoSourceMappings[src].vars);
    const video_url = LiveVideoSourceMappings[src].url + id + '?' + queryVars.map(k => `${k}=${LiveVideoSourceMappings[src].vars[k]}&`).join('');
    console.log(video_url);
    return video_url;
}

