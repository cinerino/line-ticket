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
 * LINE webhook postbackコントローラー
 */
const cinerinoapi = require("@cinerino/api-nodejs-client");
const createDebug = require("debug");
const moment = require("moment");
const qs = require("qs");
const util_1 = require("util");
const lineClient_1 = require("../../../lineClient");
const coin_1 = require("../account/coin");
const contentsBuilder_1 = require("../../contentsBuilder");
const debug = createDebug('cinerino-line-ticket:controllers');
/**
 * 日付でイベント検索
 * @params.date {string} date YYYY-MM-DD形式
 */
function searchEventsByDate(params) {
    return __awaiter(this, void 0, void 0, function* () {
        yield lineClient_1.default.replyMessage(params.replyToken, { type: 'text', text: `${params.date}のイベントを検索しています...` });
        const eventService = new cinerinoapi.service.Event({
            endpoint: process.env.CINERINO_ENDPOINT,
            auth: params.user.authClient,
            project: { id: process.env.PROJECT_ID }
        });
        const searchScreeningEventsResult = yield eventService.search({
            typeOf: cinerinoapi.factory.chevre.eventType.ScreeningEvent,
            eventStatuses: [cinerinoapi.factory.chevre.eventStatusType.EventScheduled],
            inSessionFrom: moment.unix(Math.max(moment(`${params.date}T00:00:00+09:00`)
                .unix(), moment()
                .unix()))
                .toDate(),
            inSessionThrough: moment(`${params.date}T00:00:00+09:00`)
                .add(1, 'day')
                .toDate()
        });
        const screeningEvents = searchScreeningEventsResult.data;
        // 上映イベントシリーズをユニークに
        let superEvents = screeningEvents.map((e) => e.superEvent);
        superEvents = superEvents.filter((e, index, events) => events.map((e2) => e2.id)
            .indexOf(e.id) === index);
        // tslint:disable-next-line:no-magic-numbers
        superEvents = superEvents.slice(0, 10);
        yield lineClient_1.default.pushMessage(params.user.userId, { type: 'text', text: `${superEvents.length}件の作品がみつかりました` });
        if (superEvents.length > 0) {
            // const accessToken = await params.user.authClient.getAccessToken();
            const flex = {
                type: 'flex',
                altText: 'This is a Flex Message',
                contents: {
                    type: 'carousel',
                    contents: [
                        // tslint:disable-next-line:no-magic-numbers
                        ...superEvents.slice(0, 10)
                            .map((event) => {
                            return contentsBuilder_1.screeningEventSeries2flexBubble({ date: params.date, event: event });
                        })
                    ]
                }
            };
            yield lineClient_1.default.pushMessage(params.user.userId, [flex]);
        }
    });
}
exports.searchEventsByDate = searchEventsByDate;
/**
 * 上映イベントスケジュールをたずねる
 */
function askScreeningEvent(params) {
    return __awaiter(this, void 0, void 0, function* () {
        yield lineClient_1.default.replyMessage(params.replyToken, { type: 'text', text: `${params.date}のイベントを検索しています...` });
        const eventService = new cinerinoapi.service.Event({
            endpoint: process.env.CINERINO_ENDPOINT,
            auth: params.user.authClient,
            project: { id: process.env.PROJECT_ID }
        });
        const startFrom = moment.unix(Math.max(moment(`${params.date}T00:00:00+09:00`)
            .unix(), moment()
            .unix()))
            .toDate();
        const startThrough = moment(`${params.date}T00:00:00+09:00`)
            .add(1, 'day')
            .toDate();
        const searchScreeningEventsResult = yield eventService.search({
            typeOf: cinerinoapi.factory.chevre.eventType.ScreeningEvent,
            eventStatuses: [cinerinoapi.factory.chevre.eventStatusType.EventScheduled],
            inSessionFrom: startFrom,
            inSessionThrough: startThrough
        });
        let screeningEvents = searchScreeningEventsResult.data;
        // 上映イベントシリーズをユニークに
        screeningEvents = screeningEvents
            .filter((e) => e.superEvent.id === params.screeningEventSeriesId)
            // tslint:disable-next-line:no-magic-numbers
            .slice(0, 10);
        yield lineClient_1.default.pushMessage(params.user.userId, { type: 'text', text: `${screeningEvents.length}件のスケジュールがみつかりました` });
        const bubbles = screeningEvents.map((event) => {
            return contentsBuilder_1.screeningEvent2flexBubble({ event: event, user: params.user });
        });
        yield lineClient_1.default.pushMessage(params.user.userId, [
            {
                type: 'flex',
                altText: 'This is a Flex Message',
                contents: {
                    type: 'carousel',
                    contents: bubbles
                }
            }
        ]);
    });
}
exports.askScreeningEvent = askScreeningEvent;
/**
 * 決済コードをたずねる
 */
function askPaymentCode(params) {
    return __awaiter(this, void 0, void 0, function* () {
        //     const LINE_ID = process.env.LINE_ID;
        //     const token = await user.signFriendPayInfo({
        //         transactionId: transaction.id,
        //         userId: params.user.userId,
        //         price: (<cinerino.factory.action.authorize.offer.seatReservation.IResult>seatReservationAuthorization.result).price
        //     });
        //     const friendMessage = `FriendPayToken.${token}`;
        //     const message = encodeURIComponent(`僕の代わりに決済をお願いできますか？よければ、下のリンクを押してそのままメッセージを送信してください
        // line://oaMessage/${LINE_ID}/?${friendMessage}`);
        const scanQRUri = `/transactions/placeOrder/scanQRCode?transactionId=${params.transactionId}`;
        const liffUri = `line://app/${process.env.LIFF_ID}?${qs.stringify({ cb: scanQRUri })}`;
        yield lineClient_1.default.replyMessage(params.replyToken, [
            {
                type: 'template',
                altText: '決済コード',
                template: {
                    type: 'buttons',
                    title: '決済コード',
                    text: '決済コードを入力してください',
                    actions: [
                        {
                            type: 'uri',
                            label: 'QRコードを読み取る',
                            uri: liffUri
                        }
                    ]
                }
            }
        ]);
    });
}
exports.askPaymentCode = askPaymentCode;
/**
 * 決済方法選択
 */
// tslint:disable-next-line:max-func-body-length
function selectPaymentMethodType(params) {
    return __awaiter(this, void 0, void 0, function* () {
        const personService = new cinerinoapi.service.Person({
            endpoint: process.env.CINERINO_ENDPOINT,
            auth: params.user.authClient,
            project: { id: process.env.PROJECT_ID }
        });
        const personOwnershipInfoService = new cinerinoapi.service.person.OwnershipInfo({
            endpoint: process.env.CINERINO_ENDPOINT,
            auth: params.user.authClient,
            project: { id: process.env.PROJECT_ID }
        });
        const paymentService = new cinerinoapi.service.Payment({
            endpoint: process.env.CINERINO_ENDPOINT,
            auth: params.user.authClient,
            project: { id: process.env.PROJECT_ID }
        });
        const ownershipInfoService = new cinerinoapi.service.OwnershipInfo({
            endpoint: process.env.CINERINO_ENDPOINT,
            auth: params.user.authClient,
            project: { id: process.env.PROJECT_ID }
        });
        const seatReservationAuthorization = yield params.user.findSeatReservationAuthorization();
        if (seatReservationAuthorization.result === undefined) {
            throw new Error('Invalid seat reservation authorization');
        }
        const price = seatReservationAuthorization.result.price;
        // const tmpReservations = seatReservationAuthorization.result.responseBody.object.reservations;
        switch (params.paymentMethodType) {
            case cinerinoapi.factory.paymentMethodType.Account:
                yield lineClient_1.default.replyMessage(params.replyToken, { type: 'text', text: '残高を確認しています...' });
                let account;
                if (params.code === undefined) {
                    // 口座番号取得
                    const searchAccountsResult = yield personOwnershipInfoService.search({
                        typeOfGood: {
                            typeOf: cinerinoapi.factory.ownershipInfo.AccountGoodType.Account,
                            accountType: cinerinoapi.factory.accountType.Coin
                        }
                    });
                    let accounts = searchAccountsResult.data.map((o) => o.typeOfGood);
                    accounts = accounts.filter((a) => a.status === cinerinoapi.factory.pecorino.accountStatusType.Opened);
                    debug('accounts:', accounts);
                    if (accounts.length === 0) {
                        throw new Error('口座未開設です');
                    }
                    account = accounts[0];
                }
                else {
                    const { token } = yield ownershipInfoService.getToken({ code: params.code });
                    account = token;
                }
                const accountAuthorization = yield paymentService.authorizeAccount({
                    object: {
                        typeOf: cinerinoapi.factory.paymentMethodType.Account,
                        amount: price,
                        fromAccount: account
                    },
                    purpose: { typeOf: cinerinoapi.factory.transactionType.PlaceOrder, id: params.transactionId }
                });
                debug('残高確認済', accountAuthorization);
                yield lineClient_1.default.pushMessage(params.user.userId, { type: 'text', text: '残高の確認がとれました' });
                break;
            case cinerinoapi.factory.paymentMethodType.CreditCard:
                yield lineClient_1.default.replyMessage(params.replyToken, { type: 'text', text: 'クレジットカードを確認しています...' });
                if (params.creditCard === undefined) {
                    throw new Error('クレジットカードが指定されていません');
                }
                yield paymentService.authorizeCreditCard({
                    object: {
                        typeOf: cinerinoapi.factory.paymentMethodType.CreditCard,
                        name: 'クレカ',
                        amount: price,
                        method: '1',
                        creditCard: params.creditCard
                    },
                    purpose: { typeOf: cinerinoapi.factory.transactionType.PlaceOrder, id: params.transactionId }
                });
                yield lineClient_1.default.pushMessage(params.user.userId, { type: 'text', text: 'クレジットカードで決済を受け付けます' });
                break;
            case cinerinoapi.factory.paymentMethodType.Others:
                yield lineClient_1.default.replyMessage(params.replyToken, { type: 'text', text: '決済承認を実行します...' });
                yield paymentService.authorizeAnyPayment({
                    object: {
                        typeOf: cinerinoapi.factory.paymentMethodType.Others,
                        name: 'LINE POS その他',
                        amount: price
                    },
                    purpose: { typeOf: cinerinoapi.factory.transactionType.PlaceOrder, id: params.transactionId }
                });
                yield lineClient_1.default.pushMessage(params.user.userId, { type: 'text', text: '決済の承認がとれました' });
                break;
            default:
                throw new Error(`Unknown payment method ${params.paymentMethodType}`);
        }
        // 購入者情報確認
        let profile;
        if ((yield params.user.getCredentials()) !== undefined) {
            yield lineClient_1.default.pushMessage(params.user.userId, { type: 'text', text: 'プロフィールを検索しています...' });
            // const loginTicket = params.user.authClient.verifyIdToken({});
            profile = yield personService.getProfile({});
            const lineProfile = yield lineClient_1.default.getProfile(params.user.userId);
            profile = {
                givenName: (profile.givenName === '') ? lineProfile.displayName : profile.givenName,
                familyName: (profile.familyName === '') ? 'LINE' : profile.familyName,
                email: profile.email,
                telephone: (profile.telephone === '') ? '+819012345678' : profile.telephone
            };
        }
        const setCustomerContactQuery = qs.stringify({ profile: profile });
        const setCustomerContactUri = `/transactions/placeOrder/${params.transactionId}/setCustomerContact?${setCustomerContactQuery}`;
        const liffUri = `line://app/${process.env.LIFF_ID}?${qs.stringify({ cb: setCustomerContactUri })}`;
        const footerContets = [
            {
                type: 'button',
                // flex: 2,
                style: 'secondary',
                action: {
                    type: 'uri',
                    label: '変更する',
                    uri: liffUri
                }
            }
        ];
        if (profile !== undefined) {
            footerContets.push({
                type: 'button',
                style: 'primary',
                action: {
                    type: 'postback',
                    label: '注文する',
                    data: qs.stringify({
                        action: 'setCustomerContact',
                        transactionId: params.transactionId,
                        familyName: profile.familyName,
                        givenName: profile.givenName,
                        email: profile.email,
                        telephone: profile.telephone
                    })
                }
            });
        }
        yield lineClient_1.default.pushMessage(params.user.userId, [
            {
                type: 'flex',
                altText: 'This is a Flex Message',
                contents: {
                    type: 'bubble',
                    styles: {
                        footer: {
                            separator: true
                        }
                    },
                    body: {
                        type: 'box',
                        layout: 'vertical',
                        contents: [
                            {
                                type: 'text',
                                text: '購入者情報をご確認ください',
                                weight: 'bold',
                                color: '#1DB446',
                                size: 'sm'
                            },
                            {
                                type: 'separator',
                                margin: 'xxl'
                            },
                            {
                                type: 'box',
                                layout: 'vertical',
                                margin: 'xxl',
                                spacing: 'sm',
                                contents: [
                                    {
                                        type: 'box',
                                        layout: 'vertical',
                                        margin: 'lg',
                                        spacing: 'sm',
                                        contents: [
                                            {
                                                type: 'box',
                                                layout: 'baseline',
                                                spacing: 'sm',
                                                contents: [
                                                    {
                                                        type: 'text',
                                                        text: 'Name',
                                                        color: '#aaaaaa',
                                                        size: 'sm',
                                                        flex: 1
                                                    },
                                                    {
                                                        type: 'text',
                                                        text: (profile !== undefined) ? `${profile.givenName} ${profile.familyName}` : '---',
                                                        wrap: true,
                                                        size: 'sm',
                                                        color: '#666666',
                                                        flex: 4
                                                    }
                                                ]
                                            },
                                            {
                                                type: 'box',
                                                layout: 'baseline',
                                                spacing: 'sm',
                                                contents: [
                                                    {
                                                        type: 'text',
                                                        text: 'Email',
                                                        color: '#aaaaaa',
                                                        size: 'sm',
                                                        flex: 1
                                                    },
                                                    {
                                                        type: 'text',
                                                        text: (profile !== undefined) ? profile.email : '---',
                                                        wrap: true,
                                                        size: 'sm',
                                                        color: '#666666',
                                                        flex: 4
                                                    }
                                                ]
                                            },
                                            {
                                                type: 'box',
                                                layout: 'baseline',
                                                spacing: 'sm',
                                                contents: [
                                                    {
                                                        type: 'text',
                                                        text: 'Tel',
                                                        color: '#aaaaaa',
                                                        size: 'sm',
                                                        flex: 1
                                                    },
                                                    {
                                                        type: 'text',
                                                        text: (profile !== undefined) ? profile.telephone : '---',
                                                        wrap: true,
                                                        size: 'sm',
                                                        color: '#666666',
                                                        flex: 4
                                                    }
                                                ]
                                            }
                                        ]
                                    }
                                ]
                            }
                        ]
                    },
                    footer: {
                        type: 'box',
                        layout: 'vertical',
                        spacing: 'sm',
                        contents: footerContets
                    }
                }
            }
        ]);
    });
}
exports.selectPaymentMethodType = selectPaymentMethodType;
/**
 * クレジットカード選択
 */
// tslint:disable-next-line:max-func-body-length
function selectCreditCard(params) {
    return __awaiter(this, void 0, void 0, function* () {
        const sellerService = new cinerinoapi.service.Seller({
            endpoint: process.env.CINERINO_ENDPOINT,
            auth: params.user.authClient,
            project: { id: process.env.PROJECT_ID }
        });
        const searchOrganizationsResult = yield sellerService.search({ limit: 1 });
        const seller = searchOrganizationsResult.data[0];
        if (seller.paymentAccepted === undefined) {
            throw new Error('許可された決済方法が見つかりません');
        }
        const creditCardPayment = seller.paymentAccepted.find((p) => p.paymentMethodType === cinerinoapi.factory.paymentMethodType.CreditCard);
        if (creditCardPayment === undefined) {
            throw new Error('クレジットカード決済が許可されていません');
        }
        const inputCreditCardUri = `/transactions/placeOrder/${params.transactionId}/inputCreditCard?gmoShopId=${creditCardPayment.gmoInfo.shopId}`;
        const liffUri = `line://app/${process.env.LIFF_ID}?${qs.stringify({ cb: inputCreditCardUri })}`;
        const footerContets = [
            {
                type: 'button',
                // flex: 2,
                style: 'secondary',
                action: {
                    type: 'uri',
                    label: '入力する',
                    uri: liffUri
                }
            }
        ];
        // ログイン状態の場合、会員カードを選択肢に追加
        if ((yield params.user.getCredentials()) !== undefined) {
            const personOwnershipInfoService = new cinerinoapi.service.person.OwnershipInfo({
                endpoint: process.env.CINERINO_ENDPOINT,
                auth: params.user.authClient,
                project: { id: process.env.PROJECT_ID }
            });
            const creditCards = yield personOwnershipInfoService.searchCreditCards({});
            yield lineClient_1.default.pushMessage(params.user.userId, { type: 'text', text: `${creditCards.length}件のクレジットカードが見つかりました` });
            if (creditCards.length > 0) {
                const creditCard = creditCards[0];
                footerContets.push({
                    type: 'button',
                    style: 'primary',
                    action: {
                        type: 'postback',
                        label: creditCard.cardNo,
                        data: qs.stringify({
                            action: 'selectPaymentMethodType',
                            transactionId: params.transactionId,
                            paymentMethod: cinerinoapi.factory.paymentMethodType.CreditCard,
                            creditCard: {
                                memberId: 'me',
                                cardSeq: creditCard.cardSeq
                            }
                        })
                    }
                });
            }
        }
        yield lineClient_1.default.pushMessage(params.user.userId, [
            {
                type: 'flex',
                altText: 'This is a Flex Message',
                contents: {
                    type: 'bubble',
                    styles: {
                        footer: {
                            separator: true
                        }
                    },
                    body: {
                        type: 'box',
                        layout: 'vertical',
                        contents: [
                            {
                                type: 'text',
                                text: 'クレジットカードを選択してください',
                                weight: 'bold',
                                color: '#1DB446',
                                size: 'sm'
                            }
                        ]
                    },
                    footer: {
                        type: 'box',
                        layout: 'vertical',
                        spacing: 'sm',
                        contents: footerContets
                    }
                }
            }
        ]);
    });
}
exports.selectCreditCard = selectCreditCard;
/**
 * 購入者情報決定
 */
function setCustomerContact(params) {
    return __awaiter(this, void 0, void 0, function* () {
        const sellerService = new cinerinoapi.service.Seller({
            endpoint: process.env.CINERINO_ENDPOINT,
            auth: params.user.authClient,
            project: { id: process.env.PROJECT_ID }
        });
        const placeOrderService = new cinerinoapi.service.txn.PlaceOrder({
            endpoint: process.env.CINERINO_ENDPOINT,
            auth: params.user.authClient,
            project: { id: process.env.PROJECT_ID }
        });
        const transaction = yield params.user.findTransaction();
        const seller = yield sellerService.findById({ id: transaction.seller.id });
        const seatReservationAuthorization = yield params.user.findSeatReservationAuthorization();
        if (seatReservationAuthorization.result === undefined) {
            throw new Error('Invalid seat reservation authorization');
        }
        const tmpReservations = (Array.isArray(seatReservationAuthorization.result.responseBody.object.reservations))
            ? seatReservationAuthorization.result.responseBody.object.reservations
            : [];
        const profile = {
            familyName: params.familyName,
            givenName: params.givenName,
            email: params.email,
            name: `${params.givenName} ${params.familyName}`,
            telephone: params.telephone
        };
        yield placeOrderService.setCustomerContact({
            id: params.transactionId,
            object: {
                customerContact: profile
            }
        });
        yield placeOrderService.setProfile({
            id: params.transactionId,
            agent: profile
        });
        // 注文内容確認
        yield lineClient_1.default.pushMessage(params.user.userId, [
            contentsBuilder_1.createConfirmOrderFlexBubble({
                seller: seller,
                profile: profile,
                tmpReservations: tmpReservations,
                id: params.transactionId,
                price: seatReservationAuthorization.result.price
            })
        ]);
    });
}
exports.setCustomerContact = setCustomerContact;
function confirmOrder(params) {
    return __awaiter(this, void 0, void 0, function* () {
        yield lineClient_1.default.replyMessage(params.replyToken, { type: 'text', text: '注文を確定しています...' });
        const placeOrderService = new cinerinoapi.service.txn.PlaceOrder({
            endpoint: process.env.CINERINO_ENDPOINT,
            auth: params.user.authClient,
            project: { id: process.env.PROJECT_ID }
        });
        const { order } = yield placeOrderService.confirm({
            id: params.transactionId,
            potentialActions: {
                order: {
                    potentialActions: {
                        sendOrder: {
                            potentialActions: {
                                sendEmailMessage: [{
                                        object: {
                                            about: 'LINE Ticket 注文配送完了',
                                            sender: { email: 'cinerino-line-ticket@example.com' },
                                            toRecipient: { name: `LINE User ${params.user.userId}` }
                                        }
                                    }]
                            }
                        }
                    }
                }
            }
            // options: {
            //     sendEmailMessage: true,
            //     email: {
            //         about: 'LINE Ticket 注文配送完了',
            //         sender: { email: 'cinerino-line-ticket@example.com' },
            //         toRecipient: { name: `LINE User ${params.user.userId}` }
            //     }
            // }
        });
        const flex = {
            type: 'flex',
            altText: 'This is a Flex Message',
            contents: contentsBuilder_1.order2flexBubble({ order })
        };
        yield lineClient_1.default.pushMessage(params.user.userId, [flex]);
    });
}
exports.confirmOrder = confirmOrder;
function cancelOrder(params) {
    return __awaiter(this, void 0, void 0, function* () {
        yield lineClient_1.default.replyMessage(params.replyToken, { type: 'text', text: '注文取引をキャンセルしています...' });
        const placeOrderService = new cinerinoapi.service.txn.PlaceOrder({
            endpoint: process.env.CINERINO_ENDPOINT,
            auth: params.user.authClient,
            project: { id: process.env.PROJECT_ID }
        });
        yield placeOrderService.cancel({
            id: params.transactionId
        });
        yield lineClient_1.default.pushMessage(params.user.userId, { type: 'text', text: '注文取引をキャンセルしました' });
    });
}
exports.cancelOrder = cancelOrder;
/**
 * 友達決済を承認確定
 */
function confirmFriendPay(params) {
    return __awaiter(this, void 0, void 0, function* () {
        yield lineClient_1.default.replyMessage(params.replyToken, { type: 'text', text: 'implementing...' });
        // const friendPayInfo = await params.user.verifyFriendPayToken(params.token);
        // await LINE.replyMessage(params.replyToken, { type: 'text', text: `${friendPayInfo.price}円の友達決済を受け付けます` });
        // await LINE.pushMessage(params.user.userId, { type: 'text', text: '残高を確認しています...' });
        // const personService = new cinerinoapi.service.Person({
        //     endpoint: <string>process.env.CINERINO_ENDPOINT,
        //     auth: params.user.authClient
        // });
        // const placeOrderService = new cinerinoapi.service.txn.PlaceOrder({
        //     endpoint: <string>process.env.CINERINO_ENDPOINT,
        //     auth: params.user.authClient
        // });
        // const actionRepo = new cinerino.repository.Action(cinerino.mongoose.connection);
        // const authorizeActions = await actionRepo.findAuthorizeByTransactionId(friendPayInfo.transactionId);
        // const seatReservations = <cinerinoapi.factory.action.authorize.offer.seatReservation.IAction[]>authorizeActions
        //     .filter((a) => a.actionStatus === cinerinoapi.factory.actionStatusType.CompletedActionStatus)
        //     .filter((a) => a.object.typeOf === cinerinoapi.factory.action.authorize.offer.seatReservation.ObjectType.SeatReservation);
        // const requiredPoint = (<cinerinoapi.factory.action.authorize.offer.seatReservation.IResult>seatReservations[0].result).point;
        // let accounts = await personService.searchAccounts({ accountType: cinerinoapi.factory.accountType.Coin })
        //     .then((ownershipInfos) => ownershipInfos.map((o) => o.typeOfGood));
        // accounts = accounts.filter((a) => a.status === cinerinoapi.factory.pecorino.accountStatusType.Opened);
        // debug('accounts:', accounts);
        // if (accounts.length === 0) {
        //     throw new Error('口座未開設です');
        // }
        // const account = accounts[0];
        // const pecorinoAuthorization = await placeOrderService.authorizeAccountPayment({
        //     transactionId: friendPayInfo.transactionId,
        //     amount: requiredPoint,
        //     fromAccount: {
        //         accountType: cinerinoapi.factory.accountType.Coin,
        //         accountNumber: account.accountNumber
        //     }
        // });
        // debug('残高確認済', pecorinoAuthorization);
        // await LINE.pushMessage(params.user.userId, { type: 'text', text: '残高の確認がとれました' });
        // await LINE.pushMessage(params.user.userId, { type: 'text', text: '友達決済を承認しました' });
        // const template: TemplateMessage = {
        //     type: 'template',
        //     altText: 'This is a buttons template',
        //     template: {
        //         type: 'confirm',
        //         text: '取引を続行しますか?',
        //         actions: [
        //             {
        //                 type: 'postback',
        //                 label: 'Yes',
        //                 data: qs.stringify({
        //                     action: 'continueTransactionAfterFriendPayConfirmation',
        //                     transactionId: friendPayInfo.transactionId,
        //                     price: friendPayInfo.price
        //                 })
        //             },
        //             {
        //                 type: 'postback',
        //                 label: 'No',
        //                 data: qs.stringify({
        //                     action: 'cancelTransactionAfterFriendPayConfirmation',
        //                     transactionId: friendPayInfo.transactionId,
        //                     price: friendPayInfo.price
        //                 })
        //             }
        //         ]
        //     }
        // };
        // await LINE.pushMessage(params.user.userId, [template]);
    });
}
exports.confirmFriendPay = confirmFriendPay;
/**
 * おこづかい承認確定
 */
function confirmTransferMoney(params) {
    return __awaiter(this, void 0, void 0, function* () {
        const transferMoneyInfo = yield params.user.verifyTransferMoneyToken(params.token);
        yield lineClient_1.default.replyMessage(params.replyToken, { type: 'text', text: `${transferMoneyInfo.name}に${params.price}円の振込を実行します...` });
        const personService = new cinerinoapi.service.Person({
            endpoint: process.env.CINERINO_ENDPOINT,
            auth: params.user.authClient,
            project: { id: process.env.PROJECT_ID }
        });
        const personOwnershipInfoService = new cinerinoapi.service.person.OwnershipInfo({
            endpoint: process.env.CINERINO_ENDPOINT,
            auth: params.user.authClient,
            project: { id: process.env.PROJECT_ID }
        });
        const sellerService = new cinerinoapi.service.Seller({
            endpoint: process.env.CINERINO_ENDPOINT,
            auth: params.user.authClient,
            project: { id: process.env.PROJECT_ID }
        });
        const searchAccountsResult = yield personOwnershipInfoService.search({
            typeOfGood: {
                typeOf: cinerinoapi.factory.ownershipInfo.AccountGoodType.Account,
                accountType: cinerinoapi.factory.accountType.Coin
            }
        });
        const accounts = searchAccountsResult.data
            .map((o) => o.typeOfGood)
            .filter((a) => a.status === cinerinoapi.factory.pecorino.accountStatusType.Opened);
        const account = accounts.shift();
        if (account === undefined) {
            throw new Error('コイン口座未開設なので振込を実行できません');
        }
        // 取引に販売者を指定する必要があるので、適当に検索
        const searchSellersResult = yield sellerService.search({ limit: 1 });
        const seller = searchSellersResult.data.shift();
        if (seller === undefined) {
            throw new Error('販売者が見つかりませんでした');
        }
        const profile = yield personService.getProfile({});
        yield coin_1.processTransferCoin({
            user: params.user,
            amount: params.price,
            fromLocation: {
                accountNumber: account.accountNumber
            },
            transferMoneyInfo: transferMoneyInfo,
            profile: profile,
            seller: seller
        });
    });
}
exports.confirmTransferMoney = confirmTransferMoney;
/**
 * コイン口座入金金額選択
 */
function selectDepositAmount(params) {
    return __awaiter(this, void 0, void 0, function* () {
        const message = {
            type: 'text',
            text: 'いくら入金しますか?',
            quickReply: {
                items: [
                    {
                        type: 'action',
                        imageUrl: `https://${params.user.host}/img/labels/coin-64.png`,
                        action: {
                            type: 'postback',
                            label: '100',
                            data: qs.stringify({
                                action: 'depositCoinByCreditCard',
                                amount: 100,
                                accountType: params.accountType,
                                toAccountNumber: params.accountNumber
                            })
                        }
                    },
                    {
                        type: 'action',
                        imageUrl: `https://${params.user.host}/img/labels/coin-64.png`,
                        action: {
                            type: 'postback',
                            label: '1000',
                            data: qs.stringify({
                                action: 'depositCoinByCreditCard',
                                amount: 1000,
                                accountType: params.accountType,
                                toAccountNumber: params.accountNumber
                            })
                        }
                    },
                    {
                        type: 'action',
                        imageUrl: `https://${params.user.host}/img/labels/coin-64.png`,
                        action: {
                            type: 'postback',
                            label: '10000',
                            data: qs.stringify({
                                action: 'depositCoinByCreditCard',
                                amount: 10000,
                                accountType: params.accountType,
                                toAccountNumber: params.accountNumber
                            })
                        }
                    }
                ]
            }
        };
        yield lineClient_1.default.pushMessage(params.user.userId, [message]);
    });
}
exports.selectDepositAmount = selectDepositAmount;
/**
 * クレジット決済でコイン入金
 */
function depositCoinByCreditCard(params) {
    return __awaiter(this, void 0, void 0, function* () {
        yield lineClient_1.default.replyMessage(params.replyToken, { type: 'text', text: `${params.amount}円の入金処理を実行します...` });
        const personService = new cinerinoapi.service.Person({
            endpoint: process.env.CINERINO_ENDPOINT,
            auth: params.user.authClient,
            project: { id: process.env.PROJECT_ID }
        });
        const personOwnershipInfoService = new cinerinoapi.service.person.OwnershipInfo({
            endpoint: process.env.CINERINO_ENDPOINT,
            auth: params.user.authClient,
            project: { id: process.env.PROJECT_ID }
        });
        const sellerService = new cinerinoapi.service.Seller({
            endpoint: process.env.CINERINO_ENDPOINT,
            auth: params.user.authClient,
            project: { id: process.env.PROJECT_ID }
        });
        const creditCards = yield personOwnershipInfoService.searchCreditCards({});
        const creditCard = creditCards.shift();
        if (creditCard === undefined) {
            throw new Error('クレジットカードが登録されていません');
        }
        const lineProfile = yield lineClient_1.default.getProfile(params.user.userId);
        // 取引に販売者を指定する必要があるので、適当に検索
        const searchSellersResult = yield sellerService.search({ limit: 1 });
        const seller = searchSellersResult.data.shift();
        if (seller === undefined) {
            throw new Error('販売者が見つかりませんでした');
        }
        const profile = yield personService.getProfile({});
        // 入金取引
        yield coin_1.processOrderCoin({
            replyToken: params.replyToken,
            user: params.user,
            amount: params.amount,
            toLocation: {
                accountNumber: params.toAccountNumber
            },
            creditCard: {
                memberId: 'me',
                cardSeq: Number(creditCard.cardSeq)
            },
            profile: {
                givenName: (profile.givenName === '') ? lineProfile.displayName : profile.givenName,
                familyName: (profile.familyName === '') ? 'LINE' : profile.familyName,
                email: profile.email,
                telephone: (profile.telephone === '') ? '+819012345678' : profile.telephone
            },
            seller: seller
        });
    });
}
exports.depositCoinByCreditCard = depositCoinByCreditCard;
/**
 * クレジットカード検索
 */
function searchCreditCards(params) {
    return __awaiter(this, void 0, void 0, function* () {
        yield lineClient_1.default.replyMessage(params.replyToken, { type: 'text', text: 'クレジットカードを検索しています...' });
        const personOwnershipInfoService = new cinerinoapi.service.person.OwnershipInfo({
            endpoint: process.env.CINERINO_ENDPOINT,
            auth: params.user.authClient,
            project: { id: process.env.PROJECT_ID }
        });
        const creditCards = yield personOwnershipInfoService.searchCreditCards({});
        yield lineClient_1.default.pushMessage(params.user.userId, { type: 'text', text: `${creditCards.length}件のクレジットカードがみつかりました` });
        if (creditCards.length > 0) {
            const flex = {
                type: 'flex',
                altText: 'This is a Flex Message',
                contents: {
                    type: 'carousel',
                    contents: [
                        ...creditCards.map((creditCard) => {
                            return contentsBuilder_1.creditCard2flexBubble({ creditCard: creditCard, user: params.user });
                        })
                    ]
                }
            };
            yield lineClient_1.default.pushMessage(params.user.userId, [flex]);
        }
    });
}
exports.searchCreditCards = searchCreditCards;
function addCreditCard(params) {
    return __awaiter(this, void 0, void 0, function* () {
        const personOwnershipInfoService = new cinerinoapi.service.person.OwnershipInfo({
            endpoint: process.env.CINERINO_ENDPOINT,
            auth: params.user.authClient,
            project: { id: process.env.PROJECT_ID }
        });
        const creditCard = yield personOwnershipInfoService.addCreditCard({ creditCard: { token: params.token } });
        yield lineClient_1.default.replyMessage(params.replyToken, { type: 'text', text: `クレジットカード ${creditCard.cardNo} が追加されました` });
    });
}
exports.addCreditCard = addCreditCard;
function deleteCreditCard(params) {
    return __awaiter(this, void 0, void 0, function* () {
        const personOwnershipInfoService = new cinerinoapi.service.person.OwnershipInfo({
            endpoint: process.env.CINERINO_ENDPOINT,
            auth: params.user.authClient,
            project: { id: process.env.PROJECT_ID }
        });
        yield personOwnershipInfoService.deleteCreditCard({ cardSeq: params.cardSeq });
        yield lineClient_1.default.replyMessage(params.replyToken, { type: 'text', text: 'クレジットカードが削除されました' });
    });
}
exports.deleteCreditCard = deleteCreditCard;
/**
 * 口座開設
 */
function openAccount(params) {
    return __awaiter(this, void 0, void 0, function* () {
        const personOwnershipInfoService = new cinerinoapi.service.person.OwnershipInfo({
            endpoint: process.env.CINERINO_ENDPOINT,
            auth: params.user.authClient,
            project: { id: process.env.PROJECT_ID }
        });
        const accountOwnershipInfo = yield personOwnershipInfoService.openAccount({
            name: params.name,
            accountType: params.accountType
        });
        yield lineClient_1.default.replyMessage(params.replyToken, {
            type: 'text',
            text: `${params.accountType}口座 ${accountOwnershipInfo.typeOfGood.accountNumber} が開設されました`
        });
    });
}
exports.openAccount = openAccount;
/**
 * 口座解約
 */
function closeAccount(params) {
    return __awaiter(this, void 0, void 0, function* () {
        const personOwnershipInfoService = new cinerinoapi.service.person.OwnershipInfo({
            endpoint: process.env.CINERINO_ENDPOINT,
            auth: params.user.authClient,
            project: { id: process.env.PROJECT_ID }
        });
        yield personOwnershipInfoService.closeAccount({ accountType: params.accountType, accountNumber: params.accountNumber });
        yield lineClient_1.default.replyMessage(params.replyToken, { type: 'text', text: `${params.accountType}口座 ${params.accountNumber} が解約されました` });
    });
}
exports.closeAccount = closeAccount;
function searchCoinAccounts(params) {
    return __awaiter(this, void 0, void 0, function* () {
        const personOwnershipInfoService = new cinerinoapi.service.person.OwnershipInfo({
            endpoint: process.env.CINERINO_ENDPOINT,
            auth: params.user.authClient,
            project: { id: process.env.PROJECT_ID }
        });
        const searchAccountsResult = yield personOwnershipInfoService.search({
            typeOfGood: {
                typeOf: cinerinoapi.factory.ownershipInfo.AccountGoodType.Account,
                accountType: cinerinoapi.factory.accountType.Coin
            }
        });
        const accountOwnershipInfos = searchAccountsResult.data
            .filter((o) => o.typeOfGood.status === cinerinoapi.factory.pecorino.accountStatusType.Opened);
        if (accountOwnershipInfos.length === 0) {
            throw new Error('口座未開設です');
        }
        const flex = {
            type: 'flex',
            altText: 'This is a Flex Message',
            contents: {
                type: 'carousel',
                contents: [
                    ...accountOwnershipInfos.map((ownershipInfo) => {
                        return contentsBuilder_1.account2flexBubble({ ownershipInfo: ownershipInfo, user: params.user });
                    })
                ]
            }
        };
        yield lineClient_1.default.pushMessage(params.user.userId, [flex]);
    });
}
exports.searchCoinAccounts = searchCoinAccounts;
/**
 * 口座取引履歴検索
 */
function searchAccountMoneyTransferActions(params) {
    return __awaiter(this, void 0, void 0, function* () {
        const personOwnershipInfoService = new cinerinoapi.service.person.OwnershipInfo({
            endpoint: process.env.CINERINO_ENDPOINT,
            auth: params.user.authClient,
            project: { id: process.env.PROJECT_ID }
        });
        const searchAccountsResult = yield personOwnershipInfoService.search({
            typeOfGood: {
                typeOf: cinerinoapi.factory.ownershipInfo.AccountGoodType.Account,
                accountType: params.accountType
            }
        });
        const accountOwnershipInfo = searchAccountsResult.data.find((o) => o.typeOfGood.accountNumber === params.accountNumber);
        debug('accounts:', accountOwnershipInfo);
        if (accountOwnershipInfo === undefined) {
            throw new Error('口座が見つかりません');
        }
        yield lineClient_1.default.replyMessage(params.replyToken, { type: 'text', text: '取引履歴を検索します...' });
        const searchActions = yield personOwnershipInfoService.searchAccountMoneyTransferActions({
            limit: 10,
            page: 1,
            sort: {
                startDate: cinerinoapi.factory.pecorino.sortType.Descending
            },
            accountType: params.accountType,
            accountNumber: params.accountNumber
        });
        const transferActions = searchActions.data;
        if (searchActions.data.length === 0) {
            yield lineClient_1.default.pushMessage(params.user.userId, { type: 'text', text: 'まだ取引履歴はありません' });
            return;
        }
        yield lineClient_1.default.pushMessage(params.user.userId, {
            type: 'text',
            text: '取引履歴が見つかりました'
        });
        if (transferActions.length > 0) {
            yield lineClient_1.default.pushMessage(params.user.userId, { type: 'text', text: `直近の${transferActions.length}件は以下の通りです` });
            const flex = {
                type: 'flex',
                altText: 'This is a Flex Message',
                contents: {
                    type: 'carousel',
                    contents: [
                        ...transferActions.map((a) => {
                            return contentsBuilder_1.moneyTransferAction2flexBubble({ action: a, user: params.user });
                        })
                    ]
                }
            };
            yield lineClient_1.default.pushMessage(params.user.userId, [flex]);
        }
    });
}
exports.searchAccountMoneyTransferActions = searchAccountMoneyTransferActions;
/**
 * ユーザーのチケット(座席予約)を検索する
 */
function searchScreeningEventReservations(params) {
    return __awaiter(this, void 0, void 0, function* () {
        const now = new Date();
        yield lineClient_1.default.replyMessage(params.replyToken, { type: 'text', text: 'ここ一カ月の座席予約を検索しています...' });
        const personOwnershipInfoService = new cinerinoapi.service.person.OwnershipInfo({
            endpoint: process.env.CINERINO_ENDPOINT,
            auth: params.user.authClient,
            project: { id: process.env.PROJECT_ID }
        });
        const searchScreeningEventReservationsResult = yield personOwnershipInfoService.search({
            typeOfGood: {
                typeOf: cinerinoapi.factory.chevre.reservationType.EventReservation
            },
            ownedFrom: moment(now)
                .add(-1, 'month')
                .toDate(),
            ownedThrough: now,
            limit: 10,
            page: 1,
            sort: {
                ownedFrom: cinerinoapi.factory.sortType.Descending
            }
        });
        const ownershipInfos = searchScreeningEventReservationsResult.data;
        // 未来の予約
        if (searchScreeningEventReservationsResult.data.length === 0) {
            yield lineClient_1.default.pushMessage(params.user.userId, { type: 'text', text: '座席予約が見つかりませんでした' });
        }
        else {
            yield lineClient_1.default.pushMessage(params.user.userId, {
                type: 'text',
                text: '座席予約が見つかりました'
            });
            yield lineClient_1.default.pushMessage(params.user.userId, { type: 'text', text: `直近の${ownershipInfos.length}件は以下の通りです` });
            const flex = {
                type: 'flex',
                altText: 'This is a Flex Message',
                contents: {
                    type: 'carousel',
                    contents: [
                        ...ownershipInfos
                            .map((ownershipInfo) => {
                            return contentsBuilder_1.reservation2flexBubble({ ownershipInfo: ownershipInfo });
                        })
                    ]
                }
            };
            yield lineClient_1.default.pushMessage(params.user.userId, [flex]);
        }
    });
}
exports.searchScreeningEventReservations = searchScreeningEventReservations;
/**
 * 座席仮予約
 */
// tslint:disable-next-line:max-func-body-length
function selectSeatOffers(params) {
    var _a, _b, _c, _d, _e;
    return __awaiter(this, void 0, void 0, function* () {
        const eventService = new cinerinoapi.service.Event({
            endpoint: process.env.CINERINO_ENDPOINT,
            auth: params.user.authClient,
            project: { id: process.env.PROJECT_ID }
        });
        const sellerService = new cinerinoapi.service.Seller({
            endpoint: process.env.CINERINO_ENDPOINT,
            auth: params.user.authClient,
            project: { id: process.env.PROJECT_ID }
        });
        const placeOrderService = new cinerinoapi.service.txn.PlaceOrder({
            endpoint: process.env.CINERINO_ENDPOINT,
            auth: params.user.authClient,
            project: { id: process.env.PROJECT_ID }
        });
        const event = yield eventService.findById({ id: params.eventId });
        const reservedSeatsAvailable = ((_c = (_b = (_a = event.offers) === null || _a === void 0 ? void 0 : _a.itemOffered.serviceOutput) === null || _b === void 0 ? void 0 : _b.reservedTicket) === null || _c === void 0 ? void 0 : _c.ticketedSeat) !== undefined;
        // 販売者情報取得(イベントのオファーに販売者情報あり)
        const searchSellersResult = yield sellerService.search({
            project: { id: { $eq: event.project.id } }
        });
        const seller = searchSellersResult.data.find((s) => {
            var _a, _b;
            return s.id === ((_b = (_a = event.offers) === null || _a === void 0 ? void 0 : _a.seller) === null || _b === void 0 ? void 0 : _b.id);
        });
        if (seller === undefined) {
            throw new Error(`イベントの販売者が見つかりません: ${(_e = (_d = event.offers) === null || _d === void 0 ? void 0 : _d.seller) === null || _e === void 0 ? void 0 : _e.id}`);
        }
        // 取引開始
        // 許可証トークンパラメーターがなければ、WAITERで許可証を取得
        // const passportToken = await request.post(
        //     `${process.env.WAITER_ENDPOINT}/passports`,
        //     {
        //         body: {
        //             scope: `placeOrderTransaction.${seller.id}`
        //         },
        //         json: true
        //     }
        // ).then((body) => body.token);
        // debug('passportToken published.', passportToken);
        const storeId = params.user.authClient.options.clientId;
        yield lineClient_1.default.pushMessage(params.user.userId, { type: 'text', text: `店舗ID:${storeId}でオファーを検索しています...` });
        let ticketOffers = yield eventService.searchTicketOffers({
            event: { id: params.eventId },
            seller: seller,
            store: { id: storeId }
        });
        yield lineClient_1.default.pushMessage(params.user.userId, { type: 'text', text: `${ticketOffers.length}件のオファーが見つかりました` });
        // ムビチケ以外のオファーを選択
        ticketOffers = ticketOffers.filter((offer) => {
            const movieTicketTypeChargeSpecification = offer.priceSpecification.priceComponent.find((component) => component.typeOf === cinerinoapi.factory.chevre.priceSpecificationType.MovieTicketTypeChargeSpecification);
            return movieTicketTypeChargeSpecification === undefined;
        });
        if (ticketOffers.length === 0) {
            throw new Error('ムビチケなしのオファーが見つかりません');
        }
        // 券種未選択であれば、券種選択へ
        if (params.offerId === undefined) {
            // tslint:disable-next-line:no-magic-numbers
            const quickReplyItems4selectOffer = ticketOffers.slice(0, 10)
                .map((o) => {
                var _a;
                const unitPriceSpec = o.priceSpecification.priceComponent.find((c) => c.typeOf === cinerinoapi.factory.chevre.priceSpecificationType.UnitPriceSpecification);
                const priceStr = (unitPriceSpec !== undefined) ? `${unitPriceSpec.price} ${unitPriceSpec.priceCurrency}` : '';
                const name = (typeof o.name === 'string') ? o.name : (_a = o.name) === null || _a === void 0 ? void 0 : _a.ja;
                return {
                    type: 'action',
                    imageUrl: `https://${params.user.host}/img/labels/reservation-ticket.png`,
                    action: {
                        type: 'postback',
                        label: `${String(name)
                            // tslint:disable-next-line:no-magic-numbers
                            .slice(0, 8)} ${priceStr}`,
                        data: qs.stringify({
                            action: 'selectSeatOffers',
                            seatNumbers: (params.seatNumbers !== undefined) ? params.seatNumbers.join(',') : undefined,
                            numSeats: params.numSeats,
                            eventId: params.eventId,
                            offerId: o.id
                        })
                    }
                };
            });
            const message4selectOffer = {
                type: 'text',
                text: '券種を選択してください',
                quickReply: {
                    items: quickReplyItems4selectOffer
                }
            };
            yield lineClient_1.default.pushMessage(params.user.userId, [message4selectOffer]);
            return;
        }
        const selectedTicketOffer = ticketOffers.find((o) => o.id === params.offerId);
        if (selectedTicketOffer === undefined) {
            yield lineClient_1.default.pushMessage(params.user.userId, { type: 'text', text: `オファー ${params.offerId} が見つかりません` });
            return;
        }
        yield lineClient_1.default.pushMessage(params.user.userId, { type: 'text', text: `オファー ${selectedTicketOffer.identifier} を選択しました` });
        const TRANSACTION_EXPIRES_IN_MINUTES = 5;
        yield lineClient_1.default.pushMessage(params.user.userId, { type: 'text', text: '取引を開始します...' });
        const transaction = yield placeOrderService.start({
            expires: moment()
                .add(TRANSACTION_EXPIRES_IN_MINUTES, 'minutes')
                .toDate(),
            seller: seller,
            object: {}
        });
        yield lineClient_1.default.pushMessage(params.user.userId, { type: 'text', text: `${TRANSACTION_EXPIRES_IN_MINUTES}分以内に取引を終了してください` });
        debug('transaction started.', transaction.id);
        yield params.user.saveTransaction(transaction);
        if (reservedSeatsAvailable) {
            if (params.seatNumbers === undefined) {
                yield lineClient_1.default.pushMessage(params.user.userId, { type: 'text', text: '座席が指定されていません' });
                return;
            }
            yield lineClient_1.default.pushMessage(params.user.userId, { type: 'text', text: `${event.name.ja}の座席を確保します...` });
            debug('creating a seat reservation authorization...');
            const seatReservationAuthorization = yield placeOrderService.authorizeSeatReservation({
                object: {
                    event: { id: event.id },
                    acceptedOffer: params.seatNumbers.map((seatNumber) => {
                        return {
                            id: selectedTicketOffer.id,
                            ticketedSeat: {
                                typeOf: cinerinoapi.factory.chevre.placeType.Seat,
                                seatNumber: seatNumber,
                                seatSection: 'Default',
                                seatRow: '',
                                seatingType: {}
                            },
                            additionalProperty: []
                        };
                    })
                },
                purpose: transaction
            });
            debug('seatReservationAuthorization:', seatReservationAuthorization);
            yield lineClient_1.default.pushMessage(params.user.userId, { type: 'text', text: `座席 ${params.seatNumbers.join(' ')} を確保しました` });
            yield params.user.saveSeatReservationAuthorization(seatReservationAuthorization);
        }
        else {
            if (params.numSeats === undefined) {
                yield lineClient_1.default.pushMessage(params.user.userId, { type: 'text', text: '枚数が指定されていません' });
                return;
            }
            yield lineClient_1.default.pushMessage(params.user.userId, { type: 'text', text: `${params.numSeats}枚を確保します...` });
            debug('creating a seat reservation authorization...');
            const seatReservationAuthorization = yield placeOrderService.authorizeSeatReservation({
                object: {
                    event: { id: event.id },
                    // tslint:disable-next-line:prefer-array-literal
                    acceptedOffer: [...Array(params.numSeats)].map(() => {
                        return {
                            id: selectedTicketOffer.id,
                            additionalProperty: []
                        };
                    })
                },
                purpose: transaction
            });
            debug('seatReservationAuthorization:', seatReservationAuthorization);
            yield lineClient_1.default.pushMessage(params.user.userId, { type: 'text', text: `${params.numSeats}枚を確保しました` });
            yield params.user.saveSeatReservationAuthorization(seatReservationAuthorization);
        }
        const quickReplyItems = [
            {
                type: 'action',
                imageUrl: `https://${params.user.host}/img/labels/credit-card-64.png`,
                action: {
                    type: 'postback',
                    label: 'クレジットカード',
                    data: qs.stringify({
                        action: 'selectCreditCard',
                        transactionId: transaction.id
                    })
                }
            }
        ];
        if ((yield params.user.getCredentials()) !== undefined) {
            quickReplyItems.push({
                type: 'action',
                imageUrl: `https://${params.user.host}/img/labels/coin-64.png`,
                action: {
                    type: 'postback',
                    label: 'コイン',
                    data: qs.stringify({
                        action: 'selectPaymentMethodType',
                        paymentMethod: cinerinoapi.factory.paymentMethodType.Account,
                        transactionId: transaction.id
                    })
                }
            }, {
                type: 'action',
                imageUrl: `https://${params.user.host}/img/labels/friend-pay-50.png`,
                action: {
                    type: 'postback',
                    label: 'Friend Pay',
                    data: qs.stringify({
                        action: 'askPaymentCode',
                        transactionId: transaction.id
                    })
                }
            }, {
                type: 'action',
                imageUrl: `https://${params.user.host}/img/labels/coin-64.png`,
                action: {
                    type: 'postback',
                    label: 'その他',
                    data: qs.stringify({
                        action: 'selectPaymentMethodType',
                        paymentMethod: cinerinoapi.factory.paymentMethodType.Others,
                        transactionId: transaction.id
                    })
                }
            });
        }
        const message = {
            type: 'text',
            text: '決済方法を選択してください',
            quickReply: {
                items: quickReplyItems
            }
        };
        yield lineClient_1.default.pushMessage(params.user.userId, [message]);
    });
}
exports.selectSeatOffers = selectSeatOffers;
/**
 * 所有権コード発行
 */
// tslint:disable-next-line:max-func-body-length
function authorizeOwnershipInfo(params) {
    var _a;
    return __awaiter(this, void 0, void 0, function* () {
        yield lineClient_1.default.replyMessage(params.replyToken, { type: 'text', text: 'コード発行中...' });
        const personOwnershipInfoService = new cinerinoapi.service.person.OwnershipInfo({
            endpoint: process.env.CINERINO_ENDPOINT,
            auth: params.user.authClient,
            project: { id: process.env.PROJECT_ID }
        });
        const eventService = new cinerinoapi.service.Event({
            endpoint: process.env.CINERINO_ENDPOINT,
            auth: params.user.authClient,
            project: { id: process.env.PROJECT_ID }
        });
        const { code } = yield personOwnershipInfoService.authorize({
            ownershipInfoId: params.id
        });
        yield lineClient_1.default.pushMessage(params.user.userId, { type: 'text', text: 'コードが発行されました' });
        let flex;
        switch (params.goodType) {
            case cinerinoapi.factory.chevre.reservationType.EventReservation:
                const searchScreeningEventReservationsResult = yield personOwnershipInfoService.search({
                    typeOfGood: {
                        typeOf: cinerinoapi.factory.chevre.reservationType.EventReservation
                    }
                });
                const ownershipInfos = searchScreeningEventReservationsResult.data;
                const reservation = ownershipInfos.find((o) => o.id === params.id);
                if (reservation === undefined) {
                    throw new Error('Reservation not found');
                }
                const itemOffered = reservation.typeOfGood;
                const event = yield eventService.findById({
                    id: itemOffered.reservationFor.id
                });
                const thumbnailImageUrl = (event.workPerformed !== undefined
                    && event.workPerformed.thumbnailUrl !== undefined
                    && event.workPerformed.thumbnailUrl !== null)
                    ? event.workPerformed.thumbnailUrl
                    // tslint:disable-next-line:max-line-length
                    : 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRrhpsOJOcLBwc1SPD9sWlinildy4S05-I2Wf6z2wRXnSxbmtRz';
                flex = {
                    type: 'flex',
                    altText: 'This is a Flex Message',
                    contents: {
                        type: 'carousel',
                        contents: [
                            {
                                type: 'bubble',
                                hero: {
                                    type: 'image',
                                    url: thumbnailImageUrl,
                                    size: 'full',
                                    aspectRatio: '20:13',
                                    aspectMode: 'cover',
                                    action: {
                                        type: 'uri',
                                        label: 'event',
                                        // tslint:disable-next-line:no-http-string
                                        uri: 'http://linecorp.com/'
                                    }
                                },
                                body: {
                                    type: 'box',
                                    layout: 'vertical',
                                    spacing: 'md',
                                    contents: [
                                        {
                                            type: 'text',
                                            text: String(event.name.ja),
                                            wrap: true,
                                            weight: 'bold',
                                            gravity: 'center',
                                            size: 'xl'
                                        },
                                        {
                                            type: 'box',
                                            layout: 'vertical',
                                            margin: 'lg',
                                            spacing: 'sm',
                                            contents: [
                                                {
                                                    type: 'box',
                                                    layout: 'baseline',
                                                    spacing: 'sm',
                                                    contents: [
                                                        {
                                                            type: 'text',
                                                            text: '日時',
                                                            color: '#aaaaaa',
                                                            size: 'sm',
                                                            flex: 1
                                                        },
                                                        {
                                                            type: 'text',
                                                            text: moment(event.startDate)
                                                                .format('llll'),
                                                            wrap: true,
                                                            size: 'sm',
                                                            color: '#666666',
                                                            flex: 4
                                                        }
                                                    ]
                                                },
                                                {
                                                    type: 'box',
                                                    layout: 'baseline',
                                                    spacing: 'sm',
                                                    contents: [
                                                        {
                                                            type: 'text',
                                                            text: '場所',
                                                            color: '#aaaaaa',
                                                            size: 'sm',
                                                            flex: 1
                                                        },
                                                        {
                                                            type: 'text',
                                                            // tslint:disable-next-line:max-line-length
                                                            text: `${event.superEvent.location.name.ja} ${event.location.name.ja}`,
                                                            wrap: true,
                                                            color: '#666666',
                                                            size: 'sm',
                                                            flex: 4
                                                        }
                                                    ]
                                                },
                                                {
                                                    type: 'box',
                                                    layout: 'baseline',
                                                    spacing: 'sm',
                                                    contents: [
                                                        {
                                                            type: 'text',
                                                            text: '座席',
                                                            color: '#aaaaaa',
                                                            size: 'sm',
                                                            flex: 1
                                                        },
                                                        {
                                                            type: 'text',
                                                            text: (itemOffered.reservedTicket.ticketedSeat !== undefined)
                                                                ? itemOffered.reservedTicket.ticketedSeat.seatNumber
                                                                : '座席なし',
                                                            wrap: true,
                                                            color: '#666666',
                                                            size: 'sm',
                                                            flex: 4
                                                        }
                                                    ]
                                                },
                                                {
                                                    type: 'box',
                                                    layout: 'baseline',
                                                    spacing: 'sm',
                                                    contents: [
                                                        {
                                                            type: 'text',
                                                            text: '券種',
                                                            color: '#aaaaaa',
                                                            size: 'sm',
                                                            flex: 1
                                                        },
                                                        {
                                                            type: 'text',
                                                            text: (typeof itemOffered.reservedTicket.ticketType.name === 'string')
                                                                ? String(itemOffered.reservedTicket.ticketType.name)
                                                                : String((_a = itemOffered.reservedTicket.ticketType.name) === null || _a === void 0 ? void 0 : _a.ja),
                                                            wrap: true,
                                                            color: '#666666',
                                                            size: 'sm',
                                                            flex: 4
                                                        }
                                                    ]
                                                },
                                                {
                                                    type: 'box',
                                                    layout: 'baseline',
                                                    spacing: 'sm',
                                                    contents: [
                                                        {
                                                            type: 'text',
                                                            text: '発行者',
                                                            color: '#aaaaaa',
                                                            size: 'sm',
                                                            flex: 1
                                                        },
                                                        {
                                                            type: 'text',
                                                            text: (itemOffered.reservedTicket.issuedBy !== undefined)
                                                                ? itemOffered.reservedTicket.issuedBy.name
                                                                : 'No reservedTicket.issuedBy',
                                                            wrap: true,
                                                            color: '#666666',
                                                            size: 'sm',
                                                            flex: 4
                                                        }
                                                    ]
                                                },
                                                {
                                                    type: 'box',
                                                    layout: 'baseline',
                                                    spacing: 'sm',
                                                    contents: [
                                                        {
                                                            type: 'text',
                                                            text: '予約者',
                                                            color: '#aaaaaa',
                                                            size: 'sm',
                                                            flex: 1
                                                        },
                                                        {
                                                            type: 'text',
                                                            text: (itemOffered.reservedTicket.underName !== undefined)
                                                                ? itemOffered.reservedTicket.underName.name
                                                                : 'No edTicket.underName',
                                                            wrap: true,
                                                            color: '#666666',
                                                            size: 'sm',
                                                            flex: 4
                                                        }
                                                    ]
                                                },
                                                {
                                                    type: 'box',
                                                    layout: 'baseline',
                                                    spacing: 'sm',
                                                    contents: [
                                                        {
                                                            type: 'text',
                                                            text: 'Status',
                                                            color: '#aaaaaa',
                                                            size: 'sm',
                                                            flex: 1
                                                        },
                                                        {
                                                            type: 'text',
                                                            text: String(itemOffered.reservationStatus),
                                                            wrap: true,
                                                            color: '#666666',
                                                            size: 'sm',
                                                            flex: 4
                                                        }
                                                    ]
                                                },
                                                {
                                                    type: 'box',
                                                    layout: 'vertical',
                                                    margin: 'xxl',
                                                    contents: [
                                                        {
                                                            type: 'spacer',
                                                            size: 'md'
                                                        },
                                                        {
                                                            type: 'image',
                                                            // tslint:disable-next-line:max-line-length
                                                            url: `https://chart.apis.google.com/chart?chs=300x300&cht=qr&chl=${code}`,
                                                            aspectMode: 'cover',
                                                            size: 'xl'
                                                        },
                                                        {
                                                            type: 'text',
                                                            // tslint:disable-next-line:max-line-length
                                                            text: 'You can enter the theater by using this code instead of a ticket',
                                                            color: '#aaaaaa',
                                                            wrap: true,
                                                            margin: 'xxl',
                                                            size: 'xs'
                                                        }
                                                    ]
                                                }
                                            ]
                                        }
                                    ]
                                }
                            }
                        ]
                    }
                };
                yield lineClient_1.default.pushMessage(params.user.userId, [flex]);
                break;
            case cinerinoapi.factory.ownershipInfo.AccountGoodType.Account:
                const searchAccountsResult = yield personOwnershipInfoService.search({
                    typeOfGood: {
                        typeOf: cinerinoapi.factory.ownershipInfo.AccountGoodType.Account,
                        accountType: cinerinoapi.factory.accountType.Coin
                    }
                });
                const accountOwnershipInfo = searchAccountsResult.data.find((o) => o.id === params.id);
                if (accountOwnershipInfo === undefined) {
                    throw new Error('Account not found');
                }
                const account = accountOwnershipInfo.typeOfGood;
                flex = {
                    type: 'flex',
                    altText: 'This is a Flex Message',
                    contents: {
                        type: 'carousel',
                        contents: [
                            {
                                type: 'bubble',
                                styles: {
                                    footer: {
                                        separator: true
                                    }
                                },
                                body: {
                                    type: 'box',
                                    layout: 'vertical',
                                    spacing: 'md',
                                    contents: [
                                        {
                                            type: 'text',
                                            text: account.accountNumber,
                                            wrap: true,
                                            weight: 'bold',
                                            gravity: 'center',
                                            size: 'xl'
                                        },
                                        {
                                            type: 'box',
                                            layout: 'vertical',
                                            margin: 'lg',
                                            spacing: 'sm',
                                            contents: [
                                                {
                                                    type: 'box',
                                                    layout: 'baseline',
                                                    spacing: 'sm',
                                                    contents: [
                                                        {
                                                            type: 'text',
                                                            text: 'Name',
                                                            color: '#aaaaaa',
                                                            size: 'sm',
                                                            flex: 2
                                                        },
                                                        {
                                                            type: 'text',
                                                            text: account.name,
                                                            wrap: true,
                                                            size: 'sm',
                                                            color: '#666666',
                                                            flex: 4
                                                        }
                                                    ]
                                                },
                                                {
                                                    type: 'box',
                                                    layout: 'baseline',
                                                    spacing: 'sm',
                                                    contents: [
                                                        {
                                                            type: 'text',
                                                            text: 'Type',
                                                            color: '#aaaaaa',
                                                            size: 'sm',
                                                            flex: 2
                                                        },
                                                        {
                                                            type: 'text',
                                                            text: account.accountType,
                                                            wrap: true,
                                                            size: 'sm',
                                                            color: '#666666',
                                                            flex: 4
                                                        }
                                                    ]
                                                },
                                                {
                                                    type: 'box',
                                                    layout: 'baseline',
                                                    spacing: 'sm',
                                                    contents: [
                                                        {
                                                            type: 'text',
                                                            text: 'Balance',
                                                            color: '#aaaaaa',
                                                            size: 'sm',
                                                            flex: 2
                                                        },
                                                        {
                                                            type: 'text',
                                                            text: `${account.balance}`,
                                                            wrap: true,
                                                            size: 'sm',
                                                            color: '#666666',
                                                            flex: 4
                                                        }
                                                    ]
                                                },
                                                {
                                                    type: 'box',
                                                    layout: 'baseline',
                                                    spacing: 'sm',
                                                    contents: [
                                                        {
                                                            type: 'text',
                                                            text: 'Available',
                                                            color: '#aaaaaa',
                                                            size: 'sm',
                                                            flex: 2
                                                        },
                                                        {
                                                            type: 'text',
                                                            text: `${account.availableBalance}`,
                                                            wrap: true,
                                                            color: '#666666',
                                                            size: 'sm',
                                                            flex: 4
                                                        }
                                                    ]
                                                },
                                                {
                                                    type: 'box',
                                                    layout: 'baseline',
                                                    spacing: 'sm',
                                                    contents: [
                                                        {
                                                            type: 'text',
                                                            text: 'Status',
                                                            color: '#aaaaaa',
                                                            size: 'sm',
                                                            flex: 2
                                                        },
                                                        {
                                                            type: 'text',
                                                            text: account.status,
                                                            wrap: true,
                                                            color: '#666666',
                                                            size: 'sm',
                                                            flex: 4
                                                        }
                                                    ]
                                                },
                                                {
                                                    type: 'box',
                                                    layout: 'baseline',
                                                    spacing: 'sm',
                                                    contents: [
                                                        {
                                                            type: 'text',
                                                            text: 'OpenDate',
                                                            color: '#aaaaaa',
                                                            size: 'sm',
                                                            flex: 2
                                                        },
                                                        {
                                                            type: 'text',
                                                            text: moment(account.openDate)
                                                                .format('lll'),
                                                            wrap: true,
                                                            color: '#666666',
                                                            size: 'sm',
                                                            flex: 4
                                                        }
                                                    ]
                                                },
                                                {
                                                    type: 'box',
                                                    layout: 'vertical',
                                                    margin: 'xxl',
                                                    contents: [
                                                        {
                                                            type: 'spacer',
                                                            size: 'md'
                                                        },
                                                        {
                                                            type: 'image',
                                                            // tslint:disable-next-line:max-line-length
                                                            url: `https://chart.apis.google.com/chart?chs=300x300&cht=qr&chl=${code}`,
                                                            aspectMode: 'cover',
                                                            size: 'xl'
                                                        },
                                                        {
                                                            type: 'text',
                                                            // tslint:disable-next-line:max-line-length
                                                            text: 'You can enter the theater by using this code instead of a ticket',
                                                            color: '#aaaaaa',
                                                            wrap: true,
                                                            margin: 'xxl',
                                                            size: 'xs'
                                                        }
                                                    ]
                                                }
                                            ]
                                        }
                                    ]
                                }
                            }
                        ]
                    }
                };
                yield lineClient_1.default.pushMessage(params.user.userId, [flex]);
                break;
            default:
                throw new Error(`Unknown goodType ${params.goodType}`);
        }
    });
}
exports.authorizeOwnershipInfo = authorizeOwnershipInfo;
/**
 * 注文を検索する
 */
function searchOrders(params) {
    return __awaiter(this, void 0, void 0, function* () {
        const now = new Date();
        yield lineClient_1.default.replyMessage(params.replyToken, { type: 'text', text: `ここ一カ月の注文を検索しています...` });
        const personService = new cinerinoapi.service.Person({
            endpoint: process.env.CINERINO_ENDPOINT,
            auth: params.user.authClient,
            project: { id: process.env.PROJECT_ID }
        });
        const searchOrdersResult = yield personService.searchOrders({
            orderDateFrom: moment(now)
                .add(-1, 'month')
                .toDate(),
            orderDateThrough: now,
            limit: 10,
            page: 1,
            sort: {
                orderDate: cinerinoapi.factory.sortType.Descending
            }
        });
        const orders = searchOrdersResult.data;
        if (searchOrdersResult.data.length === 0) {
            yield lineClient_1.default.pushMessage(params.user.userId, { type: 'text', text: '注文が見つかりませんでした' });
        }
        else {
            yield lineClient_1.default.pushMessage(params.user.userId, { type: 'text', text: '注文が見つかりました' });
            yield lineClient_1.default.pushMessage(params.user.userId, { type: 'text', text: `直近の${orders.length}件は以下の通りです` });
            const contents = orders.map((order) => {
                return contentsBuilder_1.order2flexBubble({ order });
            });
            const flex = {
                type: 'flex',
                altText: 'This is a Flex Message',
                contents: {
                    type: 'carousel',
                    contents: contents
                }
            };
            yield lineClient_1.default.pushMessage(params.user.userId, [flex]);
        }
    });
}
exports.searchOrders = searchOrders;
/**
 * 注文照会
 */
function findOrderByConfirmationNumber(params) {
    return __awaiter(this, void 0, void 0, function* () {
        yield lineClient_1.default.replyMessage(params.replyToken, { type: 'text', text: `${params.confirmationNumber}で注文を検索しています...` });
        const orderService = new cinerinoapi.service.Order({
            endpoint: process.env.CINERINO_ENDPOINT,
            auth: params.user.authClient,
            project: { id: process.env.PROJECT_ID }
        });
        const order = yield orderService.findByConfirmationNumber({
            confirmationNumber: params.confirmationNumber,
            customer: {
                telephone: params.telephone
            }
        });
        yield lineClient_1.default.pushMessage(params.user.userId, { type: 'text', text: '注文が見つかりました' });
        const contents = [contentsBuilder_1.order2flexBubble({ order })];
        const flex = {
            type: 'flex',
            altText: 'This is a Flex Message',
            contents: {
                type: 'carousel',
                contents: contents
            }
        };
        yield lineClient_1.default.pushMessage(params.user.userId, [flex]);
        // 発券メッセージ
        const message = {
            type: 'text',
            text: '下記対応が可能です',
            quickReply: {
                items: [
                    {
                        type: 'action',
                        imageUrl: `https://${params.user.host}/img/labels/qr-code-48.png`,
                        action: {
                            type: 'postback',
                            label: '発券する',
                            data: qs.stringify({
                                action: 'authorizeOwnershipInfosByOrder',
                                amount: 100,
                                orderNumber: order.orderNumber,
                                telephone: params.telephone
                            })
                        }
                    }
                ]
            }
        };
        yield lineClient_1.default.pushMessage(params.user.userId, [message]);
    });
}
exports.findOrderByConfirmationNumber = findOrderByConfirmationNumber;
/**
 * 注文発券
 */
// tslint:disable-next-line:max-func-body-length
function authorizeOwnershipInfosByOrder(params) {
    return __awaiter(this, void 0, void 0, function* () {
        yield lineClient_1.default.replyMessage(params.replyToken, { type: 'text', text: `${params.orderNumber}に対して発券処理を実行します...` });
        const eventService = new cinerinoapi.service.Event({
            endpoint: process.env.CINERINO_ENDPOINT,
            auth: params.user.authClient,
            project: { id: process.env.PROJECT_ID }
        });
        const orderService = new cinerinoapi.service.Order({
            endpoint: process.env.CINERINO_ENDPOINT,
            auth: params.user.authClient,
            project: { id: process.env.PROJECT_ID }
        });
        const order = yield orderService.authorizeOwnershipInfos({
            orderNumber: params.orderNumber,
            customer: {
                telephone: params.telephone
            }
        });
        yield lineClient_1.default.pushMessage(params.user.userId, { type: 'text', text: 'コードが発行されました' });
        const reservations = order.acceptedOffers
            .filter((o) => o.itemOffered.typeOf === cinerinoapi.factory.chevre.reservationType.EventReservation)
            .map((o) => o.itemOffered);
        const event = yield eventService.findById({
            id: reservations[0].reservationFor.id
        });
        const thumbnailImageUrl = (event.workPerformed !== undefined
            && event.workPerformed.thumbnailUrl !== undefined
            && event.workPerformed.thumbnailUrl !== null)
            ? event.workPerformed.thumbnailUrl
            // tslint:disable-next-line:max-line-length
            : 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRrhpsOJOcLBwc1SPD9sWlinildy4S05-I2Wf6z2wRXnSxbmtRz';
        const bubbles = reservations.map(
        // tslint:disable-next-line:max-func-body-length
        (r) => {
            var _a;
            return {
                type: 'bubble',
                hero: {
                    type: 'image',
                    url: thumbnailImageUrl,
                    size: 'full',
                    aspectRatio: '20:13',
                    aspectMode: 'cover',
                    action: {
                        type: 'uri',
                        label: 'event',
                        // tslint:disable-next-line:no-http-string
                        uri: 'http://linecorp.com/'
                    }
                },
                body: {
                    type: 'box',
                    layout: 'vertical',
                    spacing: 'md',
                    contents: [
                        {
                            type: 'text',
                            text: String(event.name.ja),
                            wrap: true,
                            weight: 'bold',
                            gravity: 'center',
                            size: 'xl'
                        },
                        {
                            type: 'box',
                            layout: 'vertical',
                            margin: 'lg',
                            spacing: 'sm',
                            contents: [
                                {
                                    type: 'box',
                                    layout: 'baseline',
                                    spacing: 'sm',
                                    contents: [
                                        {
                                            type: 'text',
                                            text: '日時',
                                            color: '#aaaaaa',
                                            size: 'sm',
                                            flex: 1
                                        },
                                        {
                                            type: 'text',
                                            text: moment(event.startDate)
                                                .format('llll'),
                                            wrap: true,
                                            size: 'sm',
                                            color: '#666666',
                                            flex: 4
                                        }
                                    ]
                                },
                                {
                                    type: 'box',
                                    layout: 'baseline',
                                    spacing: 'sm',
                                    contents: [
                                        {
                                            type: 'text',
                                            text: '場所',
                                            color: '#aaaaaa',
                                            size: 'sm',
                                            flex: 1
                                        },
                                        {
                                            type: 'text',
                                            text: `${event.superEvent.location.name.ja} ${event.location.name.ja}`,
                                            wrap: true,
                                            color: '#666666',
                                            size: 'sm',
                                            flex: 4
                                        }
                                    ]
                                },
                                {
                                    type: 'box',
                                    layout: 'baseline',
                                    spacing: 'sm',
                                    contents: [
                                        {
                                            type: 'text',
                                            text: '座席',
                                            color: '#aaaaaa',
                                            size: 'sm',
                                            flex: 1
                                        },
                                        {
                                            type: 'text',
                                            text: (r.reservedTicket.ticketedSeat !== undefined)
                                                ? r.reservedTicket.ticketedSeat.seatNumber
                                                : '座席なし',
                                            wrap: true,
                                            color: '#666666',
                                            size: 'sm',
                                            flex: 4
                                        }
                                    ]
                                },
                                {
                                    type: 'box',
                                    layout: 'baseline',
                                    spacing: 'sm',
                                    contents: [
                                        {
                                            type: 'text',
                                            text: '券種',
                                            color: '#aaaaaa',
                                            size: 'sm',
                                            flex: 1
                                        },
                                        {
                                            type: 'text',
                                            text: (typeof r.reservedTicket.ticketType.name === 'string')
                                                ? String(r.reservedTicket.ticketType.name)
                                                : String((_a = r.reservedTicket.ticketType.name) === null || _a === void 0 ? void 0 : _a.ja),
                                            wrap: true,
                                            color: '#666666',
                                            size: 'sm',
                                            flex: 4
                                        }
                                    ]
                                },
                                {
                                    type: 'box',
                                    layout: 'baseline',
                                    spacing: 'sm',
                                    contents: [
                                        {
                                            type: 'text',
                                            text: '発行者',
                                            color: '#aaaaaa',
                                            size: 'sm',
                                            flex: 1
                                        },
                                        {
                                            type: 'text',
                                            text: (r.reservedTicket.issuedBy !== undefined)
                                                ? r.reservedTicket.issuedBy.name
                                                : 'No Issued By',
                                            wrap: true,
                                            color: '#666666',
                                            size: 'sm',
                                            flex: 4
                                        }
                                    ]
                                },
                                {
                                    type: 'box',
                                    layout: 'baseline',
                                    spacing: 'sm',
                                    contents: [
                                        {
                                            type: 'text',
                                            text: '予約者',
                                            color: '#aaaaaa',
                                            size: 'sm',
                                            flex: 1
                                        },
                                        {
                                            type: 'text',
                                            text: (r.reservedTicket !== undefined && r.reservedTicket.underName !== undefined)
                                                ? r.reservedTicket.underName.name
                                                : 'No Under Name',
                                            wrap: true,
                                            color: '#666666',
                                            size: 'sm',
                                            flex: 4
                                        }
                                    ]
                                },
                                {
                                    type: 'box',
                                    layout: 'baseline',
                                    spacing: 'sm',
                                    contents: [
                                        {
                                            type: 'text',
                                            text: 'Status',
                                            color: '#aaaaaa',
                                            size: 'sm',
                                            flex: 1
                                        },
                                        {
                                            type: 'text',
                                            text: String(r.reservationStatus),
                                            wrap: true,
                                            color: '#666666',
                                            size: 'sm',
                                            flex: 4
                                        }
                                    ]
                                },
                                {
                                    type: 'box',
                                    layout: 'vertical',
                                    margin: 'xxl',
                                    contents: [
                                        {
                                            type: 'spacer',
                                            size: 'md'
                                        },
                                        {
                                            type: 'image',
                                            // tslint:disable-next-line:max-line-length
                                            url: util_1.format('%s%s', `https://chart.apis.google.com/chart?chs=300x300&cht=qr&chl=`, (r.reservedTicket !== undefined) ? r.reservedTicket.ticketToken : 'notickettoken'),
                                            aspectMode: 'cover',
                                            size: 'xl'
                                        },
                                        {
                                            type: 'text',
                                            // tslint:disable-next-line:max-line-length
                                            text: 'You can enter the theater by using this code instead of a ticket',
                                            color: '#aaaaaa',
                                            wrap: true,
                                            margin: 'xxl',
                                            size: 'xs'
                                        }
                                    ]
                                }
                            ]
                        }
                    ]
                }
            };
        });
        const flex = {
            type: 'flex',
            altText: 'This is a Flex Message',
            contents: {
                type: 'carousel',
                contents: bubbles
            }
        };
        yield lineClient_1.default.pushMessage(params.user.userId, [flex]);
    });
}
exports.authorizeOwnershipInfosByOrder = authorizeOwnershipInfosByOrder;
/**
 * 座席予約コード読み込み
 */
// tslint:disable-next-line:max-func-body-length
function findScreeningEventReservationById(params) {
    return __awaiter(this, void 0, void 0, function* () {
        yield lineClient_1.default.replyMessage(params.replyToken, { type: 'text', text: 'コードを読み込んでいます...' });
        const ownershipInfoService = new cinerinoapi.service.OwnershipInfo({
            endpoint: process.env.CINERINO_ENDPOINT,
            auth: params.user.authClient,
            project: { id: process.env.PROJECT_ID }
        });
        const reservationService = new cinerinoapi.service.Reservation({
            endpoint: process.env.CINERINO_ENDPOINT,
            auth: params.user.authClient,
            project: { id: process.env.PROJECT_ID }
        });
        const eventService = new cinerinoapi.service.Event({
            endpoint: process.env.CINERINO_ENDPOINT,
            auth: params.user.authClient,
            project: { id: process.env.PROJECT_ID }
        });
        try {
            const { token } = yield ownershipInfoService.getToken({ code: params.code });
            const ownershipInfo = yield reservationService.findScreeningEventReservationByToken({ token: token });
            yield lineClient_1.default.pushMessage(params.user.userId, { type: 'text', text: '予約が見つかりました' });
            const reservation = ownershipInfo.typeOfGood;
            const event = yield eventService.findById({
                id: reservation.reservationFor.id
            });
            const thumbnailImageUrl = (event.workPerformed !== undefined
                && event.workPerformed.thumbnailUrl !== undefined
                && event.workPerformed.thumbnailUrl !== null)
                ? event.workPerformed.thumbnailUrl
                // tslint:disable-next-line:max-line-length
                : 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRrhpsOJOcLBwc1SPD9sWlinildy4S05-I2Wf6z2wRXnSxbmtRz';
            const flex = {
                type: 'flex',
                altText: 'This is a Flex Message',
                contents: {
                    type: 'carousel',
                    contents: [
                        {
                            type: 'bubble',
                            hero: {
                                type: 'image',
                                url: thumbnailImageUrl,
                                size: 'full',
                                aspectRatio: '20:13',
                                aspectMode: 'cover',
                                action: {
                                    type: 'uri',
                                    label: 'event',
                                    // tslint:disable-next-line:no-http-string
                                    uri: 'http://linecorp.com/'
                                }
                            },
                            body: {
                                type: 'box',
                                layout: 'vertical',
                                spacing: 'md',
                                contents: [
                                    {
                                        type: 'text',
                                        text: String(event.name.ja),
                                        wrap: true,
                                        weight: 'bold',
                                        gravity: 'center',
                                        size: 'xl'
                                    },
                                    {
                                        type: 'box',
                                        layout: 'vertical',
                                        margin: 'lg',
                                        spacing: 'sm',
                                        contents: [
                                            {
                                                type: 'box',
                                                layout: 'baseline',
                                                spacing: 'sm',
                                                contents: [
                                                    {
                                                        type: 'text',
                                                        text: '日時',
                                                        color: '#aaaaaa',
                                                        size: 'sm',
                                                        flex: 1
                                                    },
                                                    {
                                                        type: 'text',
                                                        text: moment(event.startDate)
                                                            .format('llll'),
                                                        wrap: true,
                                                        size: 'sm',
                                                        color: '#666666',
                                                        flex: 4
                                                    }
                                                ]
                                            },
                                            {
                                                type: 'box',
                                                layout: 'baseline',
                                                spacing: 'sm',
                                                contents: [
                                                    {
                                                        type: 'text',
                                                        text: '場所',
                                                        color: '#aaaaaa',
                                                        size: 'sm',
                                                        flex: 1
                                                    },
                                                    {
                                                        type: 'text',
                                                        text: `${event.superEvent.location.name.ja} ${event.location.name.ja}`,
                                                        wrap: true,
                                                        color: '#666666',
                                                        size: 'sm',
                                                        flex: 4
                                                    }
                                                ]
                                            },
                                            {
                                                type: 'box',
                                                layout: 'baseline',
                                                spacing: 'sm',
                                                contents: [
                                                    {
                                                        type: 'text',
                                                        text: '座席',
                                                        color: '#aaaaaa',
                                                        size: 'sm',
                                                        flex: 1
                                                    },
                                                    {
                                                        type: 'text',
                                                        text: (reservation.reservedTicket !== undefined
                                                            && reservation.reservedTicket.ticketedSeat !== undefined)
                                                            ? reservation.reservedTicket.ticketedSeat.seatNumber
                                                            : 'No ticketedSeat',
                                                        wrap: true,
                                                        color: '#666666',
                                                        size: 'sm',
                                                        flex: 4
                                                    }
                                                ]
                                            },
                                            {
                                                type: 'box',
                                                layout: 'baseline',
                                                spacing: 'sm',
                                                contents: [
                                                    {
                                                        type: 'text',
                                                        text: '券種',
                                                        color: '#aaaaaa',
                                                        size: 'sm',
                                                        flex: 1
                                                    },
                                                    {
                                                        type: 'text',
                                                        text: (reservation.reservedTicket !== undefined)
                                                            ? String(reservation.reservedTicket.ticketType.name.ja)
                                                            : 'No reserved ticket',
                                                        wrap: true,
                                                        color: '#666666',
                                                        size: 'sm',
                                                        flex: 4
                                                    }
                                                ]
                                            },
                                            {
                                                type: 'box',
                                                layout: 'baseline',
                                                spacing: 'sm',
                                                contents: [
                                                    {
                                                        type: 'text',
                                                        text: '発行者',
                                                        color: '#aaaaaa',
                                                        size: 'sm',
                                                        flex: 1
                                                    },
                                                    {
                                                        type: 'text',
                                                        text: (reservation.reservedTicket !== undefined
                                                            && reservation.reservedTicket.issuedBy !== undefined)
                                                            ? reservation.reservedTicket.issuedBy.name
                                                            : 'No issuedBy',
                                                        wrap: true,
                                                        color: '#666666',
                                                        size: 'sm',
                                                        flex: 4
                                                    }
                                                ]
                                            },
                                            {
                                                type: 'box',
                                                layout: 'baseline',
                                                spacing: 'sm',
                                                contents: [
                                                    {
                                                        type: 'text',
                                                        text: '予約者',
                                                        color: '#aaaaaa',
                                                        size: 'sm',
                                                        flex: 1
                                                    },
                                                    {
                                                        type: 'text',
                                                        text: (reservation.reservedTicket !== undefined
                                                            && reservation.reservedTicket.underName !== undefined)
                                                            ? reservation.reservedTicket.underName.name
                                                            : 'No underName',
                                                        wrap: true,
                                                        color: '#666666',
                                                        size: 'sm',
                                                        flex: 4
                                                    }
                                                ]
                                            },
                                            {
                                                type: 'box',
                                                layout: 'baseline',
                                                spacing: 'sm',
                                                contents: [
                                                    {
                                                        type: 'text',
                                                        text: 'Status',
                                                        color: '#aaaaaa',
                                                        size: 'sm',
                                                        flex: 1
                                                    },
                                                    {
                                                        type: 'text',
                                                        text: String(reservation.reservationStatus),
                                                        wrap: true,
                                                        color: '#666666',
                                                        size: 'sm',
                                                        flex: 4
                                                    }
                                                ]
                                            }
                                        ]
                                    }
                                ]
                            }
                        }
                    ]
                }
            };
            yield lineClient_1.default.pushMessage(params.user.userId, [flex]);
        }
        catch (error) {
            yield lineClient_1.default.pushMessage(params.user.userId, { type: 'text', text: `Invalid code ${error.message}` });
        }
    });
}
exports.findScreeningEventReservationById = findScreeningEventReservationById;
/**
 * プロフィール検索
 */
function getProfile(params) {
    return __awaiter(this, void 0, void 0, function* () {
        yield lineClient_1.default.replyMessage(params.replyToken, { type: 'text', text: `プロフィールを検索しています...` });
        const personService = new cinerinoapi.service.Person({
            endpoint: process.env.CINERINO_ENDPOINT,
            auth: params.user.authClient,
            project: { id: process.env.PROJECT_ID }
        });
        const profile = yield personService.getProfile({});
        yield lineClient_1.default.pushMessage(params.user.userId, { type: 'text', text: 'プロフィールが見つかりました' });
        const contents = [contentsBuilder_1.profile2bubble(profile)];
        const flex = {
            type: 'flex',
            altText: 'This is a Flex Message',
            contents: {
                type: 'carousel',
                contents: contents
            }
        };
        yield lineClient_1.default.pushMessage(params.user.userId, [flex]);
    });
}
exports.getProfile = getProfile;
/**
 * プロフィール更新
 */
function updateProfile(params) {
    return __awaiter(this, void 0, void 0, function* () {
        const personService = new cinerinoapi.service.Person({
            endpoint: process.env.CINERINO_ENDPOINT,
            auth: params.user.authClient,
            project: { id: process.env.PROJECT_ID }
        });
        yield lineClient_1.default.replyMessage(params.replyToken, { type: 'text', text: `プロフィールを更新しています...` });
        yield personService.updateProfile(Object.assign({}, params.profile));
        yield lineClient_1.default.pushMessage(params.user.userId, { type: 'text', text: 'プロフィールを更新しました' });
        const contents = [contentsBuilder_1.profile2bubble(params.profile)];
        const flex = {
            type: 'flex',
            altText: 'This is a Flex Message',
            contents: {
                type: 'carousel',
                contents: contents
            }
        };
        yield lineClient_1.default.pushMessage(params.user.userId, [flex]);
    });
}
exports.updateProfile = updateProfile;
