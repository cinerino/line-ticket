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
/**
 * LINE Webhookコントローラー
 */
const line = require("@line/bot-sdk");
const createDebug = require("debug");
const querystring = require("querystring");
const MessageController = require("./webhook/message");
const ImageMessageController = require("./webhook/message/image");
const PostbackController = require("./webhook/postback");
const debug = createDebug('cinerino-line-ticket:*');
const client = new line.Client({
    channelAccessToken: process.env.LINE_BOT_CHANNEL_ACCESS_TOKEN,
    channelSecret: process.env.LINE_BOT_CHANNEL_SECRET
});
/**
 * メッセージが送信されたことを示すEvent Objectです
 */
// tslint:disable-next-line:max-func-body-length
function message(event, user) {
    return __awaiter(this, void 0, void 0, function* () {
        // const userId = <string>event.source.userId;
        try {
            switch (event.message.type) {
                case 'text':
                    const messageText = event.message.text;
                    switch (true) {
                        // [購入番号]で検索
                        case /^\d{6}$/.test(messageText):
                            yield MessageController.askReservationEventDate(event.replyToken, messageText);
                            break;
                        // ログアウト
                        case /^logout$/.test(messageText):
                            yield MessageController.logout(event.replyToken, user);
                            break;
                        case /^座席予約$/.test(messageText):
                            yield MessageController.showSeatReservationMenu(event.replyToken);
                            break;
                        case /^クレジットカード$/.test(messageText):
                            yield MessageController.showCreditCardMenu(event.replyToken);
                            break;
                        case /^コイン$/.test(messageText):
                            yield MessageController.showCoinAccountMenu(event.replyToken, user);
                            break;
                        // 顔写真登録
                        case /^顔写真登録$/.test(messageText):
                            yield MessageController.startIndexingFace(event.replyToken);
                            break;
                        // 友達決済承認ワンタイムメッセージ
                        case /^FriendPayToken/.test(messageText):
                            const token = messageText.replace('FriendPayToken.', '');
                            yield MessageController.askConfirmationOfFriendPay(event.replyToken, token);
                            break;
                        // おこづかいをもらう
                        case /^おこづかい$/.test(messageText):
                            yield MessageController.selectWhomAskForMoney(event.replyToken, user);
                            break;
                        // おこづかい承認メッセージ
                        case /^TransferMoneyToken/.test(messageText):
                            const transferMoneyToken = messageText.replace('TransferMoneyToken.', '');
                            yield MessageController.askConfirmationOfTransferMoney(event.replyToken, user, transferMoneyToken);
                            break;
                        // メッセージで強制的にpostbackイベントを発動
                        case /^postback:/.test(messageText):
                            const postbackData = messageText.replace('postback:', '');
                            const postbackEvent = {
                                type: 'postback',
                                timestamp: event.timestamp,
                                source: event.source,
                                postback: { data: postbackData },
                                replyToken: event.replyToken
                            };
                            yield postback(postbackEvent, user);
                            break;
                        default:
                            // 予約照会方法をアドバイス
                            yield MessageController.pushHowToUse(event.replyToken);
                    }
                    break;
                case 'image':
                    yield ImageMessageController.indexFace(user, event.message.id);
                    break;
                default:
                    throw new Error(`Unknown message type ${event.message.type}`);
            }
        }
        catch (error) {
            // エラーメッセージ表示
            yield client.replyMessage(event.replyToken, {
                type: 'text',
                text: error.toString()
            });
        }
    });
}
exports.message = message;
/**
 * イベントの送信元が、template messageに付加されたポストバックアクションを実行したことを示すevent objectです
 */
// tslint:disable-next-line:cyclomatic-complexity max-func-body-length
function postback(event, user) {
    return __awaiter(this, void 0, void 0, function* () {
        const data = querystring.parse(event.postback.data);
        debug('data:', data);
        try {
            switch (data.action) {
                // イベント検索
                case 'searchEventsByDate':
                    let date = '';
                    if (event.postback.params !== undefined && event.postback.params.date !== undefined) {
                        date = event.postback.params.date;
                    }
                    else {
                        date = data.date;
                    }
                    yield PostbackController.searchEventsByDate({
                        replyToken: event.replyToken,
                        user: user,
                        date: date
                    });
                    break;
                case 'askScreeningEvent':
                    yield PostbackController.askScreeningEvent({
                        replyToken: event.replyToken,
                        user: user,
                        screeningEventSeriesId: data.screeningEventSeriesId,
                        date: data.date
                    });
                    break;
                // 決済コードをたずねる
                case 'askPaymentCode':
                    yield PostbackController.askPaymentCode({
                        replyToken: event.replyToken,
                        user: user,
                        transactionId: data.transactionId
                    });
                    break;
                // 決済方法選択
                case 'selectPaymentMethodType':
                    yield PostbackController.selectPaymentMethodType({
                        replyToken: event.replyToken,
                        user: user,
                        paymentMethodType: data.paymentMethod,
                        transactionId: data.transactionId,
                        code: data.code
                    });
                    break;
                // 注文確定
                case 'confirmOrder':
                    yield PostbackController.confirmOrder({
                        replyToken: event.replyToken,
                        user: user,
                        transactionId: data.transactionId
                    });
                    break;
                // 友達決済承認確定
                case 'confirmFriendPay':
                    yield PostbackController.confirmFriendPay({
                        replyToken: event.replyToken,
                        user: user,
                        token: data.token
                    });
                    break;
                // おこづかい承認確定
                case 'confirmTransferMoney':
                    yield PostbackController.confirmTransferMoney({
                        replyToken: event.replyToken,
                        user: user,
                        token: data.token,
                        price: parseInt(data.price, 10)
                    });
                    break;
                // 友達決済承認確定
                // case 'continueTransactionAfterFriendPayConfirmation':
                //     await PostbackController.selectPaymentMethodType(
                //         user, 'FriendPay', <string>data.transactionId, parseInt(<string>data.price, 10));
                //     break;
                // クレジットカード検索
                case 'searchCreditCards':
                    yield PostbackController.searchCreditCards({
                        replyToken: event.replyToken,
                        user: user
                    });
                    break;
                // クレジットカード追加
                case 'addCreditCard':
                    yield PostbackController.addCreditCard({
                        replyToken: event.replyToken,
                        user: user,
                        token: data.token
                    });
                    break;
                // クレジットカード削除
                case 'deleteCreditCard':
                    yield PostbackController.deleteCreditCard({
                        replyToken: event.replyToken,
                        user: user,
                        cardSeq: data.cardSeq
                    });
                    break;
                // 口座開設
                case 'openAccount':
                    yield PostbackController.openAccount({
                        replyToken: event.replyToken,
                        user: user,
                        name: data.name,
                        accountType: data.accountType
                    });
                    break;
                // 口座解約
                case 'closeAccount':
                    yield PostbackController.closeAccount({
                        replyToken: event.replyToken,
                        user: user,
                        accountType: data.accountType,
                        accountNumber: data.accountNumber
                    });
                    break;
                // コイン口座検索
                case 'searchCoinAccounts':
                    yield PostbackController.searchCoinAccounts({
                        replyToken: event.replyToken,
                        user: user
                    });
                    break;
                case 'searchAccountMoneyTransferActions':
                    yield PostbackController.searchAccountMoneyTransferActions({
                        replyToken: event.replyToken,
                        user: user,
                        accountType: data.accountType,
                        accountNumber: data.accountNumber
                    });
                    break;
                // 口座入金金額選択
                case 'selectDepositAmount':
                    yield PostbackController.selectDepositAmount({
                        replyToken: event.replyToken,
                        user: user,
                        accountType: data.accountType,
                        accountNumber: data.accountNumber
                    });
                    break;
                // 口座入金金額選択
                case 'depositCoinByCreditCard':
                    yield PostbackController.depositCoinByCreditCard({
                        replyToken: event.replyToken,
                        user: user,
                        amount: Number(data.amount),
                        accountType: data.accountType,
                        toAccountNumber: data.toAccountNumber
                    });
                    break;
                case 'askEventStartDate':
                    yield MessageController.askEventStartDate(event.replyToken);
                    break;
                case 'searchScreeningEventReservations':
                    yield PostbackController.searchScreeningEventReservations({
                        replyToken: event.replyToken,
                        user: user
                    });
                    break;
                // 座席選択
                case 'selectSeatOffers':
                    const seatNumbers = data.seatNumbers.split(',');
                    yield PostbackController.selectSeatOffers({
                        replyToken: event.replyToken,
                        user: user,
                        eventId: data.eventId,
                        seatNumbers: seatNumbers
                    });
                    break;
                // 所有権コード発行
                case 'authorizeOwnershipInfo':
                    yield PostbackController.authorizeOwnershipInfo({
                        replyToken: event.replyToken,
                        user: user,
                        goodType: data.goodType,
                        identifier: data.identifier
                    });
                    break;
                default:
            }
        }
        catch (error) {
            console.error(error);
            // エラーメッセージ表示
            yield client.replyMessage(event.replyToken, {
                type: 'text',
                text: error.toString()
            });
        }
    });
}
exports.postback = postback;
/**
 * イベント送信元に友だち追加（またはブロック解除）されたことを示すEvent Objectです
 */
function follow(event) {
    return __awaiter(this, void 0, void 0, function* () {
        debug('event is', event);
    });
}
exports.follow = follow;
/**
 * イベント送信元にブロックされたことを示すevent objectです
 */
function unfollow(event) {
    return __awaiter(this, void 0, void 0, function* () {
        debug('event is', event);
    });
}
exports.unfollow = unfollow;
/**
 * イベントの送信元グループまたはトークルームに参加したことを示すevent objectです
 */
function join(event) {
    return __awaiter(this, void 0, void 0, function* () {
        debug('event is', event);
    });
}
exports.join = join;
/**
 * イベントの送信元グループから退出させられたことを示すevent objectです
 */
function leave(event) {
    return __awaiter(this, void 0, void 0, function* () {
        debug('event is', event);
    });
}
exports.leave = leave;
/**
 * イベント送信元のユーザがLINE Beaconデバイスの受信圏内に出入りしたことなどを表すイベントです
 */
function beacon(event) {
    return __awaiter(this, void 0, void 0, function* () {
        debug('event is', event);
    });
}
exports.beacon = beacon;
