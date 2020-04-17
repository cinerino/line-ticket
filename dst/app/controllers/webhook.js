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
function message(event, req) {
    var _a, _b, _c, _d, _e, _f;
    return __awaiter(this, void 0, void 0, function* () {
        const user = req.user;
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
                            yield authentication.sendLoginButton(req);
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
                                project: { id: (_a = req.project) === null || _a === void 0 ? void 0 : _a.id },
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
                                project: { id: (_b = req.project) === null || _b === void 0 ? void 0 : _b.id },
                                replyToken: event.replyToken,
                                user: user
                            });
                            break;
                        case /^クレジットカード$/.test(messageText):
                            yield MessageController.showCreditCardMenu({
                                project: { id: (_c = req.project) === null || _c === void 0 ? void 0 : _c.id },
                                replyToken: event.replyToken,
                                user: user
                            });
                            break;
                        case /^コイン$/.test(messageText):
                            yield MessageController.showCoinAccountMenu({
                                project: { id: (_d = req.project) === null || _d === void 0 ? void 0 : _d.id },
                                replyToken: event.replyToken,
                                user: user
                            });
                            break;
                        case /^コード$/.test(messageText):
                            yield MessageController.showCodeMenu({
                                project: { id: (_e = req.project) === null || _e === void 0 ? void 0 : _e.id },
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
                                project: { id: (_f = req.project) === null || _f === void 0 ? void 0 : _f.id },
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
                            yield postback(postbackEvent, req);
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
function postback(event, req) {
    var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o, _p, _q, _r, _s, _t, _u, _v, _w, _x, _y, _z, _0, _1;
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
                        project: { id: (_a = req.project) === null || _a === void 0 ? void 0 : _a.id },
                        replyToken: event.replyToken,
                        user: req.user,
                        date: date
                    });
                    break;
                case 'askScreeningEvent':
                    yield PostbackController.askScreeningEvent({
                        project: { id: (_b = req.project) === null || _b === void 0 ? void 0 : _b.id },
                        replyToken: event.replyToken,
                        user: req.user,
                        screeningEventSeriesId: data.screeningEventSeriesId,
                        date: data.date
                    });
                    break;
                // 決済コードをたずねる
                case 'askPaymentCode':
                    yield PostbackController.askPaymentCode({
                        project: { id: (_c = req.project) === null || _c === void 0 ? void 0 : _c.id },
                        replyToken: event.replyToken,
                        user: req.user,
                        transactionId: data.transactionId
                    });
                    break;
                case 'selectCreditCard':
                    yield PostbackController.selectCreditCard({
                        project: { id: (_d = req.project) === null || _d === void 0 ? void 0 : _d.id },
                        replyToken: event.replyToken,
                        user: req.user,
                        transactionId: data.transactionId
                    });
                    break;
                // 決済方法選択
                case 'selectPaymentMethodType':
                    yield PostbackController.selectPaymentMethodType({
                        project: { id: (_e = req.project) === null || _e === void 0 ? void 0 : _e.id },
                        replyToken: event.replyToken,
                        user: req.user,
                        paymentMethodType: data.paymentMethod,
                        transactionId: data.transactionId,
                        code: data.code,
                        creditCard: data.creditCard
                    });
                    break;
                // 購入者情報決定
                case 'setCustomerContact':
                    yield PostbackController.setCustomerContact({
                        project: { id: (_f = req.project) === null || _f === void 0 ? void 0 : _f.id },
                        replyToken: event.replyToken,
                        user: req.user,
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
                        project: { id: (_g = req.project) === null || _g === void 0 ? void 0 : _g.id },
                        replyToken: event.replyToken,
                        user: req.user,
                        transactionId: data.transactionId
                    });
                    break;
                // 注文確定
                case 'cancelOrder':
                    yield PostbackController.cancelOrder({
                        project: { id: (_h = req.project) === null || _h === void 0 ? void 0 : _h.id },
                        replyToken: event.replyToken,
                        user: req.user,
                        transactionId: data.transactionId
                    });
                    break;
                // 友達決済承認確定
                case 'confirmFriendPay':
                    yield PostbackController.confirmFriendPay({
                        replyToken: event.replyToken,
                        user: req.user,
                        token: data.token
                    });
                    break;
                // おこづかい承認確定
                case 'confirmTransferMoney':
                    yield PostbackController.confirmTransferMoney({
                        project: { id: (_j = req.project) === null || _j === void 0 ? void 0 : _j.id },
                        replyToken: event.replyToken,
                        user: req.user,
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
                        project: { id: (_k = req.project) === null || _k === void 0 ? void 0 : _k.id },
                        replyToken: event.replyToken,
                        user: req.user
                    });
                    break;
                // クレジットカード追加
                case 'addCreditCard':
                    yield PostbackController.addCreditCard({
                        project: { id: (_l = req.project) === null || _l === void 0 ? void 0 : _l.id },
                        replyToken: event.replyToken,
                        user: req.user,
                        token: data.token
                    });
                    break;
                // クレジットカード削除
                case 'deleteCreditCard':
                    yield PostbackController.deleteCreditCard({
                        project: { id: (_m = req.project) === null || _m === void 0 ? void 0 : _m.id },
                        replyToken: event.replyToken,
                        user: req.user,
                        cardSeq: data.cardSeq
                    });
                    break;
                // 口座開設
                case 'openAccount':
                    yield PostbackController.openAccount({
                        project: { id: (_o = req.project) === null || _o === void 0 ? void 0 : _o.id },
                        replyToken: event.replyToken,
                        user: req.user,
                        name: data.name,
                        accountType: data.accountType
                    });
                    break;
                // 口座解約
                case 'closeAccount':
                    yield PostbackController.closeAccount({
                        project: { id: (_p = req.project) === null || _p === void 0 ? void 0 : _p.id },
                        replyToken: event.replyToken,
                        user: req.user,
                        accountType: data.accountType,
                        accountNumber: data.accountNumber
                    });
                    break;
                // コイン口座検索
                case 'searchCoinAccounts':
                    yield PostbackController.searchCoinAccounts({
                        project: { id: (_q = req.project) === null || _q === void 0 ? void 0 : _q.id },
                        replyToken: event.replyToken,
                        user: req.user
                    });
                    break;
                case 'searchAccountMoneyTransferActions':
                    yield PostbackController.searchAccountMoneyTransferActions({
                        project: { id: (_r = req.project) === null || _r === void 0 ? void 0 : _r.id },
                        replyToken: event.replyToken,
                        user: req.user,
                        accountType: data.accountType,
                        accountNumber: data.accountNumber
                    });
                    break;
                // 口座入金金額選択
                case 'selectDepositAmount':
                    yield PostbackController.selectDepositAmount({
                        replyToken: event.replyToken,
                        user: req.user,
                        accountType: data.accountType,
                        accountNumber: data.accountNumber
                    });
                    break;
                // 口座入金金額選択
                case 'depositCoinByCreditCard':
                    yield PostbackController.depositCoinByCreditCard({
                        project: { id: (_s = req.project) === null || _s === void 0 ? void 0 : _s.id },
                        replyToken: event.replyToken,
                        user: req.user,
                        amount: Number(data.amount),
                        toAccountNumber: data.toAccountNumber
                    });
                    break;
                case 'askEventStartDate':
                    yield MessageController.askEventStartDate({
                        replyToken: event.replyToken,
                        user: req.user
                    });
                    break;
                case 'searchScreeningEventReservations':
                    yield PostbackController.searchScreeningEventReservations({
                        project: { id: (_t = req.project) === null || _t === void 0 ? void 0 : _t.id },
                        replyToken: event.replyToken,
                        user: req.user
                    });
                    break;
                // 座席選択 or 座席数選択
                case 'selectSeatOffers':
                    const seatNumbers = (typeof data.seatNumbers === 'string') ? data.seatNumbers.split(',') : undefined;
                    const numSeats = (typeof data.numSeats === 'string') ? Number(data.numSeats) : undefined;
                    yield PostbackController.selectSeatOffers({
                        project: { id: (_u = req.project) === null || _u === void 0 ? void 0 : _u.id },
                        replyToken: event.replyToken,
                        user: req.user,
                        eventId: data.eventId,
                        seatNumbers: seatNumbers,
                        numSeats: numSeats,
                        offerId: data.offerId
                    });
                    break;
                // 所有権コード発行
                case 'authorizeOwnershipInfo':
                    yield PostbackController.authorizeOwnershipInfo({
                        project: { id: (_v = req.project) === null || _v === void 0 ? void 0 : _v.id },
                        replyToken: event.replyToken,
                        user: req.user,
                        goodType: data.goodType,
                        id: data.id
                    });
                    break;
                // 注文照会
                case 'findOrderByConfirmationNumber':
                    yield PostbackController.findOrderByConfirmationNumber({
                        project: { id: (_w = req.project) === null || _w === void 0 ? void 0 : _w.id },
                        replyToken: event.replyToken,
                        user: req.user,
                        confirmationNumber: Number(data.confirmationNumber),
                        telephone: data.telephone
                    });
                    break;
                // 注文に対して発券
                case 'authorizeOwnershipInfosByOrder':
                    yield PostbackController.authorizeOwnershipInfosByOrder({
                        project: { id: (_x = req.project) === null || _x === void 0 ? void 0 : _x.id },
                        replyToken: event.replyToken,
                        user: req.user,
                        orderNumber: data.orderNumber,
                        telephone: data.telephone
                    });
                    break;
                // 注文検索
                case 'searchOrders':
                    yield PostbackController.searchOrders({
                        project: { id: (_y = req.project) === null || _y === void 0 ? void 0 : _y.id },
                        replyToken: event.replyToken,
                        user: req.user
                    });
                    break;
                // 座席予約コード読み込み
                case 'findScreeningEventReservationById':
                    yield PostbackController.findScreeningEventReservationById({
                        project: { id: (_z = req.project) === null || _z === void 0 ? void 0 : _z.id },
                        replyToken: event.replyToken,
                        user: req.user,
                        code: data.code
                    });
                    break;
                // プロフィール検索
                case 'getProfile':
                    yield PostbackController.getProfile({
                        project: { id: (_0 = req.project) === null || _0 === void 0 ? void 0 : _0.id },
                        replyToken: event.replyToken,
                        user: req.user
                    });
                    break;
                // プロフィール更新
                case 'updateProfile':
                    yield PostbackController.updateProfile({
                        project: { id: (_1 = req.project) === null || _1 === void 0 ? void 0 : _1.id },
                        replyToken: event.replyToken,
                        user: req.user,
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
            yield lineClient_1.default.pushMessage(req.user.userId, { type: 'text', text: text });
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
