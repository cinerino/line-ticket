/**
 * middlewares/authenticationにて、expressのrequestオブジェクトにAPIユーザー情報を追加している
 * ユーザーの型をここで定義しています
 */
import * as cinerinoapi from '@cinerino/api-nodejs-client';
import * as express from 'express';

import User from '../app/user';
declare global {
    namespace Express {
        // tslint:disable-next-line:interface-name
        export interface Request {
            user: User;
        }
    }
}
