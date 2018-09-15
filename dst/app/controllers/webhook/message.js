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
 * LINE Webhook messageコントローラー
 */
const cinerinoapi = require("@cinerino/api-nodejs-client");
const createDebug = require("debug");
const moment = require("moment");
const qs = require("qs");
const lineClient_1 = require("../../../lineClient");
const debug = createDebug('cinerino-line-ticket:controllers');
/**
 * 使い方を送信する
 */
// tslint:disable-next-line:max-func-body-length
function pushHowToUse(params) {
    return __awaiter(this, void 0, void 0, function* () {
        const quickReplyItems = [];
        if ((yield params.user.getCredentials()) !== null) {
            quickReplyItems.push({
                type: 'action',
                imageUrl: `https://${params.user.host}/img/labels/reservation-ticket.png`,
                action: {
                    type: 'message',
                    label: '座席予約管理',
                    text: '座席予約'
                }
            }, {
                type: 'action',
                imageUrl: `https://${params.user.host}/img/labels/credit-card-64.png`,
                action: {
                    type: 'message',
                    label: 'クレジットカード管理',
                    text: 'クレジットカード'
                }
            }, {
                type: 'action',
                imageUrl: `https://${params.user.host}/img/labels/coin-64.png`,
                action: {
                    type: 'message',
                    label: 'コイン口座管理',
                    text: 'コイン'
                }
            }, {
                type: 'action',
                imageUrl: `https://${params.user.host}/img/labels/order-96.png`,
                action: {
                    type: 'message',
                    label: '注文管理',
                    text: '注文'
                }
            }, {
                type: 'action',
                imageUrl: `https://${params.user.host}/img/labels/qr-code-48.png`,
                action: {
                    type: 'message',
                    label: 'コード管理',
                    text: 'コード'
                }
            }, {
                type: 'action',
                imageUrl: `https://${params.user.host}/img/labels/friend-pay-50.png`,
                action: {
                    type: 'message',
                    label: 'おこづかいをもらう',
                    text: 'おこづかい'
                }
            }, {
                type: 'action',
                imageUrl: `https://${params.user.host}/img/labels/profile-96.png`,
                action: {
                    type: 'message',
                    label: 'プロフィール管理',
                    text: 'プロフィール'
                }
            }, {
                type: 'action',
                imageUrl: `https://${params.user.host}/img/labels/login-96.png`,
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
                imageUrl: `https://${params.user.host}/img/labels/login-96.png`,
                action: {
                    type: 'message',
                    label: 'ログイン',
                    text: 'login'
                }
            }, {
                type: 'action',
                imageUrl: `https://${params.user.host}/img/labels/reservation-ticket.png`,
                action: {
                    type: 'message',
                    label: '座席予約管理',
                    text: '座席予約'
                }
            }, {
                type: 'action',
                imageUrl: `https://${params.user.host}/img/labels/order-96.png`,
                action: {
                    type: 'message',
                    label: '注文管理',
                    text: '注文'
                }
            }, {
                type: 'action',
                imageUrl: `https://${params.user.host}/img/labels/qr-code-48.png`,
                action: {
                    type: 'message',
                    label: 'コード管理',
                    text: 'コード'
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
exports.pushHowToUse = pushHowToUse;
/**
 * プロフィールメニューを表示する
 */
function showProfileMenu(params) {
    return __awaiter(this, void 0, void 0, function* () {
        if ((yield params.user.getCredentials()) === null) {
            throw new Error('Login required');
        }
        const personService = new cinerinoapi.service.Person({
            endpoint: process.env.CINERINO_ENDPOINT,
            auth: params.user.authClient
        });
        const profile = yield personService.getProfile({ personId: 'me' });
        const actions = [];
        const updateProfileQuery = qs.stringify({ profile: profile });
        const updateProfileUri = `https://${params.user.host}/people/me/profile?${updateProfileQuery}`;
        const liffUri = `line://app/${process.env.LIFF_ID}?${qs.stringify({ cb: updateProfileUri })}`;
        actions.push({
            type: 'postback',
            label: 'プロフィールを確認',
            data: `action=getProfile`
        }, {
            type: 'uri',
            label: 'プロフィール変更',
            uri: liffUri
        });
        yield lineClient_1.default.replyMessage(params.replyToken, [
            {
                type: 'template',
                altText: 'プロフィール管理',
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
exports.showProfileMenu = showProfileMenu;
/**
 * 座席予約メニューを表示する
 */
function showSeatReservationMenu(params) {
    return __awaiter(this, void 0, void 0, function* () {
        const actions = [{
                type: 'postback',
                label: '座席を予約する',
                data: `action=askEventStartDate`
            }];
        if ((yield params.user.getCredentials()) !== null) {
            actions.push({
                type: 'postback',
                label: '予約を確認する',
                data: `action=searchScreeningEventReservations`
            });
        }
        yield lineClient_1.default.replyMessage(params.replyToken, [
            {
                type: 'template',
                altText: '座席予約メニュー',
                template: {
                    type: 'buttons',
                    title: '座席予約',
                    text: 'ご用件はなんでしょう？',
                    actions: actions
                }
            }
        ]);
    });
}
exports.showSeatReservationMenu = showSeatReservationMenu;
/**
 * 注文メニューを表示する
 */
function showOrderMenu(params) {
    return __awaiter(this, void 0, void 0, function* () {
        const findOrderUri = `https://${params.user.host}/orders/findByConfirmationNumber`;
        const liffUri = `line://app/${process.env.LIFF_ID}?${qs.stringify({ cb: findOrderUri })}`;
        const actions = [
            {
                type: 'uri',
                label: '確認番号で照会',
                uri: liffUri
            }
        ];
        if ((yield params.user.getCredentials()) !== null) {
            actions.push({
                type: 'postback',
                label: '注文を確認する',
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
exports.showOrderMenu = showOrderMenu;
function showCreditCardMenu(params) {
    return __awaiter(this, void 0, void 0, function* () {
        const organizationService = new cinerinoapi.service.Organization({
            endpoint: process.env.CINERINO_ENDPOINT,
            auth: params.user.authClient
        });
        const searchOrganizationsResult = yield organizationService.searchMovieTheaters({ limit: 1 });
        const movieTheater = searchOrganizationsResult.data[0];
        if (movieTheater.paymentAccepted === undefined) {
            throw new Error('許可された決済方法が見つかりません');
        }
        const creditCardPayment = movieTheater.paymentAccepted.find((p) => p.paymentMethodType === cinerinoapi.factory.paymentMethodType.CreditCard);
        if (creditCardPayment === undefined) {
            throw new Error('クレジットカード決済が許可されていません');
        }
        const inputCreditCardUri = `/transactions/inputCreditCard?gmoShopId=${creditCardPayment.gmoInfo.shopId}`;
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
                            label: 'クレジットカード追加',
                            uri: `line://app/${process.env.LIFF_ID}?${qs.stringify({ cb: inputCreditCardUri })}`
                        },
                        {
                            type: 'postback',
                            label: 'クレジットカード検索',
                            data: `action=searchCreditCards`
                        }
                    ]
                }
            }
        ]);
    });
}
exports.showCreditCardMenu = showCreditCardMenu;
function showCoinAccountMenu(params) {
    return __awaiter(this, void 0, void 0, function* () {
        const openAccountUri = `https://${params.user.host}/accounts/open?accountType=${cinerinoapi.factory.accountType.Coin}`;
        const liffUri = `line://app/${process.env.LIFF_ID}?${qs.stringify({ cb: openAccountUri })}`;
        yield lineClient_1.default.replyMessage(params.replyToken, [
            {
                type: 'template',
                altText: 'コイン口座管理',
                template: {
                    type: 'buttons',
                    title: 'コイン口座管理',
                    text: 'ご用件はなんでしょう？',
                    actions: [
                        {
                            type: 'uri',
                            label: '口座開設',
                            uri: liffUri
                        },
                        {
                            type: 'postback',
                            label: '口座検索',
                            data: 'action=searchCoinAccounts'
                        }
                    ]
                }
            }
        ]);
    });
}
exports.showCoinAccountMenu = showCoinAccountMenu;
function showCodeMenu(params) {
    return __awaiter(this, void 0, void 0, function* () {
        const scanQRUri = '/reservations/scanScreeningEventReservationCode';
        const liffUri = `line://app/${process.env.LIFF_ID}?${qs.stringify({ cb: scanQRUri })}`;
        const actions = [
            {
                type: 'uri',
                label: '座席予約チケット読み込み',
                uri: liffUri
            }
        ];
        // if (await params.user.getCredentials() !== null) {
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
exports.showCodeMenu = showCodeMenu;
/**
 * 顔写真登録を開始する
 */
function startIndexingFace(params) {
    return __awaiter(this, void 0, void 0, function* () {
        yield lineClient_1.default.replyMessage(params.replyToken, { type: 'text', text: '顔写真を送信してください' });
    });
}
exports.startIndexingFace = startIndexingFace;
/**
 * 友達決済承認確認
 */
function askConfirmationOfFriendPay(params) {
    return __awaiter(this, void 0, void 0, function* () {
        yield lineClient_1.default.replyMessage(params.replyToken, [
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
exports.askConfirmationOfFriendPay = askConfirmationOfFriendPay;
/**
 * おこづかい承認確認
 */
function askConfirmationOfTransferMoney(params) {
    return __awaiter(this, void 0, void 0, function* () {
        const transferMoneyInfo = yield params.user.verifyTransferMoneyToken(params.transferMoneyToken);
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
exports.askConfirmationOfTransferMoney = askConfirmationOfTransferMoney;
/**
 * 誰からお金をもらうか選択する
 */
function selectWhomAskForMoney(params) {
    return __awaiter(this, void 0, void 0, function* () {
        const LINE_ID = process.env.LINE_ID;
        const personService = new cinerinoapi.service.Person({
            endpoint: process.env.CINERINO_ENDPOINT,
            auth: params.user.authClient
        });
        const personOwnershipInfoService = new cinerinoapi.service.person.OwnershipInfo({
            endpoint: process.env.CINERINO_ENDPOINT,
            auth: params.user.authClient
        });
        const searchAccountsResult = yield personOwnershipInfoService.search({
            personId: 'me',
            typeOfGood: {
                typeOf: cinerinoapi.factory.ownershipInfo.AccountGoodType.Account,
                accountType: cinerinoapi.factory.accountType.Coin
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
        const profile = yield personService.getProfile({ personId: 'me' });
        const token = yield params.user.signTransferMoneyInfo({
            userId: params.user.userId,
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
exports.selectWhomAskForMoney = selectWhomAskForMoney;
/**
 * 予約番号or電話番号のボタンを送信する
 */
function pushButtonsReserveNumOrTel(params) {
    return __awaiter(this, void 0, void 0, function* () {
        const datas = params.message.split('-');
        const theater = datas[0];
        const reserveNumOrTel = datas[1];
        // キュー実行のボタン表示
        yield lineClient_1.default.replyMessage(params.replyToken, [
            {
                type: 'template',
                altText: 'aaa',
                template: {
                    type: 'buttons',
                    text: 'どちらで検索する？',
                    actions: [
                        {
                            type: 'postback',
                            label: '予約番号',
                            data: `action=searchTransactionByReserveNum&theater=${theater}&reserveNum=${reserveNumOrTel}`
                        },
                        {
                            type: 'postback',
                            label: '電話番号',
                            data: `action=searchTransactionByTel&theater=${theater}&tel=${reserveNumOrTel}`
                        }
                    ]
                }
            }
        ]);
    });
}
exports.pushButtonsReserveNumOrTel = pushButtonsReserveNumOrTel;
/**
 * 予約のイベント日選択を求める
 */
function askReservationEventDate(params) {
    return __awaiter(this, void 0, void 0, function* () {
        yield lineClient_1.default.replyMessage(params.replyToken, [
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
                            initial: moment().format('YYYY-MM-DD')
                        }
                    ]
                }
            }
        ]);
    });
}
exports.askReservationEventDate = askReservationEventDate;
/**
 * 日付選択を求める
 */
function askEventStartDate(params) {
    return __awaiter(this, void 0, void 0, function* () {
        const message = {
            type: 'text',
            text: 'いつ見ますか？',
            quickReply: {
                items: [
                    {
                        type: 'action',
                        // imageUrl: `https://${user.host}/img/labels/coin-64.png`,
                        action: {
                            type: 'postback',
                            label: '今日',
                            data: qs.stringify({
                                action: 'searchEventsByDate',
                                date: moment().add(0, 'days').format('YYYY-MM-DD')
                            })
                        }
                    },
                    {
                        type: 'action',
                        // imageUrl: `https://${user.host}/img/labels/friend-pay-64.png`,
                        action: {
                            type: 'postback',
                            label: '明日',
                            data: qs.stringify({
                                action: 'searchEventsByDate',
                                date: moment().add(1, 'days').format('YYYY-MM-DD')
                            })
                        }
                    },
                    {
                        type: 'action',
                        // imageUrl: `https://${user.host}/img/labels/friend-pay-64.png`,
                        action: {
                            type: 'postback',
                            label: '明後日',
                            data: qs.stringify({
                                action: 'searchEventsByDate',
                                // tslint:disable-next-line:no-magic-numbers
                                date: moment().add(2, 'days').format('YYYY-MM-DD')
                            })
                        }
                    },
                    {
                        type: 'action',
                        imageUrl: `https://${params.user.host}/img/labels/calender-48.png`,
                        action: {
                            type: 'datetimepicker',
                            label: '選ぶ',
                            mode: 'date',
                            data: 'action=searchEventsByDate',
                            initial: moment().add(1, 'days').format('YYYY-MM-DD'),
                            // tslint:disable-next-line:no-magic-numbers
                            max: moment().add(7, 'days').format('YYYY-MM-DD'),
                            min: moment().add(1, 'days').format('YYYY-MM-DD')
                        }
                    }
                ]
            }
        };
        yield lineClient_1.default.replyMessage(params.replyToken, [message]);
    });
}
exports.askEventStartDate = askEventStartDate;
/**
 * 日付選択を求める
 */
function askFromWhenAndToWhen(params) {
    return __awaiter(this, void 0, void 0, function* () {
        yield lineClient_1.default.replyMessage(params.replyToken, [
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
                            initial: moment().format('YYYY-MM-DD')
                        }
                    ]
                }
            }
        ]);
    });
}
exports.askFromWhenAndToWhen = askFromWhenAndToWhen;
function logout(params) {
    return __awaiter(this, void 0, void 0, function* () {
        const logoutUri = `https://${params.user.host}/logout?userId=${params.user.userId}`;
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
exports.logout = logout;
