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
const message_1 = require("./webhook/message");
const image_1 = require("./webhook/message/image");
const postback_1 = require("./webhook/postback");
const authentication = require("../middlewares/authentication");
const debug = createDebug('cinerino-line-ticket:controllers');
/**
 * ウェブフックコントローラ
 */
class WebhookController {
    constructor(req) {
        this.req = req;
    }
    /**
     * メッセージが送信されたことを示すEvent Objectです
     */
    // tslint:disable-next-line:max-func-body-length
    message(event) {
        return __awaiter(this, void 0, void 0, function* () {
            const user = this.req.user;
            // const userId = <string>event.source.userId;
            try {
                switch (event.message.type) {
                    case 'text':
                        const messageController = new message_1.MessageWebhookController(this.req);
                        const messageText = event.message.text;
                        switch (true) {
                            // [購入番号]で検索
                            case /^\d{6}$/.test(messageText):
                                yield messageController.askReservationEventDate({
                                    replyToken: event.replyToken,
                                    paymentNo: messageText
                                });
                                break;
                            // ログイン
                            case /^login$/.test(messageText):
                                yield authentication.sendLoginButton(this.req);
                                break;
                            // ログアウト
                            case /^logout$/.test(messageText):
                                yield messageController.logout({
                                    replyToken: event.replyToken
                                });
                                break;
                            // プロフィール管理
                            case /^プロフィール/.test(messageText):
                                yield messageController.showProfileMenu({
                                    replyToken: event.replyToken
                                });
                                break;
                            // 予約
                            case /予約/.test(messageText):
                                yield messageController.showSeatReservationMenu({
                                    replyToken: event.replyToken
                                });
                                break;
                            case /^注文$/.test(messageText):
                                yield messageController.showOrderMenu({
                                    replyToken: event.replyToken
                                });
                                break;
                            case /^クレジットカード$/.test(messageText):
                                yield messageController.showCreditCardMenu({
                                    replyToken: event.replyToken
                                });
                                break;
                            case /^プリペイド/.test(messageText):
                                yield messageController.showCoinAccountMenu({
                                    replyToken: event.replyToken
                                });
                                break;
                            case /^コード$/.test(messageText):
                                yield messageController.showCodeMenu({
                                    replyToken: event.replyToken
                                });
                                break;
                            // 顔写真登録
                            case /^顔写真登録$/.test(messageText):
                                yield messageController.startIndexingFace({
                                    replyToken: event.replyToken
                                });
                                break;
                            // 友達決済承認ワンタイムメッセージ
                            case /^FriendPayToken/.test(messageText):
                                const token = messageText.replace('FriendPayToken.', '');
                                yield messageController.askConfirmationOfFriendPay({
                                    replyToken: event.replyToken,
                                    token: token
                                });
                                break;
                            // おこづかいをもらう
                            case /^おこづかい$/.test(messageText):
                                yield messageController.selectWhomAskForMoney({
                                    replyToken: event.replyToken
                                });
                                break;
                            // おこづかい承認メッセージ
                            case /^TransferMoneyToken/.test(messageText):
                                const transferMoneyToken = messageText.replace('TransferMoneyToken.', '');
                                yield messageController.askConfirmationOfTransferMoney({
                                    replyToken: event.replyToken,
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
                                yield this.postback(postbackEvent);
                                break;
                            default:
                                // 予約照会方法をアドバイス
                                yield messageController.pushHowToUse({
                                    replyToken: event.replyToken
                                });
                        }
                        break;
                    case 'image':
                        const imageController = new image_1.ImageMessageWebhookController(this.req);
                        yield imageController.indexFace(event.message.id);
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
    /**
     * イベントの送信元が、template messageに付加されたポストバックアクションを実行したことを示すevent objectです
     */
    // tslint:disable-next-line:cyclomatic-complexity max-func-body-length
    postback(event) {
        return __awaiter(this, void 0, void 0, function* () {
            const data = qs.parse(event.postback.data, {
                arrayLimit: 1000,
                parseArrays: true,
                plainObjects: true,
                allowDots: false
            });
            debug('data:', data);
            try {
                const postbackController = new postback_1.PostbackWebhookController(this.req);
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
                        yield postbackController.searchEventsByDate({
                            replyToken: event.replyToken,
                            date: date
                        });
                        break;
                    case 'askScreeningEvent':
                        yield postbackController.askScreeningEvent({
                            replyToken: event.replyToken,
                            screeningEventSeriesId: data.screeningEventSeriesId,
                            date: data.date
                        });
                        break;
                    // 決済コードをたずねる
                    case 'askPaymentCode':
                        yield postbackController.askPaymentCode({
                            replyToken: event.replyToken,
                            transactionId: data.transactionId
                        });
                        break;
                    case 'selectCreditCard':
                        yield postbackController.selectCreditCard({
                            replyToken: event.replyToken,
                            transactionId: data.transactionId
                        });
                        break;
                    // 決済方法選択
                    case 'selectPaymentMethodType':
                        yield postbackController.selectPaymentMethodType({
                            replyToken: event.replyToken,
                            paymentMethodType: data.paymentMethod,
                            transactionId: data.transactionId,
                            code: data.code,
                            creditCard: data.creditCard
                        });
                        break;
                    // 購入者情報決定
                    case 'setCustomerContact':
                        yield postbackController.setCustomerContact({
                            replyToken: event.replyToken,
                            transactionId: data.transactionId,
                            familyName: data.familyName,
                            givenName: data.givenName,
                            email: data.email,
                            telephone: data.telephone
                        });
                        break;
                    // 注文確定
                    case 'confirmOrder':
                        yield postbackController.confirmOrder({
                            replyToken: event.replyToken,
                            transactionId: data.transactionId
                        });
                        break;
                    // 注文確定
                    case 'cancelOrder':
                        yield postbackController.cancelOrder({
                            replyToken: event.replyToken,
                            transactionId: data.transactionId
                        });
                        break;
                    // 友達決済承認確定
                    case 'confirmFriendPay':
                        yield postbackController.confirmFriendPay({
                            replyToken: event.replyToken,
                            token: data.token
                        });
                        break;
                    // おこづかい承認確定
                    case 'confirmTransferMoney':
                        yield postbackController.confirmTransferMoney({
                            replyToken: event.replyToken,
                            token: data.token,
                            price: parseInt(data.price, 10)
                        });
                        break;
                    // 友達決済承認確定
                    // case 'continueTransactionAfterFriendPayConfirmation':
                    //     await postbackController.selectPaymentMethodType(
                    //         user, 'FriendPay', <string>data.transactionId, parseInt(<string>data.price, 10));
                    //     break;
                    // クレジットカード検索
                    case 'searchCreditCards':
                        yield postbackController.searchCreditCards({
                            replyToken: event.replyToken
                        });
                        break;
                    // クレジットカード追加
                    case 'addCreditCard':
                        yield postbackController.addCreditCard({
                            replyToken: event.replyToken,
                            token: data.token
                        });
                        break;
                    // クレジットカード削除
                    case 'deleteCreditCard':
                        yield postbackController.deleteCreditCard({
                            replyToken: event.replyToken,
                            cardSeq: data.cardSeq
                        });
                        break;
                    // 口座開設
                    case 'openAccount':
                        yield postbackController.openAccount({
                            replyToken: event.replyToken,
                            name: data.name,
                            accountType: data.accountType
                        });
                        break;
                    // 口座解約
                    case 'closeAccount':
                        yield postbackController.closeAccount({
                            replyToken: event.replyToken,
                            accountType: data.accountType,
                            accountNumber: data.accountNumber
                        });
                        break;
                    // プリペイドカード検索
                    case 'searchCoinAccounts':
                        yield postbackController.searchCoinAccounts({
                            replyToken: event.replyToken
                        });
                        break;
                    case 'searchAccountMoneyTransferActions':
                        yield postbackController.searchAccountMoneyTransferActions({
                            replyToken: event.replyToken,
                            accountType: data.accountType,
                            accountNumber: data.accountNumber
                        });
                        break;
                    // 口座入金金額選択
                    case 'selectDepositAmount':
                        yield postbackController.selectDepositAmount({
                            replyToken: event.replyToken,
                            accountType: data.accountType,
                            accountNumber: data.accountNumber
                        });
                        break;
                    // 口座入金金額選択
                    case 'depositCoinByCreditCard':
                        yield postbackController.depositCoinByCreditCard({
                            replyToken: event.replyToken,
                            amount: Number(data.amount),
                            toAccountNumber: data.toAccountNumber
                        });
                        break;
                    case 'askEventStartDate':
                        yield postbackController.askEventStartDate({
                            replyToken: event.replyToken
                        });
                        break;
                    case 'searchScreeningEventReservations':
                        yield postbackController.searchScreeningEventReservations({
                            replyToken: event.replyToken
                        });
                        break;
                    // 座席選択 or 座席数選択
                    case 'selectSeatOffers':
                        const seatNumbers = (typeof data.seatNumbers === 'string') ? data.seatNumbers.split(',') : undefined;
                        const numSeats = (typeof data.numSeats === 'string') ? Number(data.numSeats) : undefined;
                        yield postbackController.selectSeatOffers({
                            replyToken: event.replyToken,
                            eventId: data.eventId,
                            seatNumbers: seatNumbers,
                            numSeats: numSeats,
                            offerId: data.offerId
                        });
                        break;
                    // 所有権コード発行
                    case 'authorizeOwnershipInfo':
                        yield postbackController.authorizeOwnershipInfo({
                            replyToken: event.replyToken,
                            goodType: data.goodType,
                            id: data.id
                        });
                        break;
                    // 注文照会
                    case 'findOrderByConfirmationNumber':
                        yield postbackController.findOrderByConfirmationNumber({
                            replyToken: event.replyToken,
                            confirmationNumber: Number(data.confirmationNumber),
                            telephone: data.telephone
                        });
                        break;
                    // 注文に対して発券
                    case 'authorizeOwnershipInfosByOrder':
                        yield postbackController.authorizeOwnershipInfosByOrder({
                            replyToken: event.replyToken,
                            orderNumber: data.orderNumber,
                            telephone: data.telephone
                        });
                        break;
                    // 注文検索
                    case 'searchOrders':
                        yield postbackController.searchOrders({
                            replyToken: event.replyToken
                        });
                        break;
                    // 予約コード読み込み
                    case 'findScreeningEventReservationById':
                        yield postbackController.findScreeningEventReservationById({
                            replyToken: event.replyToken,
                            code: data.code
                        });
                        break;
                    // プロフィール検索
                    case 'getProfile':
                        yield postbackController.getProfile({
                            replyToken: event.replyToken
                        });
                        break;
                    // プロフィール更新
                    case 'updateProfile':
                        yield postbackController.updateProfile({
                            replyToken: event.replyToken,
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
                yield lineClient_1.default.pushMessage(this.req.user.userId, { type: 'text', text: text });
            }
        });
    }
    /**
     * イベント送信元に友だち追加（またはブロック解除）されたことを示すEvent Objectです
     */
    follow(event) {
        var _a;
        return __awaiter(this, void 0, void 0, function* () {
            debug('project:', (_a = this.req.project) === null || _a === void 0 ? void 0 : _a.id);
            debug('event is', event);
        });
    }
    /**
     * イベント送信元にブロックされたことを示すevent objectです
     */
    unfollow(event) {
        var _a;
        return __awaiter(this, void 0, void 0, function* () {
            debug('project:', (_a = this.req.project) === null || _a === void 0 ? void 0 : _a.id);
            debug('event is', event);
        });
    }
    /**
     * イベントの送信元グループまたはトークルームに参加したことを示すevent objectです
     */
    join(event) {
        var _a;
        return __awaiter(this, void 0, void 0, function* () {
            debug('project:', (_a = this.req.project) === null || _a === void 0 ? void 0 : _a.id);
            debug('event is', event);
        });
    }
    /**
     * イベントの送信元グループから退出させられたことを示すevent objectです
     */
    leave(event) {
        var _a;
        return __awaiter(this, void 0, void 0, function* () {
            debug('project:', (_a = this.req.project) === null || _a === void 0 ? void 0 : _a.id);
            debug('event is', event);
        });
    }
    /**
     * イベント送信元のユーザがLINE Beaconデバイスの受信圏内に出入りしたことなどを表すイベントです
     */
    beacon(event) {
        var _a;
        return __awaiter(this, void 0, void 0, function* () {
            debug('project:', (_a = this.req.project) === null || _a === void 0 ? void 0 : _a.id);
            debug('event is', event);
        });
    }
}
exports.WebhookController = WebhookController;
