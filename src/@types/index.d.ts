/**
 * アプリケーション固有の型
 */
import * as cinerinoapi from '@cinerino/api-nodejs-client';
import * as express from 'express';

import User from '../app/user';

declare global {
    namespace Express {
        export interface IRequestProject { typeOf: cinerinoapi.factory.organizationType.Project; id: string; }

        // tslint:disable-next-line:interface-name
        export interface Request {
            project?: IRequestProject;
            user: User;
        }
    }
}
