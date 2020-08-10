import React from 'react';
import 'antd/dist/antd.css';
import {message, Upload} from 'antd';
import {LoadingOutlined, PlusOutlined} from '@ant-design/icons';
import {RcFile, UploadChangeParam} from 'antd/lib/upload/interface';
import Parse from "parse";

interface Props {  //TS:  from Acccount.tsx, not from ClowdrTypes
    userProfile: Parse.Object
}

interface State {
    loading: boolean;
    imageUrl: string | undefined;
}

interface Request {  //TS: According to rc-upload, customRequest callback is passed an object with the following props
    data: object
    filename: string
    file: File
    withCredentials: boolean
    action: string
    headers: object
}

function beforeUpload(file: RcFile): boolean {
    const isJpgOrPng: boolean = file.type === 'image/jpeg' || file.type === 'image/png';
    if (!isJpgOrPng) {
        message.error('You can only upload JPG/PNG file!');
    }
    const isLt2M: boolean = file.size / 1024 / 1024 < 2;
    if (!isLt2M) {
        message.error('Image must be smaller than 2MB!');
    }
    return isJpgOrPng && isLt2M;
}

class Avatar extends React.Component<Props, State> {
    state = {
        loading: false,
        imageUrl: this.props.userProfile && this.props.userProfile.get("profilePhoto") ? this.props.userProfile.get("profilePhoto").url() : undefined
    };

    handleChange = (info: UploadChangeParam) => {
        if (info.file.status === 'uploading') {
            this.setState({loading: true});
            return;
        }
        if (info.file.status === 'done') {
            message.success(`${info.file.name} file uploaded successfully`);
        } else if (info.file.status === 'error') {
            message.error(`${info.file.name} file upload failed.`);
        }
    };

    upload(req: Request) {
        let name: string;
        if (req.file.type === 'image/jpeg')
            name = "profilePicture.jpg";
        else
            name = "profilePicture.png";
        let file: Parse.File = new Parse.File(name, req.file);
        file.save().then(()=>{
            this.props.userProfile.set("profilePhoto", file);
            this.props.userProfile.save();
            this.setState({
                imageUrl: file.url(),
                loading: false,
            });
        }).catch((err: Error)=>{
            console.log(err);
        });
    }

    render() {
        const uploadButton: JSX.Element = (
            <div>
                {this.state.loading ? <LoadingOutlined/> : <PlusOutlined/>}
                <div className="ant-upload-text">Upload</div>
            </div>
        );
        
        /*TS: The two imageUrl have different types. Could we just use this.state.imageUrl in <Upload>?*/
        // let imageUrl: Parse.File|string|undefined = this.props.userProfile.get("profilePhoto");
        // if(imageUrl && typeof imageUrl !== 'string'){
        //     imageUrl = imageUrl.url();
        // }

        return (
            <Upload
                name="avatar"
                listType="picture-card"
                className="avatar-uploader"
                showUploadList={false}
                customRequest={this.upload.bind(this)}
                beforeUpload={beforeUpload}
                onChange={this.handleChange}
            >
                {this.state.imageUrl ? <img src={this.state.imageUrl} alt="avatar" style={{width: '100%'}}/> : uploadButton}
                {/*{imageUrl ? <img src={imageUrl} alt="avatar" style={{width: '100%'}}/> : uploadButton}*/}
            </Upload>
        );
    }
}

export default Avatar;