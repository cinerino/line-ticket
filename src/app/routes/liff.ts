/**
 * LIFFルーター
 */
import * as express from 'express';
import { URL } from 'url';

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

            if (req.query.identity_provider === 'Google') {
                const signInUrl = new URL(user.generateAuthUrl());
                const googleSignInUrl = `${signInUrl.href}&identity_provider=Google`;
                res.redirect(googleSignInUrl);
            } else {
                res.redirect(user.generateAuthUrl());
            }
        } catch (error) {
            next(error);
        }
    }
);

/**
 * LIFF上でのサインアップ
 */
liffRouter.get(
    '/signUp',
    async (req, res, next) => {
        try {
            const user = new User({
                host: req.hostname,
                userId: req.query.userId,
                state: req.query.state
            });

            const signInUrl = new URL(user.generateAuthUrl());
            const signUpUrl = new URL(signInUrl.href);
            signUpUrl.pathname = 'signup';
            const signUpUri = signUpUrl.href;

            res.redirect(signUpUri);
        } catch (error) {
            next(error);
        }
    }
);

export default liffRouter;
