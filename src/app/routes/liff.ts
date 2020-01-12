/**
 * LIFFルーター
 */
import * as express from 'express';

import User from '../user';

const liffRouter = express.Router();

/**
 * LIFFアプリケーション初期エンドポイント
 */
liffRouter.get(
    '',
    async (req, res, next) => {
        try {
            res.redirect(req.query.cb);
        } catch (error) {
            next(error);
        }
    }
);

/**
 * LIFF上でのサインイン
 */
liffRouter.get(
    '/signIn',
    async (req, res, next) => {
        try {
            const user = new User({
                host: req.hostname,
                userId: req.query.userId,
                state: req.query.state
            });

            res.redirect(user.generateAuthUrl());
        } catch (error) {
            next(error);
        }
    }
);

export default liffRouter;
