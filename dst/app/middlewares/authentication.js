"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendLoginButton = void 0;
/**
 * oauthミドルウェア
 * @see https://aws.amazon.com/blogs/mobile/integrating-amazon-cognito-user-pools-with-api-gateway/
 */
const cinerinoapi = require("@cinerino/sdk");
const express_middleware_1 = require("@motionpicture/express-middleware");
const http_status_1 = require("http-status");
const qs = require("qs");
const lineClient_1 = require("../../lineClient");
const user_1 = require("../user");
const LOGIN_REQUIRED = process.env.LOGIN_REQUIRED === '1';
exports.default = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const events = req.body.events;
        const event = events[0];
        if (event === undefined) {
            throw new Error('Invalid request.');
        }
        const userId = event.source.userId;
        if (userId === undefined) {
            next();
            return;
        }
        let state = '';
        try {
            state = JSON.stringify(req.body);
        }
        catch (error) {
            // no op
        }
        req.user = new user_1.default({
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
        const credentials = yield req.user.getCredentials();
        if (credentials === undefined) {
            if (LOGIN_REQUIRED) {
                // ログインボタンを送信
                yield sendLoginButton(req);
                res.status(http_status_1.OK)
                    .send('ok');
            }
            else {
                next();
            }
        }
        else {
            // RedisからBearerトークンを取り出す
            yield express_middleware_1.cognitoAuth({
                issuers: [process.env.CINERINO_TOKEN_ISSUER],
                authorizedHandler: () => __awaiter(void 0, void 0, void 0, function* () {
                    // ログイン状態をセットしてnext
                    req.user.setCredentials(credentials);
                    next();
                }),
                unauthorizedHandler: () => __awaiter(void 0, void 0, void 0, function* () {
                    // ログインボタンを送信
                    yield sendLoginButton(req);
                    res.status(http_status_1.OK)
                        .send('ok');
                }),
                tokenDetecter: () => __awaiter(void 0, void 0, void 0, function* () { return credentials.access_token; })
            })(req, res, next);
        }
    }
    catch (error) {
        next(new cinerinoapi.factory.errors.Unauthorized(error.message));
    }
});
function sendLoginButton(req) {
    var _a;
    return __awaiter(this, void 0, void 0, function* () {
        // tslint:disable-next-line:no-multiline-string
        let text = '一度ログイン後、顔写真を登録すると次回からFace Loginを使用できます';
        // tslint:disable-next-line:max-line-length
        // const cb = `https://${req.user.host}/projects/${req.project?.id}/liff/signIn?${qs.stringify({ userId: req.user.userId, state: req.user.state })}`;
        const cbWithGoogle = `https://${req.user.host}/projects/${(_a = req.project) === null || _a === void 0 ? void 0 : _a.id}/liff/signIn?${qs.stringify({ userId: req.user.userId, state: req.user.state, identity_provider: 'Google' })}`;
        // const liffUri = `line://app/${process.env.LIFF_ID}?${qs.stringify({ cb: cb })}`;
        const liffUriWithGoogle = `line://app/${process.env.LIFF_ID}?${qs.stringify({ cb: cbWithGoogle })}`;
        // const signInUrl = new URL(user.generateAuthUrl());
        // const liffUri = `line://app/${process.env.LIFF_ID}?${qs.stringify({ cb: signInUrl.href })}`;
        // const googleSignInUrl = `${signInUrl.href}&identity_provider=Google`;
        // const googleLiffUri = `line://app/${process.env.LIFF_ID}?${qs.stringify({ cb: googleSignInUrl })}`;
        const actions = [
            // {
            //     type: 'uri',
            //     label: 'Sign In',
            //     uri: liffUri
            // },
            {
                type: 'uri',
                label: 'Sign In with Google',
                uri: liffUriWithGoogle
            }
        ];
        const refreshToken = yield req.user.getRefreshToken();
        const faces = yield req.user.searchFaces();
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
            // const signUpCb =
            // tslint:disable-next-line:max-line-length
            //     `https://${req.user.host}/projects/${req.project?.id}/liff/signUp?${qs.stringify({ userId: req.user.userId, state: req.user.state })}`;
            // const signUpLiffUri = `line://app/${process.env.LIFF_ID}?${qs.stringify({ cb: signUpCb })}`;
            // actions.push({
            //     type: 'uri',
            //     label: '会員登録',
            //     uri: signUpLiffUri
            // });
        }
        const template = {
            type: 'template',
            altText: 'ログインボタン',
            template: {
                type: 'buttons',
                text: text,
                actions: actions
            }
        };
        yield lineClient_1.default.pushMessage(req.user.userId, [template]);
    });
}
exports.sendLoginButton = sendLoginButton;
