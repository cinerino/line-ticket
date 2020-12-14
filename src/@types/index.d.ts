/**
 * アプリケーション固有の型
 */
import * as cinerinoapi from '@cinerino/sdk';
import * as express from 'express';

import User from '../app/user';

declare global {
    namespace Express {
        export interface IRequestProject { typeOf: cinerinoapi.factory.chevre.organizationType.Project; id: string; }

        // tslint:disable-next-line:interface-name
        export interface Request {
            project?: IRequestProject;
            user: User;
        }
    }
}
