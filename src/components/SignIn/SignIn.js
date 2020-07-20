import React, {Component} from 'react';
import * as ROUTES from '../../constants/routes';
import {Button, message, Form, Input, Tooltip} from 'antd';
import Parse from "parse";
import {AuthUserContext} from "../Session";
import GenericLanding from "../GenericLanding";

const INITIAL_STATE = {
    email: '',
    password: '',
    error: null,
};

const ERROR_CODE_ACCOUNT_EXISTS =
    'auth/account-exists-with-different-credential';

const ERROR_MSG_ACCOUNT_EXISTS = `
  An account with an E-Mail address to
  this social account already exists. Try to login from
  this account instead and associate your social accounts on
  your personal account page.
`;
const layout = {
    labelCol: {
        span: 8,
    },
    wrapperCol: {
        span: 16,
    },
};
const tailLayout = {
    wrapperCol: {
        offset: 8,
        span: 16,
    },
};
class SignIn extends Component {
    constructor(props) {
        super(props);

        this.state = {...INITIAL_STATE};
    }

    onSubmit = async (event) => {
        const {email, password} = this.state;
        // event.preventDefault();
        try{
            let user = await Parse.User.logIn(email, password);
            console.log("[SignIn]: User=" + JSON.stringify(user));
            await this.props.refreshUser();
            this.props.history.push("/");
            window.location.reload(false);

        } catch (e){
            alert(e.message);
        }

    }

    componentDidMount() {
        if (process.env.REACT_APP_IS_MINIMAL_UI && !this.props.dontBounce) {
            this.props.authContext.helpers.setGlobalState({showingLanding: true});
        }
    }

    onChange = event => {
        this.setState({[event.target.name]: event.target.value});
    };

    async forgotPassword(){
        console.log(process.env)
        let res = await Parse.Cloud.run("reset-password", {
            email: this.state.email,
            confID: process.env.REACT_APP_DEFAULT_CONFERENCE
        });
        if(res.status == "error")
            message.error(res.message);
        else
            message.success(res.message, 0);

    }
    render() {
        if(process.env.REACT_APP_IS_MINIMAL_UI && !this.props.dontBounce){
            return <div></div>;
        }
        const {email, password, error} = this.state;

        const isInvalid = password === '' || email === '';

        return (
            <Form {...layout} onFinish={this.onSubmit}>
                <Form.Item label={"Email Address"}>
                    <Input
                        name="email"
                        value={email}
                        onChange={this.onChange}
                        type="text"
                    />
                </Form.Item>
                <Form.Item label={"Password"}>
                    <Input.Password
                        name="password"
                        value={password}
                        onChange={this.onChange}
                        type="password"
                    /></Form.Item>
                <Form.Item {...tailLayout}>
                    <Button type="primary" disabled={isInvalid} htmlType="submit">
                        Sign In
                    </Button> <Tooltip mouseEnterDelay={0.5} title="If you have forgotten your password, please enter your email address and click this button to receive a link to reset it."><Button disabled={email === ''} onClick={this.forgotPassword.bind(this)}>
                    Forgot Password
                </Button></Tooltip></Form.Item>

                {error && <p>{error.message}</p>}
            </Form>
        );
    }
}

const AuthConsumer = (props)=>(
    <AuthUserContext.Consumer>
        {value => (
            <SignIn {...props} user={value.user} authContext={value} refreshUser={value.refreshUser}/>
        )}
    </AuthUserContext.Consumer>
);

export default AuthConsumer;
