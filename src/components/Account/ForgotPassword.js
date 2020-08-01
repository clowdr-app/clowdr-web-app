import {AuthUserContext} from "../Session";
import React from "react";
import {Alert, Button, Card, Form, Input, message, Spin, Typography} from "antd";
import Parse from "parse";
import {LoadingOutlined} from '@ant-design/icons';
import LandingContainer from "../LandingContainer";

class SlackToVideo extends React.Component {

    constructor(props) {
        super(props);
        this.state = {};
    }

    async componentDidMount() {

        let userID = this.props.match.params.userID;
        let token = this.props.match.params.token;
        try {
            if(!this.props.clowdrAppState.user) {
                this.setState({loading: true});
                let res = await Parse.Cloud.run("login-fromToken", {
                    token: token,
                    userID: userID
                });
                try {
                    let u = await Parse.User.become(res.token);
                    let confQ = new Parse.Query("ClowdrInstance");
                    await this.props.clowdrAppState.refreshUser(null, true);
                    this.setState({loading: false});
                } catch (err) {
                    console.log(err);
                    this.setState({error: "The password reset link that you clicked is not valid. Each successive request for a signin link invalidates the prior links, so please be sure to use the most recent signin link (if you have requested/received multiple)"});
                    //TODO make this prettier
                }
            }
        } catch (err) {
            console.log(err);
        }

    }

    async setPassword(values){
        this.setState({updating: true});
        this.props.clowdrAppState.user.setPassword(values.password);
        this.props.clowdrAppState.user.set("passwordSet",true);
        await this.props.clowdrAppState.user.save();
        message.success("Your password has been updated");
        this.props.history.push("/");

    }

    render() {
        if (this.state.error) {
            return <Alert message="Invalid password reset link" description={this.state.error} type="error"/>
        }
        const antIcon = <LoadingOutlined color="white" style={{ fontSize: 96 }} spin />;

        let password1Rules = [
            {
                required: true,
                message: 'Please input your password!',
            }
        ];
        let password2Rules = [
            {
                required: true,
                message: 'Please confirm your password!',
            },
            ({getFieldValue}) => ({
                validator(rule, value) {
                    if (!value || getFieldValue('password') === value) {
                        return Promise.resolve();
                    }
                    return Promise.reject('The two passwords that you entered do not match!');
                },
            }),
        ];
        const layout = {
            labelCol: {span: 8},
            wrapperCol: {span: 16},
        };
        const tailLayout = {
            wrapperCol: {offset: 8, span: 16},
        };
        if(!this.state.loading){
                let action = <div>

                    <Card title="Reset Your Password for Clowdr.org" style={{maxWidth: "500px", marginLeft:"auto",marginRight:"auto"}}>
                        <Typography.Paragraph>{this.props.clowdrAppState.currentConference.get("conferenceName")} is using Clowdr.org to power its
                        virtual conference. Each attendee has their own profile that lets them customize their virtual
                        conference experience. You are now logged in and can choose a new password.</Typography.Paragraph>
                        <Form       {...layout}
                                    onFinish={this.setPassword.bind(this)}>
                            <Form.Item label="Password"
                                       name="password"
                                       rules={password1Rules}
                                       hasFeedback
                            >
                                <Input.Password placeholder="input password"
                                />
                            </Form.Item>
                            <Form.Item label="Confirm Password"
                                       name="confirm"
                                       rules={password2Rules}
                            >
                                <Input.Password
                                    placeholder="input password"
                                />
                            </Form.Item>
                            <Form.Item {...tailLayout}>
                                <Button type="primary" htmlType="submit" loading={this.state.updating}>
                                    Submit
                                </Button>
                            </Form.Item>
                        </Form></Card>
                </div>
            return <div>
                {action}
            </div>
        }
        return <div id="landing-page">
            <LandingContainer>
                <div className="header-content" style={{top: "33%"}}>
                    <div className="header-content-inner"
                         style={{backgroundColor: "rgba(1,1,1,.5)", maxWidth: "800px"}}>

                        <Typography.Title>Just a minute...</Typography.Title>
                        <div style={{marginLeft: 'auto', marginRight: 'auto'}}>
                            <Spin indicator={antIcon}/>
                        </div>
                    </div>
                </div>
            </LandingContainer>
        </div>
    }
}

const
    AuthConsumer = (props) => (
        <AuthUserContext.Consumer>
            {value => (
                <SlackToVideo {...props} user={value.user} clowdrAppState={value}/>
            )}
        </AuthUserContext.Consumer>
    );

export default AuthConsumer;