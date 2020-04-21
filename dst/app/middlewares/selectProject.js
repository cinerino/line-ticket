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
/**
 * 顔ログインミドルウェア
 */
const cinerinoapi = require("@cinerino/api-nodejs-client");
// import { OK } from 'http-status';
// import * as qs from 'qs';
// import * as request from 'request-promise-native';
// import LINE from '../../lineClient';
// import User from '../user';
// tslint:disable-next-line:max-func-body-length
exports.default = (__, ___, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        // switch (event.type) {
        //     // 画像が送信されてくれば、顔認証
        //     case 'message':
        //         if (event.message.type === 'image') {
        //             try {
        //                 const faces = await req.user.searchFaces();
        //                 if (faces.length === 0) {
        //                     // 顔登録済でなければメッセージ送信
        //                     await LINE.pushMessage(userId, { type: 'text', text: '顔写真を少なくとも1枚登録してください' });
        //                 } else {
        //                     await LINE.pushMessage(userId, { type: 'text', text: `画像を検証中...${event.message.id}` });
        //                     const content = await LINE.getMessageContent(event.message.id);
        //                     const searchFacesByImageResponse = await req.user.verifyFace(await streamToBuffer(content));
        //                     // const searchFacesByImageResponse = await searchFacesByImage(new Buffer(content));
        //                     if (!Array.isArray(searchFacesByImageResponse.FaceMatches)) {
        //                         await LINE.pushMessage(userId, { type: 'text', text: '類似画像が見つかりませんでした' });
        //                     } else if (searchFacesByImageResponse.FaceMatches.length === 0) {
        //                         await LINE.pushMessage(userId, { type: 'text', text: '類似画像が見つかりませんでした' });
        //                     } else {
        //                         const similarity = searchFacesByImageResponse.FaceMatches[0].Similarity;
        //                         if (similarity === undefined) {
        //                             await LINE.pushMessage(userId, { type: 'text', text: '類似画像が見つかりませんでした' });
        //                         } else if (similarity < FACE_MATCH_THRESHOLD) {
        //                             await LINE.pushMessage(userId, {
        //                                 type: 'text',
        //                                 text: `類似率(${searchFacesByImageResponse.FaceMatches[0].Similarity}%)が低すぎます`
        //                             });
        //                         } else {
        //                             await LINE.pushMessage(userId, {
        //                                 type: 'text',
        //                                 text: `${searchFacesByImageResponse.FaceMatches[0].Similarity}%の確立で一致しました`
        //                             });
        //                             // 一致結果があれば、リフレッシュトークンでアクセストークンを手動更新して、ログイン
        //                             const refreshToken = await req.user.getRefreshToken();
        //                             if (refreshToken === undefined) {
        // tslint:disable-next-line:max-line-length
        //                                 await LINE.pushMessage(userId, { type: 'text', text: 'LINEと会員が結合されていません。一度、IDとパスワードでログインしてください。' });
        //                             } else {
        //                                 req.user.authClient.setCredentials({
        //                                     refresh_token: refreshToken,
        //                                     token_type: 'Bearer'
        //                                 });
        //                                 await req.user.signInForcibly(<any>await req.user.authClient.refreshAccessToken());
        //                                 await LINE.pushMessage(userId, { type: 'text', text: `Hello ${req.user.payload.username}.` });
        //                                 // ログイン前のイベントを強制的に再送信
        //                                 try {
        //                                     const callbackState = await req.user.findCallbackState();
        //                                     if (callbackState !== undefined) {
        //                                         await req.user.deleteCallbackState();
        //                                         await request.post(`https://${req.hostname}/webhook`, {
        //                                             headers: {
        //                                                 'Content-Type': 'application/json'
        //                                             },
        //                                             form: callbackState
        //                                         })
        //                                             .promise();
        //                                     }
        //                                 } catch (error) {
        //                                     await LINE.pushMessage(userId, { type: 'text', text: error.message });
        //                                 }
        //                             }
        //                         }
        //                     }
        //                 }
        //             } catch (error) {
        //                 await LINE.pushMessage(userId, { type: 'text', text: error.message });
        //             }
        //             res.status(OK)
        //                 .send('ok');
        //             return;
        //         }
        //         break;
        //     // face loginイベントであれば、メッセージを送信
        //     case 'postback':
        //         const data = qs.parse(event.postback.data);
        //         if (data.action === 'loginByFace') {
        //             // ログイン前のstateを保管
        //             await req.user.saveCallbackState(<string>data.state);
        //             await LINE.pushMessage(userId, { type: 'text', text: '顔写真を送信してください' });
        //             res.status(OK)
        //                 .send('ok');
        //             return;
        //         }
        //         break;
        //     default:
        // }
        next();
    }
    catch (error) {
        next(new cinerinoapi.factory.errors.Unauthorized(error.message));
    }
});
