import React, {Component} from 'react';
import * as ROUTES from '../../constants/routes';
import * as ROLES from '../../constants/roles';
import {Button, Checkbox, Form, Input} from 'antd';

import Parse from "parse";

const ERROR_CODE_ACCOUNT_EXISTS = 'auth/email-already-in-use';

const ERROR_MSG_ACCOUNT_EXISTS = `
  An account with this E-Mail address already exists.
  Try to login with this account instead. If you think the
  account is already used from one of the social logins, try
  to sign in with one of them. Afterward, associate your accounts
  on your personal account page.
`;
const INITIAL_STATE = {
    username: '',
    email: '',
    passwordOne: '',
    passwordTwo: '',
    isAdmin: false,
    error: null,
};

class SignUp extends Component {
    constructor(props) {
        super(props);

        this.state = {...INITIAL_STATE};

    }

    async componentDidMount() {
        let user = await Parse.User.currentAsync();
        if(user){
            Parse.User.logOut();
        }
    }

    onSubmit = event => {
        const {username, email, passwordOne, isAdmin} = this.state;
        const roles = {};

        let user = new Parse.User();
        user.set("username", email);
        user.set("displayname",username);
        user.set("password", passwordOne);
        user.set("email", email);

        user.signUp().then(()=>{
            this.props.history.push(ROUTES.ACCOUNT);
        }).catch((error)=> {
            // Show the error message somewhere and let the user try again.
            alert("Error: " + error.code + " " + error.message);
            this.setState({error});
        });
        event.preventDefault();
    };

    onChange = event => {
        this.setState({[event.target.name]: event.target.value});
    };

    onChangeCheckbox = event => {
        this.setState({[event.target.name]: event.target.checked});
    };

    render() {
        const {
            username,
            email,
            passwordOne,
            passwordTwo,
            isAdmin,
            error,
        } = this.state;

        const isInvalid =
            passwordOne !== passwordTwo ||
            passwordOne === '' ||
            email === '' ||
            username === '';
        return (
            <Form onFinish={this.onSubmit} labelCol={{
                span: 4,
            }}
                  wrapperCol={{
                      span: 14,
                  }}
                  layout="horizontal"
                  initialValues={{
                      size: 50,
                  }}
                  size={100}>
                <Form.Item
                    label="Full Name"
                    rules={[
                        {
                            required: true,
                            message: 'Please input your full name',
                        },
                    ]}
                ><Input name="username" value={username} onChange={this.onChange}/></Form.Item>
                <Form.Item
                    label="Email Address"
                    rules={[
                        {
                            required: true,
                            message: 'Please input your email',
                        },
                    ]}
                >
                    <Input
                        name="email"
                        value={email}
                        type="text"
                        onChange={this.onChange}/>
                </Form.Item>
                <Form.Item
                    label="Password"
                    rules={[
                        {
                            required: true,
                            message: 'Please enter a password',
                        },
                    ]}
                >
                    <Input.Password

                        name="passwordOne"
                        value={passwordOne}
                        onChange={this.onChange}/>
                </Form.Item>
                <Form.Item
                    label="Confirm Password"
                    rules={[
                        {
                            required: true,
                            message: 'Please enter a password',
                        },
                    ]}
                >
                    <Input.Password

                        name="passwordTwo"
                        value={passwordTwo}
                        onChange={this.onChange}
                    />
                </Form.Item>

                <Button type="primary" htmlType="submit" disabled={isInvalid} onClick={this.onSubmit}>
                    Sign Up
                </Button>

                {error && <p>{error.message}</p>}
            </Form>
        );
    }
}

export default SignUp
