import React from "react";

export default class LandingContainer extends React.Component {
    constructor(props) {
        super(props);
        let backgroundImgID = Number(localStorage.getItem("backgroundImgID"));
        backgroundImgID++;
        if (backgroundImgID > 6) {
            backgroundImgID = 1;
        }
        localStorage.setItem("backgroundImgID", backgroundImgID);
        this.state = { backgroundImgID: backgroundImgID };

    }

    render() {

        return (
            <header
                style={{
                    height: "100vh",
                    backgroundImage: "url(/backgrounds/background" + this.state.backgroundImgID + ".jpg)"
                }}>
                {this.props.children}
            </header>
        );
    }

}
