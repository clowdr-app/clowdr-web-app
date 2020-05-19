import React from 'react';
import {Button, Checkbox, Form, Input, Spin} from "antd";
import Avatar from "./Avatar";

class Account extends React.Component {
    constructor(props) {
        super(props);
        this.state = {'loading': true};
    }

    componentDidMount() {
        this.setState({
            loading: false,
            username: this.props.user.username,
            email: this.props.user.email
        })
    }

    updateUser() {

    }

    render() {
        if (this.state.loading || !this.props.firebase.auth.currentUser) {
            return (
                <Spin tip="Loading...">
                </Spin>)
        }
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
            <Form onFinish={this.updateUser.bind(this)} labelCol={{
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
                ><Input name="displayName" value={this.state.username} onChange={this.onChange}/></Form.Item>
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
                        value={this.state.email}
                        type="text"
                        onChange={this.onChange}/>
                </Form.Item>
                {/*<Form.Item*/}
                {/*    label="Password"*/}
                {/*    rules={[*/}
                {/*        {*/}
                {/*            required: true,*/}
                {/*            message: 'Please enter a password',*/}
                {/*        },*/}
                {/*    ]}*/}
                {/*>*/}
                {/*    <Input.Password*/}

                {/*        name="passwordOne"*/}
                {/*        value={passwordOne}*/}
                {/*        onChange={this.onChange}/>*/}
                {/*</Form.Item>*/}
                {/*<Form.Item*/}
                {/*    label="Confirm Password"*/}
                {/*    rules={[*/}
                {/*        {*/}
                {/*            required: true,*/}
                {/*            message: 'Please enter a password',*/}
                {/*        },*/}
                {/*    ]}*/}
                {/*>*/}
                {/*    <Input.Password*/}

                {/*        name="passwordTwo"*/}
                {/*        value={passwordTwo}*/}
                {/*        onChange={this.onChange}*/}
                {/*    />*/}
                {/*</Form.Item>*/}
                <Form.Item label="Profile Photo">
                    <Avatar user={this.props.user} firebase={this.props.firebase} imageURL={this.props.firebase.auth.currentUser.photoURL}/>
                </Form.Item>
                <Form.Item
                    label="Admin"
                ><Checkbox

                    name="isAdmin"
                    type="checkbox"
                    checked={isAdmin}
                    onChange={this.onChangeCheckbox}
                />
                </Form.Item>
                <Button type="primary" htmlType="submit" disabled={isInvalid} onClick={this.onSubmit}>
                    Sign Up
                </Button>

                {error && <p>{error.message}</p>}
            </Form>);
    }
}

export default Account;