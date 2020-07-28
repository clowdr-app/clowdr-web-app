import * as React from 'react';
import {
    Avatar,
    Button,
    Card,
    Form,
    Input,
    List,
    Modal,
    Radio,
    Space,
    Spin,
    Tabs,
    Row,
    Col,
    Table,
    Tag,
    Checkbox
} from "antd";
import Firebase from '../../Firebase/firebase';
import { CheckboxChangeEvent } from 'antd/lib/checkbox';

interface EditUserProps {
    firebase: Firebase;
    user: any;  // TS: Refine it!
    match: {params: {userID: string}};     // TS: Guessing.  And this type should be named somewhere!
}

interface EditUserState {
    loading: boolean,
    username?: string;
    email?: string;
    affiliation?: string;
    updating?: boolean;
    passwordOne?: string,
    passwordTwo?: string,
    isAdmin?: boolean,
    error?: {message: string},
}

export default class EditUser extends React.Component<EditUserProps,EditUserState> {
    // @ts-ignore    TS: Suppressing error about possible non-initialization
    userRef: firebase.database.Reference;   // TS: Also call it usersRef?
    // TS: Where do these get initialized??
    onChange: any;
    onChangeCheckbox: ((e: CheckboxChangeEvent) => void) | undefined;
    onSubmit: ((event: MouseEvent) => void) | undefined;
    constructor(props: EditUserProps) {
        super(props);
        this.state={loading:true};
        // @Jon/Crista: I don't understand this bit of code -- looks to TS (and me) like userRef is not always initialized...?
        if(!this.props.match){
            return;
        }
        this.userRef = this.props.firebase.db.ref("users").child(this.props.match.params.userID);

    }
    componentDidMount() {
        this.userRef.once("value").then((val) => {
            let data = val.val();
            this.setState({
                loading: false,
                username: data.username,
                email: data.email,
                affiliation: data.affiliation
            });
        });
    }
    updateUser() {
        this.setState({updating: true});
        this.userRef.update({
            affiliation: this.state.affiliation,
            username: this.state.username
        }).then(async () => {
            if (this.state.isAdmin) {
                await this.userRef.child("roles").child("ADMIN").set("ADMIN");
            } else {
                await this.userRef.child("roles").child("ADMIN").remove();
            }
            this.setState({updating: false});
        });
    }
    componentWillUnmount() {
        this.userRef.off("value");
    }

    render() {
        if(this.state.loading)
            return <Spin>Loading...</Spin>
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
                  // @ts-ignore
                  size={100}>    // @Jon/@Crista: TS: Possible type error: 100 should be a SizeType, which is defined as: 
                                 // "small" | "middle" | "large" | undefined
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
                        disabled={true}
                        type="text"
                        onChange={this.onChange}/>
                </Form.Item>
                <Form.Item
                    label="Affiliation">
                    <Input
                        name="affiliation"
                        value={this.state.affiliation}
                        disabled={this.state.updating}
                        type="text"
                        onChange={this.onChange}/>
                </Form.Item>
                <Form.Item label="Profile Photo">
                    {/* @ts-ignore     TS: Not sure what the problem is here: */}
                    <Avatar user={this.props.user} firebase={this.props.firebase}
                            imageURL={this.props.firebase.auth.currentUser.photoURL}/>
                </Form.Item>
                <Form.Item
                    label="Admin"
                ><Checkbox
                    disabled={this.state.updating}
                    name="isAdmin"
                    // type="checkbox"     // @Jon: The typechecker complained about this
                    checked={isAdmin}
                    onChange={this.onChangeCheckbox}
                />
                </Form.Item>
                {/* @ts-ignore    TS: This error is about different event types... */}
                <Button type="primary" htmlType="submit" disabled={isInvalid} onClick={this.onSubmit}
                        loading={this.state.updating}>
                    Save
                </Button>

                {error && <p>{error.message}</p>}
            </Form>);
    }

}
