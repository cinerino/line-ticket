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
const createDebug = require("debug");
const qs = require("qs");
const lineClient_1 = require("../../lineClient");
const MessageController = require("./webhook/message");
const ImageMessageController = require("./webhook/message/image");
const PostbackController = require("./webhook/postback");
const authentication = require("../middlewares/authentication");
const debug = createDebug('cinerino-line-ticket:controllers');
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
                            yield MessageController.askReservationEventDate({
                                replyToken: event.replyToken,
                                user: user,
                                paymentNo: messageText
                            });
                            break;
                        // ログイン
                        case /^login$/.test(messageText):
                            yield authentication.sendLoginButton(user);
                            break;
                        // ログアウト
                        case /^logout$/.test(messageText):
                            yield MessageController.logout({
                                replyToken: event.replyToken,
                                user: user
                            });
                            break;
                        // プロフィール管理
                        case /^プロフィール/.test(messageText):
                            yield MessageController.showProfileMenu({
                                replyToken: event.replyToken,
                                user: user
                            });
                            break;
                        // ログアウト
                        case /^座席予約$/.test(messageText):
                            yield MessageController.showSeatReservationMenu({
                                replyToken: event.replyToken,
                                user: user
                            });
                            break;
                        case /^注文$/.test(messageText):
                            yield MessageController.showOrderMenu({
                                replyToken: event.replyToken,
                                user: user
                            });
                            break;
                        case /^クレジットカード$/.test(messageText):
                            yield MessageController.showCreditCardMenu({
                                replyToken: event.replyToken,
                                user: user
                            });
                            break;
                        case /^コイン$/.test(messageText):
                            yield MessageController.showCoinAccountMenu({
                                replyToken: event.replyToken,
                                user: user
                            });
                            break;
                        case /^コード$/.test(messageText):
                            yield MessageController.showCodeMenu({
                                replyToken: event.replyToken,
                                user: user
                            });
                            break;
                        // 顔写真登録
                        case /^顔写真登録$/.test(messageText):
                            yield MessageController.startIndexingFace({
                                replyToken: event.replyToken,
                                user: user
                            });
                            break;
                        // 友達決済承認ワンタイムメッセージ
                        case /^FriendPayToken/.test(messageText):
                            const token = messageText.replace('FriendPayToken.', '');
                            yield MessageController.askConfirmationOfFriendPay({
                                replyToken: event.replyToken,
                                user: user,
                                token: token
                            });
                            break;
                        // おこづかいをもらう
                        case /^おこづかい$/.test(messageText):
                            yield MessageController.selectWhomAskForMoney({
                                replyToken: event.replyToken,
                                user: user
                            });
                            break;
                        // おこづかい承認メッセージ
                        case /^TransferMoneyToken/.test(messageText):
                            const transferMoneyToken = messageText.replace('TransferMoneyToken.', '');
                            yield MessageController.askConfirmationOfTransferMoney({
                                replyToken: event.replyToken,
                                user: user,
                                transferMoneyToken: transferMoneyToken
                            });
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
                            yield MessageController.pushHowToUse({
                                replyToken: event.replyToken,
                                user: user
                            });
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
            const text = `${error.name} ${error.message}`;
            // let text: string = `${error.name} ${error.message}`;
            try {
                // text = JSON.stringify(error);
            }
            catch (error) {
                // no op
            }
            yield lineClient_1.default.pushMessage(user.userId, { type: 'text', text: text });
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
        const data = qs.parse(event.postback.data, {
            arrayLimit: 1000,
            parseArrays: true,
            plainObjects: true,
            allowDots: false
        });
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
                case 'selectCreditCard':
                    yield PostbackController.selectCreditCard({
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
                        code: data.code,
                        creditCard: data.creditCard
                    });
                    break;
                // 購入者情報決定
                case 'setCustomerContact':
                    yield PostbackController.setCustomerContact({
                        replyToken: event.replyToken,
                        user: user,
                        transactionId: data.transactionId,
                        familyName: data.familyName,
                        givenName: data.givenName,
                        email: data.email,
                        telephone: data.telephone
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
                // 注文確定
                case 'cancelOrder':
                    yield PostbackController.cancelOrder({
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
                    yield MessageController.askEventStartDate({
                        replyToken: event.replyToken,
                        user: user
                    });
                    break;
                case 'searchScreeningEventReservations':
                    yield PostbackController.searchScreeningEventReservations({
                        replyToken: event.replyToken,
                        user: user
                    });
                    break;
                // 座席選択 or 座席数選択
                case 'selectSeatOffers':
                    const seatNumbers = (typeof data.seatNumbers === 'string') ? data.seatNumbers.split(',') : undefined;
                    const numSeats = (typeof data.numSeats === 'string') ? Number(data.numSeats) : undefined;
                    yield PostbackController.selectSeatOffers({
                        replyToken: event.replyToken,
                        user: user,
                        eventId: data.eventId,
                        seatNumbers: seatNumbers,
                        numSeats: numSeats,
                        offerId: data.offerId
                    });
                    break;
                // 所有権コード発行
                case 'authorizeOwnershipInfo':
                    yield PostbackController.authorizeOwnershipInfo({
                        replyToken: event.replyToken,
                        user: user,
                        goodType: data.goodType,
                        id: data.id
                    });
                    break;
                // 注文照会
                case 'findOrderByConfirmationNumber':
                    yield PostbackController.findOrderByConfirmationNumber({
                        replyToken: event.replyToken,
                        user: user,
                        confirmationNumber: Number(data.confirmationNumber),
                        telephone: data.telephone
                    });
                    break;
                // 注文に対して発券
                case 'authorizeOwnershipInfosByOrder':
                    yield PostbackController.authorizeOwnershipInfosByOrder({
                        replyToken: event.replyToken,
                        user: user,
                        orderNumber: data.orderNumber,
                        telephone: data.telephone
                    });
                    break;
                // 注文検索
                case 'searchOrders':
                    yield PostbackController.searchOrders({
                        replyToken: event.replyToken,
                        user: user
                    });
                    break;
                // 座席予約コード読み込み
                case 'findScreeningEventReservationById':
                    yield PostbackController.findScreeningEventReservationById({
                        replyToken: event.replyToken,
                        user: user,
                        code: data.code
                    });
                    break;
                // プロフィール検索
                case 'getProfile':
                    yield PostbackController.getProfile({
                        replyToken: event.replyToken,
                        user: user
                    });
                    break;
                // プロフィール更新
                case 'updateProfile':
                    yield PostbackController.updateProfile({
                        replyToken: event.replyToken,
                        user: user,
                        profile: data.profile
                    });
                    break;
                default:
            }
        }
        catch (error) {
            const text = `${error.name} ${error.message}`;
            // let text: string = `${error.name} ${error.message}`;
            try {
                // text = JSON.stringify(error);
            }
            catch (error) {
                // no op
            }
            yield lineClient_1.default.pushMessage(user.userId, { type: 'text', text: text });
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
