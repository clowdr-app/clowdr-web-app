import React, { Component } from 'react';
import * as ROUTES from '../../constants/routes';
import { Button, Form, Input } from 'antd';

import Parse from "parse";

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

        this.state = { ...INITIAL_STATE };
    }

    async componentDidMount() {
        let user = await Parse.User.currentAsync();
        if (user) {
            Parse.User.logOut();
        }
    }

    onSubmit = event => {
        const { username, email, passwordOne } = this.state;

        let user = new Parse.User();
        user.set("username", email);
        user.set("displayName", username);
        user.set("password", passwordOne);
        user.set("email", email);

        user.signUp().then(() => {
            this.props.history.push("/account" /* TODO: Lookup from route match */);
        }).catch((error) => {
            // Show the error message somewhere and let the user try again.
            alert("Error: " + error.code + " " + error.message);
            this.setState({ error });
        });
        event.preventDefault();
    };

    onChange = event => {
        this.setState({ [event.target.name]: event.target.value });
    };

    onChangeCheckbox = event => {
        this.setState({ [event.target.name]: event.target.checked });
    };

    render() {
        const {
            username,
            email,
            passwordOne,
            passwordTwo,
            error,
        } = this.state;

        const isInvalid =
            passwordOne !== passwordTwo ||
            passwordOne === '' ||
            email === '' ||
            username === '';
        if (true) {
            return <div>This page needs to be corrected to make a user profile, enroll user, etc. before it is used again.</div>
        }
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
                ><Input name="username" value={username} onChange={this.onChange} /></Form.Item>
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
                        onChange={this.onChange} />
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
                        onChange={this.onChange} />
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
