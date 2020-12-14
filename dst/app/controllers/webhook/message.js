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
exports.MessageWebhookController = void 0;
const cinerinoapi = require("@cinerino/sdk");
const createDebug = require("debug");
const moment = require("moment");
const qs = require("qs");
const lineClient_1 = require("../../../lineClient");
const debug = createDebug('cinerino-line-ticket:controllers');
/**
 * メッセージウェブフックコントローラ
 */
class MessageWebhookController {
    constructor(req) {
        this.project = req.project;
        this.user = req.user;
    }
    /**
     * 使い方を送信する
     */
    // tslint:disable-next-line:max-func-body-length
    pushHowToUse(params) {
        return __awaiter(this, void 0, void 0, function* () {
            const quickReplyItems = [];
            quickReplyItems.push({
                type: 'action',
                imageUrl: `https://${this.user.host}/img/labels/project-96.png`,
                action: {
                    type: 'postback',
                    label: 'プロジェクト',
                    data: qs.stringify({
                        action: 'selectProject'
                    })
                }
            }, {
                type: 'action',
                imageUrl: `https://${this.user.host}/img/labels/reservation-ticket.png`,
                action: {
                    type: 'message',
                    label: '予約',
                    text: '予約'
                }
            }, {
                type: 'action',
                imageUrl: `https://${this.user.host}/img/labels/payment-card-64.png`,
                action: {
                    type: 'message',
                    label: 'ペイメントカード',
                    text: 'ペイメントカード'
                }
            }, {
                type: 'action',
                imageUrl: `https://${this.user.host}/img/labels/membership-64.png`,
                action: {
                    type: 'message',
                    label: 'メンバーシップ',
                    text: 'メンバーシップ'
                }
            }, {
                type: 'action',
                imageUrl: `https://${this.user.host}/img/labels/order-96.png`,
                action: {
                    type: 'message',
                    label: '注文',
                    text: '注文'
                }
            }, {
                type: 'action',
                imageUrl: `https://${this.user.host}/img/labels/qr-code-48.png`,
                action: {
                    type: 'message',
                    label: 'コード',
                    text: 'コード'
                }
            });
            if ((yield this.user.getCredentials()) !== undefined) {
                quickReplyItems.push({
                    type: 'action',
                    imageUrl: `https://${this.user.host}/img/labels/credit-card-64.png`,
                    action: {
                        type: 'message',
                        label: 'クレジットカード',
                        text: 'クレジットカード'
                    }
                }, {
                    type: 'action',
                    imageUrl: `https://${this.user.host}/img/labels/friend-pay-50.png`,
                    action: {
                        type: 'message',
                        label: 'おこづかい',
                        text: 'おこづかい'
                    }
                }, {
                    type: 'action',
                    imageUrl: `https://${this.user.host}/img/labels/profile-96.png`,
                    action: {
                        type: 'message',
                        label: 'プロフィール',
                        text: 'プロフィール'
                    }
                }, {
                    type: 'action',
                    imageUrl: `https://${this.user.host}/img/labels/login-96.png`,
                    action: {
                        type: 'message',
                        label: 'ログアウト',
                        text: 'logout'
                    }
                });
            }
            else {
                quickReplyItems.push({
                    type: 'action',
                    imageUrl: `https://${this.user.host}/img/labels/login-96.png`,
                    action: {
                        type: 'message',
                        label: 'ログイン',
                        text: 'login'
                    }
                });
            }
            const message = {
                type: 'text',
                text: 'ご用件はなんでしょう？',
                quickReply: {
                    items: quickReplyItems
                }
            };
            yield lineClient_1.default.replyMessage(params.replyToken, [message]);
        });
    }
    /**
     * プロフィールメニューを表示する
     */
    showProfileMenu(params) {
        var _a, _b;
        return __awaiter(this, void 0, void 0, function* () {
            if ((yield this.user.getCredentials()) === undefined) {
                throw new Error('Login required');
            }
            const personService = new cinerinoapi.service.Person({
                endpoint: process.env.CINERINO_ENDPOINT,
                auth: this.user.authClient,
                project: { id: (_a = this.project) === null || _a === void 0 ? void 0 : _a.id }
            });
            let profile;
            try {
                profile = yield personService.getProfile({});
                debug('profile:', profile);
            }
            catch (error) {
                yield lineClient_1.default.pushMessage(this.user.userId, { type: 'text', text: `プロフィールを取得できませんでした ${error.message}` });
            }
            // const updateProfileQuery = qs.stringify({ profile: profile });
            const updateProfileQuery = qs.stringify({});
            const updateProfileUri = `https://${this.user.host}/projects/${(_b = this.project) === null || _b === void 0 ? void 0 : _b.id}/people/me/profile?${updateProfileQuery}`;
            // const updateProfileUri = `https://${this.user.host}/people/me/profile`;
            const liffUri = `line://app/${process.env.LIFF_ID}?${qs.stringify({ cb: updateProfileUri })}`;
            debug(liffUri);
            const actions = [];
            actions.push({
                type: 'postback',
                label: 'プロフィール確認',
                data: `action=getProfile`
            }, {
                type: 'uri',
                label: '変更する',
                uri: liffUri
            });
            yield lineClient_1.default.replyMessage(params.replyToken, [
                {
                    type: 'template',
                    altText: 'プロフィールメニュー',
                    template: {
                        type: 'buttons',
                        title: 'プロフィール管理',
                        text: 'ご用件はなんでしょう？',
                        actions: actions
                    }
                }
            ]);
        });
    }
    /**
     * 予約メニューを表示する
     */
    showSeatReservationMenu(params) {
        return __awaiter(this, void 0, void 0, function* () {
            const actions = [{
                    type: 'postback',
                    label: '予約する',
                    data: `action=askEventStartDate`
                }];
            if ((yield this.user.getCredentials()) !== undefined) {
                actions.push({
                    type: 'postback',
                    label: 'My予約',
                    data: `action=searchScreeningEventReservations`
                });
            }
            yield lineClient_1.default.replyMessage(params.replyToken, [
                {
                    type: 'template',
                    altText: '予約メニュー',
                    template: {
                        type: 'buttons',
                        title: '予約',
                        text: 'ご用件はなんでしょう？',
                        actions: actions
                    }
                }
            ]);
        });
    }
    /**
     * 注文メニューを表示する
     */
    showOrderMenu(params) {
        var _a;
        return __awaiter(this, void 0, void 0, function* () {
            const findOrderUri = `https://${this.user.host}/projects/${(_a = this.project) === null || _a === void 0 ? void 0 : _a.id}/orders/findByConfirmationNumber`;
            const liffUri = `line://app/${process.env.LIFF_ID}?${qs.stringify({ cb: findOrderUri })}`;
            const actions = [
                {
                    type: 'uri',
                    label: '確認番号で照会',
                    uri: liffUri
                }
            ];
            if ((yield this.user.getCredentials()) !== undefined) {
                actions.push({
                    type: 'postback',
                    label: 'My注文',
                    data: `action=searchOrders`
                });
            }
            yield lineClient_1.default.replyMessage(params.replyToken, [
                {
                    type: 'template',
                    altText: '注文メニュー',
                    template: {
                        type: 'buttons',
                        title: '注文管理',
                        text: 'ご用件はなんでしょう？',
                        actions: actions
                    }
                }
            ]);
        });
    }
    showCreditCardMenu(params) {
        var _a;
        return __awaiter(this, void 0, void 0, function* () {
            const sellerService = new cinerinoapi.service.Seller({
                endpoint: process.env.CINERINO_ENDPOINT,
                auth: this.user.authClient,
                project: { id: (_a = this.project) === null || _a === void 0 ? void 0 : _a.id }
            });
            const searchSellersResult = yield sellerService.search({ limit: 1 });
            const seller = searchSellersResult.data[0];
            if (seller.paymentAccepted === undefined) {
                throw new Error('許可された決済方法が見つかりません');
            }
            const creditCardPayment = seller.paymentAccepted.find((p) => p.paymentMethodType === cinerinoapi.factory.paymentMethodType.CreditCard);
            if (creditCardPayment === undefined) {
                throw new Error('クレジットカード決済が許可されていません');
            }
            const inputCreditCardUri = `/projects/${seller.project.id}/transactions/inputCreditCard?gmoShopId=${creditCardPayment.gmoInfo.shopId}`;
            yield lineClient_1.default.replyMessage(params.replyToken, [
                {
                    type: 'template',
                    altText: 'クレジットカード管理',
                    template: {
                        type: 'buttons',
                        title: 'クレジットカード管理',
                        text: 'ご用件はなんでしょう？',
                        actions: [
                            {
                                type: 'uri',
                                label: '登録する',
                                uri: `line://app/${process.env.LIFF_ID}?${qs.stringify({ cb: inputCreditCardUri })}`
                            },
                            {
                                type: 'postback',
                                label: 'Myクレジットカード',
                                data: `action=searchCreditCards`
                            }
                        ]
                    }
                }
            ]);
        });
    }
    showCoinAccountMenu(params) {
        var _a, _b, _c;
        return __awaiter(this, void 0, void 0, function* () {
            // const openAccountUri =
            // tslint:disable-next-line:max-line-length
            //     `https://${this.user.host}/projects/${this.project?.id}/accounts/open?accountType=${cinerinoapi.factory.accountType.Prepaid}`;
            const orderPaymentCardUri = `https://${this.user.host}/projects/${(_a = this.project) === null || _a === void 0 ? void 0 : _a.id}/paymentCards/order`;
            const orderPaymentCardLiffUri = `line://app/${process.env.LIFF_ID}?${qs.stringify({ cb: orderPaymentCardUri })}`;
            const orderMonetaryAmountUri = `https://${this.user.host}/projects/${(_b = this.project) === null || _b === void 0 ? void 0 : _b.id}/paymentCards/orderMonetaryAmount`;
            const orderMonetaryAmountLiffUri = `line://app/${process.env.LIFF_ID}?${qs.stringify({ cb: orderMonetaryAmountUri })}`;
            const checkPaymentCardUri = `https://${this.user.host}/projects/${(_c = this.project) === null || _c === void 0 ? void 0 : _c.id}/paymentCards/check`;
            const checkPaymentCardtLiffUri = `line://app/${process.env.LIFF_ID}?${qs.stringify({ cb: checkPaymentCardUri })}`;
            yield lineClient_1.default.replyMessage(params.replyToken, [
                {
                    type: 'template',
                    altText: 'ペイメントカード管理',
                    template: {
                        type: 'buttons',
                        title: 'ペイメントカード管理',
                        text: 'ご用件はなんでしょう？',
                        actions: [
                            {
                                type: 'uri',
                                label: '新規発行',
                                uri: orderPaymentCardLiffUri
                            },
                            {
                                type: 'uri',
                                label: '照会',
                                uri: checkPaymentCardtLiffUri
                            },
                            {
                                type: 'uri',
                                label: '入金',
                                uri: orderMonetaryAmountLiffUri
                            },
                            {
                                type: 'postback',
                                label: 'Myカード',
                                data: 'action=searchCoinAccounts'
                            }
                        ]
                    }
                }
            ]);
        });
    }
    // tslint:disable-next-line:prefer-function-over-method
    showMembershipMenu(params) {
        return __awaiter(this, void 0, void 0, function* () {
            yield lineClient_1.default.replyMessage(params.replyToken, [
                {
                    type: 'template',
                    altText: 'メンバーシップ管理',
                    template: {
                        type: 'buttons',
                        title: 'メンバーシップ管理',
                        text: 'ご用件はなんでしょう？',
                        actions: [
                            {
                                type: 'postback',
                                label: '新規登録',
                                data: qs.stringify({
                                    action: 'searchMembershipServices'
                                })
                            },
                            {
                                type: 'postback',
                                label: 'Myメンバーシップ',
                                data: 'action=searchMemberships'
                            }
                        ]
                    }
                }
            ]);
        });
    }
    showCodeMenu(params) {
        var _a;
        return __awaiter(this, void 0, void 0, function* () {
            const scanQRUri = `/projects/${(_a = this.project) === null || _a === void 0 ? void 0 : _a.id}/reservations/scanScreeningEventReservationCode`;
            const liffUri = `line://app/${process.env.LIFF_ID}?${qs.stringify({ cb: scanQRUri })}`;
            const actions = [
                {
                    type: 'uri',
                    label: '予約チケット読み込み',
                    uri: liffUri
                }
            ];
            // if (await this.user.getCredentials() !== undefined) {
            // }
            yield lineClient_1.default.replyMessage(params.replyToken, [
                {
                    type: 'template',
                    altText: 'コード管理',
                    template: {
                        type: 'buttons',
                        title: 'コード管理',
                        text: 'ご用件はなんでしょう？',
                        actions: actions
                    }
                }
            ]);
        });
    }
    /**
     * 顔写真登録を開始する
     */
    startIndexingFace(__) {
        return __awaiter(this, void 0, void 0, function* () {
            yield lineClient_1.default.pushMessage(this.user.userId, { type: 'text', text: '顔写真を送信してください' });
        });
    }
    /**
     * 友達決済承認確認
     */
    askConfirmationOfFriendPay(params) {
        return __awaiter(this, void 0, void 0, function* () {
            yield lineClient_1.default.pushMessage(this.user.userId, [
                {
                    type: 'template',
                    altText: 'This is a buttons template',
                    template: {
                        type: 'confirm',
                        text: '本当に友達決済を承認しますか?',
                        actions: [
                            {
                                type: 'postback',
                                label: 'Yes',
                                data: `action=confirmFriendPay&token=${params.token}`
                            },
                            {
                                type: 'postback',
                                label: 'No',
                                data: `action=rejectFriendPay&token=${params.token}`
                            }
                        ]
                    }
                }
            ]);
        });
    }
    /**
     * おこづかい承認確認
     */
    askConfirmationOfTransferMoney(params) {
        return __awaiter(this, void 0, void 0, function* () {
            const transferMoneyInfo = yield this.user.verifyTransferMoneyToken(params.transferMoneyToken);
            yield lineClient_1.default.replyMessage(params.replyToken, [
                {
                    type: 'template',
                    altText: 'おこづかい金額選択',
                    template: {
                        type: 'buttons',
                        text: `${transferMoneyInfo.name}がおこづかいを要求しています`,
                        actions: [
                            {
                                type: 'postback',
                                label: '10円あげる',
                                data: `action=confirmTransferMoney&token=${params.transferMoneyToken}&price=10`
                            },
                            {
                                type: 'postback',
                                label: '100円あげる',
                                data: `action=confirmTransferMoney&token=${params.transferMoneyToken}&price=100`
                            },
                            {
                                type: 'postback',
                                label: '1000円あげる',
                                data: `action=confirmTransferMoney&token=${params.transferMoneyToken}&price=1000`
                            },
                            {
                                type: 'postback',
                                label: 'あげない',
                                data: `action=rejectTransferMoney&token=${params.transferMoneyToken}`
                            }
                        ]
                    }
                }
            ]);
        });
    }
    /**
     * 誰からお金をもらうか選択する
     */
    selectWhomAskForMoney(params) {
        var _a, _b;
        return __awaiter(this, void 0, void 0, function* () {
            const LINE_ID = process.env.LINE_ID;
            const personService = new cinerinoapi.service.Person({
                endpoint: process.env.CINERINO_ENDPOINT,
                auth: this.user.authClient,
                project: { id: (_a = this.project) === null || _a === void 0 ? void 0 : _a.id }
            });
            const personOwnershipInfoService = new cinerinoapi.service.person.OwnershipInfo({
                endpoint: process.env.CINERINO_ENDPOINT,
                auth: this.user.authClient,
                project: { id: (_b = this.project) === null || _b === void 0 ? void 0 : _b.id }
            });
            const searchAccountsResult = yield personOwnershipInfoService.search({
                typeOfGood: {
                    typeOf: 'Account',
                    accountType: cinerinoapi.factory.accountType.Prepaid
                }
            });
            const accounts = searchAccountsResult.data
                .map((o) => o.typeOfGood)
                .filter((a) => a.status === cinerinoapi.factory.pecorino.accountStatusType.Opened);
            debug('accounts:', accounts);
            if (accounts.length === 0) {
                throw new Error('口座未開設です');
            }
            const account = accounts[0];
            const profile = yield personService.getProfile({});
            const token = yield this.user.signTransferMoneyInfo({
                userId: this.user.userId,
                accountNumber: account.accountNumber,
                name: `${profile.familyName} ${profile.givenName}`
            });
            const friendMessage = `TransferMoneyToken.${token}`;
            const message = encodeURIComponent(`おこづかいちょーだい！
よければ下のリンクを押してそのままメッセージを送信してね
line://oaMessage/${LINE_ID}/?${friendMessage}`);
            yield lineClient_1.default.replyMessage(params.replyToken, [
                {
                    type: 'template',
                    altText: 'This is a buttons template',
                    template: {
                        type: 'buttons',
                        title: 'おこづかいをもらう',
                        text: '友達を選択してメッセージを送信しましょう',
                        actions: [
                            {
                                type: 'uri',
                                label: '誰からもらう？',
                                uri: `line://msg/text/?${message}`
                            }
                        ]
                    }
                }
            ]);
        });
    }
    /**
     * 予約番号or電話番号のボタンを送信する
     */
    // public async pushButtonsReserveNumOrTel(params: {
    //     replyToken: string;
    //     message: string;
    // }) {
    //     const datas = params.message.split('-');
    //     const theater = datas[0];
    //     const reserveNumOrTel = datas[1];
    //     // キュー実行のボタン表示
    //     await LINE.replyMessage(params.replyToken, [
    //         {
    //             type: 'template',
    //             altText: 'aaa',
    //             template: {
    //                 type: 'buttons',
    //                 text: 'どちらで検索する？',
    //                 actions: [
    //                     {
    //                         type: 'postback',
    //                         label: '予約番号',
    //                         data: `action=searchTransactionByReserveNum&theater=${theater}&reserveNum=${reserveNumOrTel}`
    //                     },
    //                     {
    //                         type: 'postback',
    //                         label: '電話番号',
    //                         data: `action=searchTransactionByTel&theater=${theater}&tel=${reserveNumOrTel}`
    //                     }
    //                 ]
    //             }
    //         }
    //     ]);
    // }
    /**
     * 予約のイベント日選択を求める
     */
    askReservationEventDate(params) {
        return __awaiter(this, void 0, void 0, function* () {
            yield lineClient_1.default.pushMessage(this.user.userId, [
                {
                    type: 'template',
                    altText: '日付選択',
                    template: {
                        type: 'buttons',
                        text: 'ツアーの開演日を教えてください',
                        actions: [
                            {
                                type: 'datetimepicker',
                                label: '日付選択',
                                mode: 'date',
                                data: `action=searchTransactionByPaymentNo&paymentNo=${params.paymentNo}`,
                                initial: moment()
                                    .format('YYYY-MM-DD')
                            }
                        ]
                    }
                }
            ]);
        });
    }
    /**
     * 日付選択を求める
     */
    askFromWhenAndToWhen(__) {
        return __awaiter(this, void 0, void 0, function* () {
            yield lineClient_1.default.pushMessage(this.user.userId, [
                {
                    type: 'template',
                    altText: '日付選択',
                    template: {
                        type: 'buttons',
                        text: '日付を選択するか、期間をYYYYMMDD-YYYYMMDD形式で教えてください',
                        actions: [
                            {
                                type: 'datetimepicker',
                                label: '日付選択',
                                mode: 'date',
                                data: 'action=searchTransactionsByDate',
                                initial: moment()
                                    .format('YYYY-MM-DD')
                            }
                        ]
                    }
                }
            ]);
        });
    }
    logout(params) {
        return __awaiter(this, void 0, void 0, function* () {
            const logoutUri = `https://${this.user.host}/logout?userId=${this.user.userId}`;
            const liffUri = `line://app/${process.env.LIFF_ID}?${qs.stringify({ cb: logoutUri })}`;
            yield lineClient_1.default.replyMessage(params.replyToken, [
                {
                    type: 'template',
                    altText: 'ログアウトボタン',
                    template: {
                        type: 'buttons',
                        text: '本当にログアウトしますか？',
                        actions: [
                            {
                                type: 'uri',
                                label: 'Log out',
                                uri: liffUri
                            }
                        ]
                    }
                }
            ]);
        });
    }
}
exports.MessageWebhookController = MessageWebhookController;
