"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
var MessageType;
(function (MessageType) {
    MessageType["text"] = "text";
    MessageType["image"] = "image";
    MessageType["video"] = "video";
    MessageType["audio"] = "audio";
    MessageType["file"] = "file";
    MessageType["location"] = "location";
    MessageType["sticker"] = "sticker";
})(MessageType = exports.MessageType || (exports.MessageType = {}));
// export interface IProfile {
//     displayName: string;
//     userId: string;
//     pictureUrl: string;
//     statusMessage: string;
// }
// import * as createDebug from 'debug';
const request = require("request-promise-native");
// const debug = createDebug('cinerino-line-ticket:*');
exports.URL_PUSH_MESSAGE = 'https://api.line.me/v2/bot/message/push';
/**
 * メッセージ送信
 */
function pushMessage(userId, text) {
    return __awaiter(this, void 0, void 0, function* () {
        // push message
        yield request.post({
            simple: false,
            url: exports.URL_PUSH_MESSAGE,
            auth: { bearer: process.env.LINE_BOT_CHANNEL_ACCESS_TOKEN },
            json: true,
            body: {
                to: userId,
                messages: [
                    {
                        type: 'text',
                        text: text
                    }
                ]
            }
        }).promise();
    });
}
exports.pushMessage = pushMessage;
/**
 * メッセージIDからユーザーが送信した画像、動画、および音声のデータを取得する
 * @param messageId メッセージID
 */
function getContent(messageId) {
    return __awaiter(this, void 0, void 0, function* () {
        return request.get({
            encoding: null,
            simple: false,
            url: `https://api.line.me/v2/bot/message/${messageId}/content`,
            auth: { bearer: process.env.LINE_BOT_CHANNEL_ACCESS_TOKEN }
        }).promise();
    });
}
exports.getContent = getContent;
// export async function getProfile(userId: string): Promise<IProfile> {
//     return request.get({
//         simple: true,
//         json: true,
//         url: `https://api.line.me/v2/bot/profile/${userId}`,
//         auth: { bearer: <string>process.env.LINE_BOT_CHANNEL_ACCESS_TOKEN }
//     }).promise();
// }
