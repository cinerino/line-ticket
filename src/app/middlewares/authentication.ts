/**
 * oauthミドルウェア
 * @see https://aws.amazon.com/blogs/mobile/integrating-amazon-cognito-user-pools-with-api-gateway/
 */
import * as cinerinoapi from '@cinerino/api-nodejs-client';
import { TemplateMessage, WebhookEvent } from '@line/bot-sdk';
import { cognitoAuth } from '@motionpicture/express-middleware';
import { NextFunction, Request, Response } from 'express';
import { OK } from 'http-status';
import * as qs from 'qs';
import { URL } from 'url';

import LINE from '../../lineClient';
import User from '../user';

const LOGIN_REQUIRED = process.env.LOGIN_REQUIRED === '1';
export default async (req: Request, res: Response, next: NextFunction) => {
    try {
        const events: WebhookEvent[] = req.body.events;
        const event = events[0];
        if (event === undefined) {
            throw new Error('Invalid request.');
        }

        const userId = event.source.userId;
        if (userId === undefined) {
            next();

            return;
        }

        let state: string = '';
        try {
            state = JSON.stringify(req.body);
        } catch (error) {
            // no op
        }
        req.user = new User({
            host: req.hostname,
            userId: userId,
            state: state
        });

        // ユーザー認証無効化の設定の場合
        if (process.env.USER_REFRESH_TOKEN !== undefined) {
            // ログイン状態をセットしてnext
            req.user.setCredentials({
                access_token: '',
                refresh_token: process.env.USER_REFRESH_TOKEN,
                token_type: 'Bearer'
            });

            next();

            return;
        }

        const credentials = await req.user.getCredentials();
        if (credentials === undefined) {
            if (LOGIN_REQUIRED) {
                // ログインボタンを送信
                await sendLoginButton(req.user);
                res.status(OK)
                    .send('ok');
            } else {
                next();
            }
        } else {
            // RedisからBearerトークンを取り出す
            await cognitoAuth({
                issuers: [<string>process.env.CINERINO_TOKEN_ISSUER],
                authorizedHandler: async () => {
                    // ログイン状態をセットしてnext
                    req.user.setCredentials(credentials);
                    next();
                },
                unauthorizedHandler: async () => {
                    // ログインボタンを送信
                    await sendLoginButton(req.user);
                    res.status(OK)
                        .send('ok');
                },
                tokenDetecter: async () => credentials.access_token
            })(req, res, next);
        }
    } catch (error) {
        next(new cinerinoapi.factory.errors.Unauthorized(error.message));
    }
};

export async function sendLoginButton(user: User) {
    // tslint:disable-next-line:no-multiline-string
    let text = '一度ログイン後、顔写真を登録すると次回からFace Loginを使用できます';
    const signInUrl = new URL(user.generateAuthUrl());
    await LINE.pushMessage(user.userId, { type: 'text', text: `signInUrl:${signInUrl}` });

    const cb = `https://${user.host}/liff/signIn?${qs.stringify({ userId: user.userId, state: user.state })}`;
    await LINE.pushMessage(user.userId, { type: 'text', text: `cb:${cb}` });

    const liffUri = `line://app/${process.env.LIFF_ID}?${qs.stringify({ cb: cb })}`;
    // const liffUri = `line://app/${process.env.LIFF_ID}?${qs.stringify({ cb: signInUrl.href })}`;
    // const googleSignInUrl = `${signInUrl.href}&identity_provider=Google`;
    // const googleLiffUri = `line://app/${process.env.LIFF_ID}?${qs.stringify({ cb: googleSignInUrl })}`;
    const actions: any[] = [
        {
            type: 'uri',
            label: 'Sign In',
            uri: liffUri
            // uri: liffUri
        }
        // {
        //     type: 'uri',
        //     label: 'Sign In with Google',
        //     uri: googleLiffUri
        // }
    ];

    const refreshToken = await user.getRefreshToken();
    const faces = await user.searchFaces();
    // リフレッシュトークン保管済、かつ、顔画像登録済であればFace Login使用可能
    if (refreshToken !== undefined && faces.length > 0) {
        text = 'ログインしてください';
        // actions.push({
        //     type: 'postback',
        //     label: 'Face Login',
        //     data: `action=loginByFace&state=${user.state}`
        // });
        // actions.push({
        //     type: 'uri',
        //     label: 'Face Login',
        //     uri: 'line://nv/camera/'
        // });
    }

    // 会員として未使用であれば会員登録ボタン表示
    if (refreshToken === undefined) {
        await LINE.pushMessage(user.userId, { type: 'text', text: '会員未登録です' });

        const signUpUrl = new URL(signInUrl.href);
        signUpUrl.pathname = 'signup';
        const signUpUri = signUpUrl.href;
        const signUpLiffUri = `line://app/${process.env.LIFF_ID}?${qs.stringify({ cb: signUpUri })}`;
        await LINE.pushMessage(user.userId, { type: 'text', text: `signUpLiffUri:${signUpLiffUri}` });

        // actions.push({
        //     type: 'uri',
        //     label: '会員登録',
        //     uri: signUpLiffUri
        // });
    }

    const template: TemplateMessage = {
        type: 'template',
        altText: 'ログインボタン',
        template: {
            type: 'buttons',
            text: text,
            actions: actions
        }
    };
    await LINE.pushMessage(user.userId, [template]);
}
