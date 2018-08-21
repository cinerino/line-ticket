/**
 * LINEモジュール
 */
// export interface IProfile {
//     displayName: string;
//     userId: string;
//     pictureUrl: string;
//     statusMessage: string;
// }
// import * as createDebug from 'debug';
// import * as request from 'request-promise-native';
// const debug = createDebug('cinerino-line-ticket:*');
// export const URL_PUSH_MESSAGE = 'https://api.line.me/v2/bot/message/push';
/**
 * メッセージ送信
 */
// export async function pushMessage(userId: string, text: string) {
//     // push message
//     await request.post({
//         simple: false,
//         url: URL_PUSH_MESSAGE,
//         auth: { bearer: process.env.LINE_BOT_CHANNEL_ACCESS_TOKEN },
//         json: true,
//         body: {
//             to: userId,
//             messages: [
//                 {
//                     type: 'text',
//                     text: text
//                 }
//             ]
//         }
//     }).promise();
// }
/**
 * メッセージIDからユーザーが送信した画像、動画、および音声のデータを取得する
 */
// export async function getContent(messageId: string) {
//     return request.get({
//         encoding: null,
//         simple: false,
//         url: `https://api.line.me/v2/bot/message/${messageId}/content`,
//         auth: { bearer: <string>process.env.LINE_BOT_CHANNEL_ACCESS_TOKEN }
//     }).promise();
// }
// export async function getProfile(userId: string): Promise<IProfile> {
//     return request.get({
//         simple: true,
//         json: true,
//         url: `https://api.line.me/v2/bot/profile/${userId}`,
//         auth: { bearer: <string>process.env.LINE_BOT_CHANNEL_ACCESS_TOKEN }
//     }).promise();
// }
