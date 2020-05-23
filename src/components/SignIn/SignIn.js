import React, {Component} from 'react';
import * as ROUTES from '../../constants/routes';
import {Button, Form, Input} from 'antd';
import Parse from "parse";
import withAuthentication from "../Session/withAuthentication";
import {AuthUserContext} from "../Session";

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
            await Parse.User.logIn(email, password);
            await this.props.refreshUser();
            this.props.history.push(ROUTES.ACCOUNT);

        } catch (e){
            alert(e.message);
        }

    }


    onChange = event => {
        this.setState({[event.target.name]: event.target.value});
    };

    render() {
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
                    </Button></Form.Item>

                {error && <p>{error.message}</p>}
            </Form>
        );
    }
}

const AuthConsumer = (props)=>(
    <AuthUserContext.Consumer>
        {value => (
            <SignIn {...props} user={value.user} refreshUser={value.refreshUser}/>
        )}
    </AuthUserContext.Consumer>
);

export default AuthConsumer;