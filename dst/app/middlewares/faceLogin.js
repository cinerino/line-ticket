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
const http_status_1 = require("http-status");
const qs = require("qs");
const request = require("request-promise-native");
const lineClient_1 = require("../../lineClient");
const user_1 = require("../user");
const FACE_MATCH_THRESHOLD_ENV = process.env.FACE_MATCH_THRESHOLD;
const FACE_MATCH_THRESHOLD = parseInt((FACE_MATCH_THRESHOLD_ENV !== undefined) ? FACE_MATCH_THRESHOLD_ENV : '70', 10);
// tslint:disable-next-line:max-func-body-length
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
        req.user = new user_1.default({
            host: req.hostname,
            userId: userId,
            state: JSON.stringify(req.body)
        });
        // ログイン済であれば次へ
        const credentials = yield req.user.getCredentials();
        if (credentials !== null) {
            next();
            return;
        }
        switch (event.type) {
            // 画像が送信されてくれば、顔認証
            case 'message':
                if (event.message.type === 'image') {
                    try {
                        const faces = yield req.user.searchFaces();
                        if (faces.length === 0) {
                            // 顔登録済でなければメッセージ送信
                            yield lineClient_1.default.pushMessage(userId, { type: 'text', text: '顔写真を少なくとも1枚登録してください' });
                        }
                        else {
                            yield lineClient_1.default.pushMessage(userId, { type: 'text', text: `画像を検証中...${event.message.id}` });
                            const content = yield lineClient_1.default.getMessageContent(event.message.id);
                            const searchFacesByImageResponse = yield req.user.verifyFace(yield streamToBuffer(content));
                            // const searchFacesByImageResponse = await searchFacesByImage(new Buffer(content));
                            if (!Array.isArray(searchFacesByImageResponse.FaceMatches)) {
                                yield lineClient_1.default.pushMessage(userId, { type: 'text', text: '類似画像が見つかりませんでした' });
                            }
                            else if (searchFacesByImageResponse.FaceMatches.length === 0) {
                                yield lineClient_1.default.pushMessage(userId, { type: 'text', text: '類似画像が見つかりませんでした' });
                            }
                            else {
                                const similarity = searchFacesByImageResponse.FaceMatches[0].Similarity;
                                if (similarity === undefined) {
                                    yield lineClient_1.default.pushMessage(userId, { type: 'text', text: '類似画像が見つかりませんでした' });
                                }
                                else if (similarity < FACE_MATCH_THRESHOLD) {
                                    yield lineClient_1.default.pushMessage(userId, {
                                        type: 'text',
                                        text: `類似率(${searchFacesByImageResponse.FaceMatches[0].Similarity}%)が低すぎます`
                                    });
                                }
                                else {
                                    yield lineClient_1.default.pushMessage(userId, {
                                        type: 'text',
                                        text: `${searchFacesByImageResponse.FaceMatches[0].Similarity}%の確立で一致しました`
                                    });
                                    // 一致結果があれば、リフレッシュトークンでアクセストークンを手動更新して、ログイン
                                    const refreshToken = yield req.user.getRefreshToken();
                                    if (refreshToken === null) {
                                        yield lineClient_1.default.pushMessage(userId, { type: 'text', text: 'LINEと会員が結合されていません。一度、IDとパスワードでログインしてください。' });
                                    }
                                    else {
                                        req.user.authClient.setCredentials({
                                            refresh_token: refreshToken,
                                            token_type: 'Bearer'
                                        });
                                        yield req.user.signInForcibly(yield req.user.authClient.refreshAccessToken());
                                        yield lineClient_1.default.pushMessage(userId, { type: 'text', text: `Hello ${req.user.payload.username}.` });
                                        // ログイン前のイベントを強制的に再送信
                                        try {
                                            const callbackState = yield req.user.findCallbackState();
                                            if (callbackState !== null) {
                                                yield req.user.deleteCallbackState();
                                                yield request.post(`https://${req.hostname}/webhook`, {
                                                    headers: {
                                                        'Content-Type': 'application/json'
                                                    },
                                                    form: callbackState
                                                })
                                                    .promise();
                                            }
                                        }
                                        catch (error) {
                                            yield lineClient_1.default.pushMessage(userId, { type: 'text', text: error.message });
                                        }
                                    }
                                }
                            }
                        }
                    }
                    catch (error) {
                        yield lineClient_1.default.pushMessage(userId, { type: 'text', text: error.message });
                    }
                    res.status(http_status_1.OK)
                        .send('ok');
                    return;
                }
                break;
            // face loginイベントであれば、メッセージを送信
            case 'postback':
                const data = qs.parse(event.postback.data);
                if (data.action === 'loginByFace') {
                    // ログイン前のstateを保管
                    yield req.user.saveCallbackState(data.state);
                    yield lineClient_1.default.pushMessage(userId, { type: 'text', text: '顔写真を送信してください' });
                    res.status(http_status_1.OK)
                        .send('ok');
                    return;
                }
                break;
            default:
        }
        next();
    }
    catch (error) {
        next(new cinerinoapi.factory.errors.Unauthorized(error.message));
    }
});
function streamToBuffer(readable) {
    return __awaiter(this, void 0, void 0, function* () {
        return new Promise((resolve, reject) => {
            const buffers = [];
            readable.on('error', reject)
                .on('data', (data) => buffers.push(data))
                .on('end', () => {
                resolve(Buffer.concat(buffers));
            });
        });
    });
}
