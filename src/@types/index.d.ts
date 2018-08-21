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

        interface ITransactionInProgress {
            /**
             * 取引ID
             */
            id: string;
        }

        interface ITransactionGMO {
            orderId: string;
            amount: number;
            count: number;
        }

        // tslint:disable-next-line:interface-name
        export interface Session {
            /**
             * 進行中の取引
             */
            transactionInProgress?: ITransactionInProgress;
            /**
             * 成立した取引結果
             */
            transactionResult?: cinerinoapi.factory.transaction.placeOrder.IResult;
        }
    }
}
