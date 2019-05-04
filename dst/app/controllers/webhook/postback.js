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
 * LINE webhook postbackコントローラー
 */
const cinerinoapi = require("@cinerino/api-nodejs-client");
const pecorino = require("@pecorino/api-nodejs-client");
const createDebug = require("debug");
const moment = require("moment");
const qs = require("qs");
const util_1 = require("util");
const lineClient_1 = require("../../../lineClient");
const debug = createDebug('cinerino-line-ticket:controllers');
const pecorinoAuthClient = new pecorino.auth.ClientCredentials({
    domain: process.env.PECORINO_AUTHORIZE_SERVER_DOMAIN,
    clientId: process.env.PECORINO_CLIENT_ID,
    clientSecret: process.env.PECORINO_CLIENT_SECRET,
    scopes: [],
    state: ''
});
/**
 * 日付でイベント検索
 * @params.date {string} date YYYY-MM-DD形式
 */
function searchEventsByDate(params) {
    return __awaiter(this, void 0, void 0, function* () {
        yield lineClient_1.default.replyMessage(params.replyToken, { type: 'text', text: `${params.date}のイベントを検索しています...` });
        const eventService = new cinerinoapi.service.Event({
            endpoint: process.env.CINERINO_ENDPOINT,
            auth: params.user.authClient
        });
        const searchScreeningEventsResult = yield eventService.searchScreeningEvents({
            typeOf: cinerinoapi.factory.chevre.eventType.ScreeningEvent,
            inSessionFrom: moment.unix(Math.max(moment(`${params.date}T00:00:00+09:00`).unix(), moment().unix())).toDate(),
            inSessionThrough: moment(`${params.date}T00:00:00+09:00`).add(1, 'day').toDate()
        });
        const screeningEvents = searchScreeningEventsResult.data;
        // 上映イベントシリーズをユニークに
        let superEvents = screeningEvents.map((e) => e.superEvent);
        superEvents = superEvents.filter((e, index, events) => events.map((e2) => e2.id).indexOf(e.id) === index);
        // tslint:disable-next-line:no-magic-numbers
        superEvents = superEvents.slice(0, 10);
        yield lineClient_1.default.pushMessage(params.user.userId, { type: 'text', text: `${superEvents.length}件の作品がみつかりました` });
        // const accessToken = await params.user.authClient.getAccessToken();
        const flex = {
            type: 'flex',
            altText: 'This is a Flex Message',
            contents: {
                type: 'carousel',
                contents: [
                    // tslint:disable-next-line:max-func-body-length no-magic-numbers
                    ...superEvents.slice(0, 10).map((event) => {
                        const thumbnailImageUrl = (event.workPerformed.thumbnailUrl !== undefined
                            && event.workPerformed.thumbnailUrl !== null)
                            ? event.workPerformed.thumbnailUrl
                            // tslint:disable-next-line:max-line-length
                            : 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRrhpsOJOcLBwc1SPD9sWlinildy4S05-I2Wf6z2wRXnSxbmtRz';
                        const body = {
                            type: 'box',
                            layout: 'vertical',
                            spacing: 'md',
                            contents: [
                                {
                                    type: 'text',
                                    text: event.name.ja,
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
                                                    text: 'Place',
                                                    color: '#aaaaaa',
                                                    size: 'sm',
                                                    flex: 1
                                                },
                                                {
                                                    type: 'text',
                                                    text: event.location.name.ja,
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
                                                    text: 'VideoFormat',
                                                    color: '#aaaaaa',
                                                    size: 'sm',
                                                    flex: 1
                                                },
                                                {
                                                    type: 'text',
                                                    text: (Array.isArray(event.videoFormat))
                                                        ? event.videoFormat.map((f) => f.typeOf).join(',')
                                                        : '---',
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
                                                    text: 'Duration',
                                                    color: '#aaaaaa',
                                                    size: 'sm',
                                                    flex: 1
                                                },
                                                {
                                                    type: 'text',
                                                    text: (event.duration !== undefined)
                                                        ? moment.duration(event.duration).toIsoString()
                                                        : '---',
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
                        };
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
                            body: body,
                            footer: {
                                type: 'box',
                                layout: 'horizontal',
                                contents: [
                                    {
                                        type: 'button',
                                        action: {
                                            type: 'postback',
                                            label: 'スケジュール選択',
                                            data: qs.stringify({
                                                action: 'askScreeningEvent',
                                                screeningEventSeriesId: event.id,
                                                date: params.date
                                            })
                                        }
                                    }
                                ]
                            }
                        };
                    })
                ]
            }
        };
        yield lineClient_1.default.pushMessage(params.user.userId, [flex]);
    });
}
exports.searchEventsByDate = searchEventsByDate;
/**
 * 上映イベントスケジュールをたずねる
 */
// tslint:disable-next-line:max-func-body-length
function askScreeningEvent(params) {
    return __awaiter(this, void 0, void 0, function* () {
        yield lineClient_1.default.replyMessage(params.replyToken, { type: 'text', text: `${params.date}のイベントを検索しています...` });
        const eventService = new cinerinoapi.service.Event({
            endpoint: process.env.CINERINO_ENDPOINT,
            auth: params.user.authClient
        });
        const startFrom = moment.unix(Math.max(moment(`${params.date}T00:00:00+09:00`).unix(), moment().unix())).toDate();
        const startThrough = moment(`${params.date}T00:00:00+09:00`).add(1, 'day').toDate();
        const searchScreeningEventsResult = yield eventService.searchScreeningEvents({
            typeOf: cinerinoapi.factory.chevre.eventType.ScreeningEvent,
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
        // tslint:disable-next-line:max-func-body-length
        const bubbles = screeningEvents.map((event) => {
            const query = qs.stringify({ eventId: event.id, userId: params.user.userId });
            const selectSeatsUri = `/transactions/placeOrder/selectSeatOffers?${query}`;
            const liffUri = `line://app/${process.env.LIFF_ID}?${qs.stringify({ cb: selectSeatsUri })}`;
            let availability = 100;
            if (event.maximumAttendeeCapacity !== undefined && event.remainingAttendeeCapacity !== undefined) {
                // tslint:disable-next-line:no-magic-numbers
                availability = Math.floor((event.remainingAttendeeCapacity / event.maximumAttendeeCapacity) * 100);
            }
            // tslint:disable-next-line:no-magic-numbers
            const availabilityScore = Math.floor(availability / 20);
            return {
                type: 'bubble',
                body: {
                    type: 'box',
                    layout: 'vertical',
                    spacing: 'md',
                    contents: [
                        {
                            type: 'text',
                            text: event.name.ja,
                            wrap: true,
                            weight: 'bold',
                            gravity: 'center',
                            size: 'xl'
                        },
                        {
                            type: 'box',
                            layout: 'baseline',
                            margin: 'md',
                            contents: [
                                ...[...Array(availabilityScore)].map(() => {
                                    return {
                                        type: 'icon',
                                        size: 'sm',
                                        url: `https://${params.user.host}/img/labels/theater-seat-blue-80.png`
                                    };
                                }),
                                // tslint:disable-next-line:no-magic-numbers
                                ...[...Array(5 - availabilityScore)].map(() => {
                                    return {
                                        type: 'icon',
                                        size: 'sm',
                                        url: `https://${params.user.host}/img/labels/theater-seat-grey-80.png`
                                    };
                                }),
                                {
                                    type: 'text',
                                    text: `${availability}%`,
                                    size: 'sm',
                                    color: '#999999',
                                    margin: 'md',
                                    flex: 0
                                }
                            ]
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
                                            text: 'Place',
                                            color: '#aaaaaa',
                                            size: 'sm',
                                            flex: 1
                                        },
                                        {
                                            type: 'text',
                                            text: event.location.name.ja,
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
                                            text: 'Date',
                                            color: '#aaaaaa',
                                            size: 'sm',
                                            flex: 1
                                        },
                                        {
                                            type: 'text',
                                            text: moment(event.startDate).format('YYYY-MM-DD'),
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
                                            text: 'Time',
                                            color: '#aaaaaa',
                                            size: 'sm',
                                            flex: 1
                                        },
                                        {
                                            type: 'text',
                                            text: `${moment(event.startDate).format('HH:mm')} - ${moment(event.endDate).format('HH:mm')}`,
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
                },
                footer: {
                    type: 'box',
                    layout: 'horizontal',
                    contents: [
                        {
                            type: 'button',
                            action: {
                                type: 'uri',
                                label: '座席を選ぶ',
                                uri: liffUri
                            }
                        }
                    ]
                }
            };
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
            auth: params.user.authClient
        });
        const personOwnershipInfoService = new cinerinoapi.service.person.OwnershipInfo({
            endpoint: process.env.CINERINO_ENDPOINT,
            auth: params.user.authClient
        });
        const paymentService = new cinerinoapi.service.Payment({
            endpoint: process.env.CINERINO_ENDPOINT,
            auth: params.user.authClient
        });
        const ownershipInfoService = new cinerinoapi.service.OwnershipInfo({
            endpoint: process.env.CINERINO_ENDPOINT,
            auth: params.user.authClient
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
                        amount: price,
                        method: '1',
                        creditCard: params.creditCard
                    },
                    purpose: { typeOf: cinerinoapi.factory.transactionType.PlaceOrder, id: params.transactionId }
                });
                yield lineClient_1.default.pushMessage(params.user.userId, { type: 'text', text: 'クレジットカードで決済を受け付けます' });
                break;
            default:
                throw new Error(`Unknown payment method ${params.paymentMethodType}`);
        }
        // 購入者情報確認
        let profile;
        if ((yield params.user.getCredentials()) !== null) {
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
                // style: 'primary',
                action: {
                    type: 'uri',
                    label: '入力する',
                    uri: liffUri
                }
            }
        ];
        if (profile !== undefined) {
            footerContets.push({
                type: 'button',
                action: {
                    type: 'postback',
                    label: 'このまま進む',
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
            auth: params.user.authClient
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
                // style: 'primary',
                action: {
                    type: 'uri',
                    label: '入力する',
                    uri: liffUri
                }
            }
        ];
        // ログイン状態の場合、会員カードを選択肢に追加
        if ((yield params.user.getCredentials()) !== null) {
            const personOwnershipInfoService = new cinerinoapi.service.person.OwnershipInfo({
                endpoint: process.env.CINERINO_ENDPOINT,
                auth: params.user.authClient
            });
            const creditCards = yield personOwnershipInfoService.searchCreditCards({});
            yield lineClient_1.default.pushMessage(params.user.userId, { type: 'text', text: `${creditCards.length}件のクレジットカードが見つかりました` });
            if (creditCards.length > 0) {
                const creditCard = creditCards[0];
                footerContets.push({
                    type: 'button',
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
// tslint:disable-next-line:max-func-body-length
function setCustomerContact(params) {
    return __awaiter(this, void 0, void 0, function* () {
        const sellerService = new cinerinoapi.service.Seller({
            endpoint: process.env.CINERINO_ENDPOINT,
            auth: params.user.authClient
        });
        const placeOrderService = new cinerinoapi.service.txn.PlaceOrder({
            endpoint: process.env.CINERINO_ENDPOINT,
            auth: params.user.authClient
        });
        const transaction = yield params.user.findTransaction();
        const seller = yield sellerService.findById({ id: transaction.seller.id });
        const seatReservationAuthorization = yield params.user.findSeatReservationAuthorization();
        if (seatReservationAuthorization.result === undefined) {
            throw new Error('Invalid seat reservation authorization');
        }
        const price = seatReservationAuthorization.result.price;
        const tmpReservations = seatReservationAuthorization.result.responseBody.object.reservations;
        const contact = {
            familyName: params.familyName,
            givenName: params.givenName,
            email: params.email,
            telephone: params.telephone
        };
        yield placeOrderService.setCustomerContact({
            id: params.transactionId,
            object: {
                customerContact: contact
            }
        });
        debug('customer contact set.');
        // 注文内容確認
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
                                text: '注文をご確認ください',
                                weight: 'bold',
                                color: '#1DB446',
                                size: 'sm'
                            },
                            {
                                type: 'text',
                                text: seller.name.ja,
                                weight: 'bold',
                                size: 'xxl',
                                margin: 'md',
                                maxLines: 0,
                                wrap: true
                            },
                            {
                                type: 'text',
                                text: (seller.telephone !== undefined) ? seller.telephone : 'Unknown telephone',
                                size: 'xs',
                                color: '#aaaaaa',
                                wrap: true
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
                                                        text: `${contact.givenName} ${contact.familyName}`,
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
                                                        text: contact.email,
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
                                                        text: contact.telephone,
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
                                    ...tmpReservations.map((tmpReservation) => {
                                        const item = tmpReservation;
                                        const event = item.reservationFor;
                                        // tslint:disable-next-line:max-line-length no-unnecessary-local-variable
                                        const str = (item.reservedTicket.ticketedSeat !== undefined)
                                            ? `${item.reservedTicket.ticketedSeat.seatNumber} ${item.reservedTicket.ticketType.name.ja}`
                                            : '座席なし';
                                        let priceStr = String(item.priceCurrency);
                                        if (item.price !== undefined) {
                                            if (typeof item.price === 'number') {
                                                priceStr = `${item.price} ${item.priceCurrency}`;
                                            }
                                            else {
                                                // tslint:disable-next-line:max-line-length
                                                const unitPriceSpec = item.price.priceComponent.find(
                                                // tslint:disable-next-line:max-line-length
                                                (spec) => spec.typeOf === cinerinoapi.factory.chevre.priceSpecificationType.UnitPriceSpecification);
                                                if (unitPriceSpec !== undefined) {
                                                    // tslint:disable-next-line:max-line-length
                                                    priceStr = `${unitPriceSpec.price}/${unitPriceSpec.referenceQuantity.value} ${item.priceCurrency}`;
                                                }
                                            }
                                        }
                                        return {
                                            type: 'box',
                                            layout: 'horizontal',
                                            contents: [
                                                {
                                                    type: 'box',
                                                    layout: 'vertical',
                                                    flex: 2,
                                                    contents: [
                                                        {
                                                            type: 'text',
                                                            text: `${event.name.ja} ${moment(event.startDate).format('MM/DD HH:mm')}`,
                                                            size: 'xs',
                                                            color: '#555555',
                                                            wrap: true
                                                        },
                                                        {
                                                            type: 'text',
                                                            text: str,
                                                            size: 'xs',
                                                            color: '#aaaaaa'
                                                        }
                                                    ]
                                                },
                                                {
                                                    type: 'text',
                                                    text: priceStr,
                                                    size: 'xs',
                                                    color: '#111111',
                                                    align: 'end',
                                                    flex: 1,
                                                    gravity: 'top'
                                                }
                                            ]
                                        };
                                    }),
                                    {
                                        type: 'separator',
                                        margin: 'xxl'
                                    },
                                    {
                                        type: 'box',
                                        layout: 'horizontal',
                                        margin: 'xxl',
                                        contents: [
                                            {
                                                type: 'text',
                                                text: 'ITEMS',
                                                size: 'sm',
                                                color: '#555555'
                                            },
                                            {
                                                type: 'text',
                                                text: `${tmpReservations.length}`,
                                                size: 'sm',
                                                color: '#111111',
                                                align: 'end'
                                            }
                                        ]
                                    },
                                    {
                                        type: 'box',
                                        layout: 'horizontal',
                                        contents: [
                                            {
                                                type: 'text',
                                                text: 'TOTAL',
                                                size: 'sm',
                                                color: '#555555'
                                            },
                                            {
                                                type: 'text',
                                                text: `${price} ${cinerinoapi.factory.priceCurrency.JPY}`,
                                                size: 'sm',
                                                color: '#111111',
                                                align: 'end'
                                            }
                                        ]
                                    }
                                    // {
                                    //     type: 'box',
                                    //     layout: 'horizontal',
                                    //     contents: [
                                    //         {
                                    //             type: 'text',
                                    //             text: '決済方法',
                                    //             size: 'sm',
                                    //             color: '#555555'
                                    //         },
                                    //         {
                                    //             type: 'text',
                                    //             text: params.paymentMethodType,
                                    //             size: 'sm',
                                    //             color: '#111111',
                                    //             align: 'end'
                                    //         }
                                    //     ]
                                    // }
                                ]
                            }
                        ]
                    },
                    footer: {
                        type: 'box',
                        layout: 'vertical',
                        spacing: 'sm',
                        contents: [
                            {
                                type: 'button',
                                // flex: 2,
                                style: 'primary',
                                action: {
                                    type: 'postback',
                                    label: '注文確定',
                                    data: `action=confirmOrder&transactionId=${params.transactionId}`
                                }
                            },
                            {
                                type: 'button',
                                action: {
                                    type: 'postback',
                                    label: 'キャンセル',
                                    data: `action=cancelOrder&transactionId=${params.transactionId}`
                                }
                            }
                        ]
                    }
                }
            }
        ]);
    });
}
exports.setCustomerContact = setCustomerContact;
// tslint:disable-next-line:max-func-body-length
function confirmOrder(params) {
    return __awaiter(this, void 0, void 0, function* () {
        yield lineClient_1.default.replyMessage(params.replyToken, { type: 'text', text: '注文を確定しています...' });
        const placeOrderService = new cinerinoapi.service.txn.PlaceOrder({
            endpoint: process.env.CINERINO_ENDPOINT,
            auth: params.user.authClient
        });
        const { order } = yield placeOrderService.confirm({
            id: params.transactionId,
            options: {
                sendEmailMessage: true
            }
        });
        const flex = {
            type: 'flex',
            altText: 'This is a Flex Message',
            contents: order2bubble(order)
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
            auth: params.user.authClient
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
            auth: params.user.authClient
        });
        const personOwnershipInfoService = new cinerinoapi.service.person.OwnershipInfo({
            endpoint: process.env.CINERINO_ENDPOINT,
            auth: params.user.authClient
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
        debug('accounts:', accounts);
        if (accounts.length === 0) {
            throw new Error('口座未開設です');
        }
        const account = accounts[0];
        const transferService = new pecorino.service.transaction.Transfer({
            endpoint: process.env.PECORINO_ENDPOINT,
            auth: pecorinoAuthClient
        });
        const transaction = yield transferService.start({
            accountType: cinerinoapi.factory.accountType.Coin,
            // tslint:disable-next-line:no-magic-numbers
            expires: moment().add(10, 'minutes').toDate(),
            agent: {
                typeOf: cinerinoapi.factory.personType.Person,
                name: params.user.userId
            },
            recipient: {
                typeOf: 'Person',
                id: transferMoneyInfo.userId,
                name: transferMoneyInfo.name,
                url: ''
            },
            amount: params.price,
            notes: 'LINEチケットおこづかい',
            fromAccountNumber: account.accountNumber,
            toAccountNumber: transferMoneyInfo.accountNumber
        });
        debug('transaction started.', transaction.id);
        yield lineClient_1.default.pushMessage(params.user.userId, { type: 'text', text: '残高の確認がとれました' });
        // バックエンドで確定
        yield transferService.confirm({
            transactionId: transaction.id
        });
        debug('transaction confirmed.');
        yield lineClient_1.default.pushMessage(params.user.userId, { type: 'text', text: '転送が完了しました' });
        const profile = yield personService.getProfile({});
        // 振込先に通知
        yield lineClient_1.default.pushMessage(params.user.userId, {
            type: 'text',
            text: `${profile.familyName} ${profile.givenName}から${params.price}円おこづかいが振り込まれました`
        });
    });
}
exports.confirmTransferMoney = confirmTransferMoney;
/**
 * クレジットから口座へ入金する
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
 * クレジットから口座へ入金する
 */
function depositCoinByCreditCard(params) {
    return __awaiter(this, void 0, void 0, function* () {
        yield lineClient_1.default.replyMessage(params.replyToken, { type: 'text', text: `${params.amount}円の入金処理を実行します...` });
        const personOwnershipInfoService = new cinerinoapi.service.person.OwnershipInfo({
            endpoint: process.env.CINERINO_ENDPOINT,
            auth: params.user.authClient
        });
        const creditCards = yield personOwnershipInfoService.searchCreditCards({});
        if (creditCards.length === 0) {
            throw new Error('クレジットカード未登録です');
        }
        const lineProfile = yield lineClient_1.default.getProfile(params.user.userId);
        // 入金取引開始
        const depositTransaction = new pecorino.service.transaction.Deposit({
            endpoint: process.env.PECORINO_ENDPOINT,
            auth: pecorinoAuthClient
        });
        const transaction = yield depositTransaction.start({
            // tslint:disable-next-line:no-magic-numbers
            expires: moment().add(10, 'minutes').toDate(),
            agent: {
                typeOf: 'Person',
                id: params.user.userId,
                name: lineProfile.displayName,
                url: ''
            },
            recipient: {
                typeOf: 'Person',
                id: params.user.userId,
                name: lineProfile.displayName,
                url: ''
            },
            amount: params.amount,
            notes: 'LINEチケット入金',
            accountType: params.accountType,
            toAccountNumber: params.toAccountNumber
        });
        yield depositTransaction.confirm({
            transactionId: transaction.id
        });
        yield lineClient_1.default.pushMessage(params.user.userId, { type: 'text', text: '入金処理が完了しました' });
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
            auth: params.user.authClient
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
                        // tslint:disable-next-line:max-func-body-length no-magic-numbers
                        ...creditCards.map((creditCard) => {
                            return {
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
                                            type: 'box',
                                            layout: 'baseline',
                                            contents: [
                                                {
                                                    type: 'icon',
                                                    url: `https://${params.user.host}/img/labels/credit-card-64.png`
                                                },
                                                {
                                                    type: 'text',
                                                    text: (creditCard.cardName.length > 0) ? creditCard.cardName : 'Unknown Card Name',
                                                    wrap: true,
                                                    weight: 'bold',
                                                    margin: 'sm',
                                                    gravity: 'center',
                                                    size: 'xl'
                                                }
                                            ]
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
                                                            text: 'HolderName',
                                                            color: '#aaaaaa',
                                                            size: 'sm',
                                                            flex: 2
                                                        },
                                                        {
                                                            type: 'text',
                                                            text: creditCard.holderName,
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
                                                            text: 'CarNo',
                                                            color: '#aaaaaa',
                                                            size: 'sm',
                                                            flex: 2
                                                        },
                                                        {
                                                            type: 'text',
                                                            text: creditCard.cardNo,
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
                                                            text: 'Expire',
                                                            color: '#aaaaaa',
                                                            size: 'sm',
                                                            flex: 2
                                                        },
                                                        {
                                                            type: 'text',
                                                            text: creditCard.expire,
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
                                },
                                footer: {
                                    type: 'box',
                                    layout: 'vertical',
                                    spacing: 'sm',
                                    contents: [
                                        {
                                            type: 'button',
                                            action: {
                                                type: 'postback',
                                                label: '削除',
                                                data: `action=deleteCreditCard&cardSeq=${creditCard.cardSeq}`
                                            }
                                        },
                                        {
                                            type: 'button',
                                            action: {
                                                type: 'postback',
                                                label: 'コード発行',
                                                data: `action=publishCreditCardToken&cardSeq=${creditCard.cardSeq}`
                                            }
                                        }
                                    ]
                                }
                            };
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
            auth: params.user.authClient
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
            auth: params.user.authClient
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
            auth: params.user.authClient
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
            auth: params.user.authClient
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
            auth: params.user.authClient
        });
        const searchAccountsResult = yield personOwnershipInfoService.search({
            typeOfGood: {
                typeOf: cinerinoapi.factory.ownershipInfo.AccountGoodType.Account,
                accountType: cinerinoapi.factory.accountType.Coin
            }
        });
        const accountOwnershipInfos = searchAccountsResult.data
            .filter((o) => o.typeOfGood.status === cinerinoapi.factory.pecorino.accountStatusType.Opened);
        debug('accounts:', accountOwnershipInfos);
        if (accountOwnershipInfos.length === 0) {
            throw new Error('口座未開設です');
        }
        const flex = {
            type: 'flex',
            altText: 'This is a Flex Message',
            contents: {
                type: 'carousel',
                contents: [
                    // tslint:disable-next-line:max-func-body-length no-magic-numbers
                    ...accountOwnershipInfos.map((ownershipInfo) => {
                        const account = ownershipInfo.typeOfGood;
                        return {
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
                                        type: 'box',
                                        layout: 'baseline',
                                        contents: [
                                            {
                                                type: 'icon',
                                                url: `https://${params.user.host}/img/labels/coin-64.png`
                                            },
                                            {
                                                type: 'text',
                                                text: account.accountNumber,
                                                wrap: true,
                                                weight: 'bold',
                                                margin: 'sm',
                                                gravity: 'center',
                                                size: 'xl'
                                            }
                                        ]
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
                                                        flex: 5
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
                                                        flex: 5
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
                                                        flex: 5
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
                                                        flex: 5
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
                                                        flex: 5
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
                                                        text: moment(account.openDate).format('lll'),
                                                        wrap: true,
                                                        color: '#666666',
                                                        size: 'sm',
                                                        flex: 5
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
                                contents: [
                                    {
                                        type: 'button',
                                        action: {
                                            type: 'postback',
                                            label: '取引履歴確認',
                                            data: qs.stringify({
                                                action: 'searchAccountMoneyTransferActions',
                                                accountType: cinerinoapi.factory.accountType.Coin,
                                                accountNumber: account.accountNumber
                                            })
                                        }
                                    },
                                    {
                                        type: 'button',
                                        action: {
                                            type: 'postback',
                                            label: 'クレジットカードで入金',
                                            data: qs.stringify({
                                                action: 'selectDepositAmount',
                                                accountType: cinerinoapi.factory.accountType.Coin,
                                                accountNumber: account.accountNumber
                                            })
                                        }
                                    },
                                    {
                                        type: 'button',
                                        action: {
                                            type: 'postback',
                                            label: 'コード発行',
                                            data: qs.stringify({
                                                action: 'authorizeOwnershipInfo',
                                                goodType: ownershipInfo.typeOfGood.typeOf,
                                                id: ownershipInfo.id
                                            })
                                        }
                                    },
                                    // {
                                    //     type: 'button',
                                    //     action: {
                                    //         type: 'message',
                                    //         label: 'おこづかいをもらう',
                                    //         text: 'おこづかい'
                                    //     }
                                    // },
                                    {
                                        type: 'button',
                                        action: {
                                            type: 'postback',
                                            label: '解約',
                                            data: qs.stringify({
                                                action: 'closeAccount',
                                                accountType: account.accountType,
                                                accountNumber: account.accountNumber
                                            })
                                        }
                                    }
                                ]
                            }
                        };
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
            auth: params.user.authClient
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
                endDate: cinerinoapi.factory.pecorino.sortType.Descending
            },
            accountType: params.accountType,
            accountNumber: params.accountNumber
        });
        const transferActions = searchActions.data;
        if (searchActions.totalCount === 0) {
            yield lineClient_1.default.pushMessage(params.user.userId, { type: 'text', text: 'まだ取引履歴はありません' });
            return;
        }
        yield lineClient_1.default.pushMessage(params.user.userId, {
            type: 'text',
            text: `${searchActions.totalCount}件の取引履歴が見つかりました`
        });
        yield lineClient_1.default.pushMessage(params.user.userId, { type: 'text', text: `直近の${transferActions.length}件は以下の通りです` });
        const flex = {
            type: 'flex',
            altText: 'This is a Flex Message',
            contents: {
                type: 'carousel',
                contents: [
                    // tslint:disable-next-line:max-func-body-length no-magic-numbers
                    ...transferActions.map((a) => {
                        let actionName = '';
                        switch (a.purpose.typeOf) {
                            case cinerinoapi.factory.pecorino.transactionType.Withdraw:
                                actionName = '支払';
                                break;
                            case cinerinoapi.factory.pecorino.transactionType.Transfer:
                                actionName = '転送';
                                break;
                            case cinerinoapi.factory.pecorino.transactionType.Deposit:
                                actionName = '入金';
                                break;
                            default:
                        }
                        return {
                            type: 'bubble',
                            // styles: {
                            //     footer: {
                            //         separator: true
                            //     }
                            // },
                            body: {
                                type: 'box',
                                layout: 'vertical',
                                spacing: 'md',
                                contents: [
                                    {
                                        type: 'box',
                                        layout: 'baseline',
                                        contents: [
                                            {
                                                type: 'icon',
                                                url: `https://${params.user.host}/img/labels/coin-64.png`
                                            },
                                            {
                                                type: 'text',
                                                text: actionName,
                                                wrap: true,
                                                weight: 'bold',
                                                margin: 'sm',
                                                gravity: 'center',
                                                size: 'xl'
                                            }
                                        ]
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
                                                        text: 'Date',
                                                        wrap: true,
                                                        color: '#aaaaaa',
                                                        size: 'sm',
                                                        flex: 2
                                                    },
                                                    {
                                                        type: 'text',
                                                        text: moment(a.endDate).format('YY.MM.DD HH:mm'),
                                                        wrap: true,
                                                        size: 'sm',
                                                        color: '#666666',
                                                        flex: 5
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
                                                        text: 'Amount',
                                                        wrap: true,
                                                        color: '#aaaaaa',
                                                        size: 'sm',
                                                        flex: 2
                                                    },
                                                    {
                                                        type: 'text',
                                                        text: `${a.amount}`,
                                                        wrap: true,
                                                        size: 'sm',
                                                        color: '#666666',
                                                        flex: 5
                                                    }
                                                ]
                                            },
                                            {
                                                type: 'box',
                                                layout: 'horizontal',
                                                spacing: 'sm',
                                                contents: [
                                                    {
                                                        type: 'box',
                                                        layout: 'vertical',
                                                        margin: 'sm',
                                                        spacing: 'sm',
                                                        flex: 2,
                                                        contents: [
                                                            {
                                                                type: 'text',
                                                                text: 'From',
                                                                wrap: true,
                                                                color: '#aaaaaa',
                                                                size: 'sm'
                                                            }
                                                        ]
                                                    },
                                                    {
                                                        type: 'box',
                                                        layout: 'vertical',
                                                        margin: 'sm',
                                                        spacing: 'sm',
                                                        flex: 5,
                                                        contents: [
                                                            {
                                                                type: 'text',
                                                                // tslint:disable-next-line:max-line-length
                                                                text: `${(a.fromLocation.name !== undefined) ? a.fromLocation.name : '---'}`,
                                                                wrap: true,
                                                                size: 'sm',
                                                                color: '#666666'
                                                            },
                                                            {
                                                                type: 'text',
                                                                // tslint:disable-next-line:max-line-length
                                                                text: `${(a.fromLocation.accountNumber !== undefined) ? a.fromLocation.accountNumber : '---'}`,
                                                                wrap: true,
                                                                size: 'sm',
                                                                color: '#666666'
                                                            }
                                                        ]
                                                    }
                                                ]
                                            },
                                            {
                                                type: 'box',
                                                layout: 'horizontal',
                                                spacing: 'sm',
                                                contents: [
                                                    {
                                                        type: 'box',
                                                        layout: 'vertical',
                                                        margin: 'sm',
                                                        spacing: 'sm',
                                                        flex: 2,
                                                        contents: [
                                                            {
                                                                type: 'text',
                                                                text: 'To',
                                                                wrap: true,
                                                                color: '#aaaaaa',
                                                                size: 'sm'
                                                            }
                                                        ]
                                                    },
                                                    {
                                                        type: 'box',
                                                        layout: 'vertical',
                                                        margin: 'sm',
                                                        spacing: 'sm',
                                                        flex: 5,
                                                        contents: [
                                                            {
                                                                type: 'text',
                                                                // tslint:disable-next-line:max-line-length
                                                                text: `${(a.toLocation.name !== undefined) ? a.toLocation.name : '---'}`,
                                                                wrap: true,
                                                                size: 'sm',
                                                                color: '#666666'
                                                            },
                                                            {
                                                                type: 'text',
                                                                // tslint:disable-next-line:max-line-length
                                                                text: `${(a.toLocation.accountNumber !== undefined) ? a.toLocation.accountNumber : '---'}`,
                                                                wrap: true,
                                                                size: 'sm',
                                                                color: '#666666'
                                                            }
                                                        ]
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
                                                        text: 'Description',
                                                        wrap: true,
                                                        color: '#aaaaaa',
                                                        size: 'sm',
                                                        flex: 2
                                                    },
                                                    {
                                                        type: 'text',
                                                        text: (a.description !== undefined) ? a.description : '---',
                                                        wrap: true,
                                                        color: '#666666',
                                                        size: 'sm',
                                                        flex: 5
                                                    }
                                                ]
                                            }
                                        ]
                                    }
                                ]
                            }
                        };
                    })
                ]
            }
        };
        yield lineClient_1.default.pushMessage(params.user.userId, [flex]);
    });
}
exports.searchAccountMoneyTransferActions = searchAccountMoneyTransferActions;
/**
 * ユーザーのチケット(座席予約)を検索する
 */
// tslint:disable-next-line:max-func-body-length
function searchScreeningEventReservations(params) {
    return __awaiter(this, void 0, void 0, function* () {
        const now = new Date();
        yield lineClient_1.default.replyMessage(params.replyToken, { type: 'text', text: 'ここ一カ月の座席予約を検索しています...' });
        const personOwnershipInfoService = new cinerinoapi.service.person.OwnershipInfo({
            endpoint: process.env.CINERINO_ENDPOINT,
            auth: params.user.authClient
        });
        const searchScreeningEventReservationsResult = yield personOwnershipInfoService.search({
            typeOfGood: {
                typeOf: cinerinoapi.factory.chevre.reservationType.EventReservation
            },
            ownedFrom: moment(now).add(-1, 'month').toDate(),
            ownedThrough: now,
            limit: 10,
            page: 1,
            sort: {
                ownedFrom: cinerinoapi.factory.sortType.Descending
            }
        });
        const ownershipInfos = searchScreeningEventReservationsResult.data;
        debug(searchScreeningEventReservationsResult.totalCount, 'ownershipInfos found.');
        // 未来の予約
        if (searchScreeningEventReservationsResult.totalCount === 0) {
            yield lineClient_1.default.pushMessage(params.user.userId, { type: 'text', text: '座席予約が見つかりませんでした' });
        }
        else {
            yield lineClient_1.default.pushMessage(params.user.userId, {
                type: 'text',
                text: `${searchScreeningEventReservationsResult.totalCount}件の座席予約が見つかりました`
            });
            yield lineClient_1.default.pushMessage(params.user.userId, { type: 'text', text: `直近の${ownershipInfos.length}件は以下の通りです` });
            const flex = {
                type: 'flex',
                altText: 'This is a Flex Message',
                contents: {
                    type: 'carousel',
                    contents: [
                        ...ownershipInfos
                            // tslint:disable-next-line:max-func-body-length
                            .map((ownershipInfo) => {
                            const itemOffered = ownershipInfo.typeOfGood;
                            const event = itemOffered.reservationFor;
                            const thumbnailImageUrl = (event.workPerformed !== undefined
                                && event.workPerformed.thumbnailUrl !== undefined
                                && event.workPerformed.thumbnailUrl !== null)
                                ? event.workPerformed.thumbnailUrl
                                // tslint:disable-next-line:max-line-length
                                : 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRrhpsOJOcLBwc1SPD9sWlinildy4S05-I2Wf6z2wRXnSxbmtRz';
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
                                            text: event.name.ja,
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
                                                            text: moment(event.startDate).format('llll'),
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
                                                            text: itemOffered.reservedTicket.ticketType.name.ja,
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
                                                                : 'No reservedTicket.underName',
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
                                                }
                                            ]
                                        }
                                    ]
                                },
                                footer: {
                                    type: 'box',
                                    layout: 'horizontal',
                                    contents: [
                                        {
                                            type: 'button',
                                            action: {
                                                type: 'postback',
                                                label: 'コード発行',
                                                data: qs.stringify({
                                                    action: 'authorizeOwnershipInfo',
                                                    goodType: ownershipInfo.typeOfGood.typeOf,
                                                    id: ownershipInfo.id
                                                })
                                            }
                                        }
                                    ]
                                }
                            };
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
    return __awaiter(this, void 0, void 0, function* () {
        // イベント詳細取得
        const eventService = new cinerinoapi.service.Event({
            endpoint: process.env.CINERINO_ENDPOINT,
            auth: params.user.authClient
        });
        const sellerService = new cinerinoapi.service.Seller({
            endpoint: process.env.CINERINO_ENDPOINT,
            auth: params.user.authClient
        });
        const placeOrderService = new cinerinoapi.service.txn.PlaceOrder({
            endpoint: process.env.CINERINO_ENDPOINT,
            auth: params.user.authClient
        });
        const event = yield eventService.findScreeningEventById({ id: params.eventId });
        // 販売者情報取得
        const searchSellersResult = yield sellerService.search({});
        const seller = searchSellersResult.data.find((o) => {
            return o.location !== undefined && o.location.branchCode === event.superEvent.location.branchCode;
        });
        if (seller === undefined) {
            throw new Error('Seller not found');
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
        const TRANSACTION_EXPIRES_IN_MINUTES = 5;
        yield lineClient_1.default.pushMessage(params.user.userId, { type: 'text', text: '取引を開始します...' });
        const transaction = yield placeOrderService.start({
            expires: moment().add(TRANSACTION_EXPIRES_IN_MINUTES, 'minutes').toDate(),
            seller: seller,
            object: {}
        });
        yield lineClient_1.default.pushMessage(params.user.userId, { type: 'text', text: `${TRANSACTION_EXPIRES_IN_MINUTES}分以内に取引を終了してください` });
        debug('transaction started.', transaction.id);
        yield params.user.saveTransaction(transaction);
        const storeId = params.user.authClient.options.clientId;
        yield lineClient_1.default.pushMessage(params.user.userId, { type: 'text', text: `店舗ID:${storeId}でオファーを検索しています...` });
        let ticketOffers = yield eventService.searchScreeningEventTicketOffers({
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
        yield lineClient_1.default.pushMessage(params.user.userId, { type: 'text', text: `${ticketOffers.length}件からオファーを選択します...` });
        // tslint:disable-next-line:insecure-random
        const selectedTicketOffer = ticketOffers[Math.floor(ticketOffers.length * Math.random())];
        yield lineClient_1.default.pushMessage(params.user.userId, { type: 'text', text: `オファー ${selectedTicketOffer.name.ja} を選択しました` });
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
        if ((yield params.user.getCredentials()) !== null) {
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
    return __awaiter(this, void 0, void 0, function* () {
        yield lineClient_1.default.replyMessage(params.replyToken, { type: 'text', text: 'コード発行中...' });
        const personOwnershipInfoService = new cinerinoapi.service.person.OwnershipInfo({
            endpoint: process.env.CINERINO_ENDPOINT,
            auth: params.user.authClient
        });
        const eventService = new cinerinoapi.service.Event({
            endpoint: process.env.CINERINO_ENDPOINT,
            auth: params.user.authClient
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
                const event = yield eventService.findScreeningEventById({ id: itemOffered.reservationFor.id });
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
                                            text: event.name.ja,
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
                                                            text: moment(event.startDate).format('llll'),
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
                                                            text: itemOffered.reservedTicket.ticketType.name.ja,
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
                                                            text: moment(account.openDate).format('lll'),
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
// tslint:disable-next-line:max-func-body-length
function searchOrders(params) {
    return __awaiter(this, void 0, void 0, function* () {
        const now = new Date();
        yield lineClient_1.default.replyMessage(params.replyToken, { type: 'text', text: `ここ一カ月の注文を検索しています...` });
        const personService = new cinerinoapi.service.Person({
            endpoint: process.env.CINERINO_ENDPOINT,
            auth: params.user.authClient
        });
        const searchOrdersResult = yield personService.searchOrders({
            orderDateFrom: moment(now).add(-1, 'month').toDate(),
            orderDateThrough: now,
            limit: 10,
            page: 1,
            sort: {
                orderDate: cinerinoapi.factory.sortType.Descending
            }
        });
        const orders = searchOrdersResult.data;
        if (searchOrdersResult.totalCount === 0) {
            yield lineClient_1.default.pushMessage(params.user.userId, { type: 'text', text: '注文が見つかりませんでした' });
        }
        else {
            yield lineClient_1.default.pushMessage(params.user.userId, { type: 'text', text: `${searchOrdersResult.totalCount}件の注文が見つかりました` });
            yield lineClient_1.default.pushMessage(params.user.userId, { type: 'text', text: `直近の${orders.length}件は以下の通りです` });
            const contents = orders.map(order2bubble);
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
            auth: params.user.authClient
        });
        const order = yield orderService.findByConfirmationNumber({
            confirmationNumber: params.confirmationNumber,
            customer: {
                telephone: params.telephone
            }
        });
        yield lineClient_1.default.pushMessage(params.user.userId, { type: 'text', text: '注文が見つかりました' });
        const contents = [order].map(order2bubble);
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
            auth: params.user.authClient
        });
        const orderService = new cinerinoapi.service.Order({
            endpoint: process.env.CINERINO_ENDPOINT,
            auth: params.user.authClient
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
        const event = yield eventService.findScreeningEventById({ id: reservations[0].reservationFor.id });
        const thumbnailImageUrl = (event.workPerformed !== undefined
            && event.workPerformed.thumbnailUrl !== undefined
            && event.workPerformed.thumbnailUrl !== null)
            ? event.workPerformed.thumbnailUrl
            // tslint:disable-next-line:max-line-length
            : 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRrhpsOJOcLBwc1SPD9sWlinildy4S05-I2Wf6z2wRXnSxbmtRz';
        // tslint:disable-next-line:max-func-body-length
        const bubbles = reservations.map((r) => {
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
                            text: event.name.ja,
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
                                            text: moment(event.startDate).format('llll'),
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
                                            text: r.reservedTicket.ticketType.name.ja,
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
// tslint:disable-next-line:max-func-body-length
function order2bubble(order) {
    return {
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
                    text: 'RECEIPT',
                    weight: 'bold',
                    color: '#1DB446',
                    size: 'sm'
                },
                {
                    type: 'text',
                    text: order.seller.name,
                    weight: 'bold',
                    size: 'xxl',
                    margin: 'md',
                    maxLines: 0,
                    wrap: true
                },
                {
                    type: 'text',
                    text: (order.seller.telephone !== undefined) ? order.seller.telephone : 'Unknown telephone',
                    size: 'xs',
                    color: '#aaaaaa',
                    wrap: true
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
                            layout: 'horizontal',
                            contents: [
                                {
                                    type: 'text',
                                    text: '注文番号',
                                    size: 'sm',
                                    color: '#aaaaaa',
                                    flex: 2
                                },
                                {
                                    type: 'text',
                                    text: `${order.orderNumber}`,
                                    size: 'sm',
                                    color: '#666666',
                                    flex: 5
                                }
                            ]
                        },
                        {
                            type: 'box',
                            layout: 'horizontal',
                            contents: [
                                {
                                    type: 'text',
                                    text: '注文日時',
                                    size: 'sm',
                                    color: '#aaaaaa',
                                    flex: 2
                                },
                                {
                                    type: 'text',
                                    text: `${moment(order.orderDate).format('llll')}`,
                                    size: 'sm',
                                    color: '#666666',
                                    flex: 5
                                }
                            ]
                        },
                        {
                            type: 'box',
                            layout: 'horizontal',
                            contents: [
                                {
                                    type: 'text',
                                    text: '確認番号',
                                    size: 'sm',
                                    color: '#aaaaaa',
                                    flex: 2
                                },
                                {
                                    type: 'text',
                                    text: `${order.confirmationNumber}`,
                                    size: 'sm',
                                    color: '#666666',
                                    flex: 5
                                }
                            ]
                        },
                        {
                            type: 'box',
                            layout: 'horizontal',
                            contents: [
                                {
                                    type: 'text',
                                    text: 'Status',
                                    size: 'sm',
                                    color: '#aaaaaa',
                                    flex: 2
                                },
                                {
                                    type: 'text',
                                    text: `${order.orderStatus}`,
                                    size: 'sm',
                                    color: '#666666',
                                    flex: 5
                                }
                            ]
                        }
                    ]
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
                        ...order.acceptedOffers.map((orderItem) => {
                            let itemName = String(orderItem.itemOffered.typeOf);
                            let itemDescription = 'no description';
                            let priceStr = orderItem.priceCurrency.toString();
                            switch (orderItem.itemOffered.typeOf) {
                                case 'ProgramMembership':
                                    break;
                                case cinerinoapi.factory.chevre.reservationType.EventReservation:
                                    const item = orderItem.itemOffered;
                                    const event = item.reservationFor;
                                    itemName = util_1.format('%s %s', event.name.ja, moment(event.startDate).format('MM/DD HH:mm'));
                                    // tslint:disable-next-line:max-line-length no-unnecessary-local-variable
                                    if (item.reservedTicket !== undefined) {
                                        if (item.reservedTicket.ticketedSeat !== undefined) {
                                            itemDescription = util_1.format('%s %s', item.reservedTicket.ticketedSeat.seatNumber, item.reservedTicket.ticketType.name.ja);
                                        }
                                        else {
                                            itemDescription = util_1.format('%s %s', '座席なし', item.reservedTicket.ticketType.name.ja);
                                        }
                                    }
                                    else {
                                        itemDescription = 'No Reserved Ticket';
                                    }
                                    if (orderItem.priceSpecification !== undefined) {
                                        const priceSpecification = orderItem.priceSpecification;
                                        // tslint:disable-next-line:max-line-length
                                        const unitPriceSpec = priceSpecification.priceComponent.find(
                                        // tslint:disable-next-line:max-line-length
                                        (spec) => spec.typeOf === cinerinoapi.factory.chevre.priceSpecificationType.UnitPriceSpecification);
                                        if (unitPriceSpec !== undefined) {
                                            // tslint:disable-next-line:max-line-length
                                            priceStr = `${unitPriceSpec.price}/${unitPriceSpec.referenceQuantity.value} ${unitPriceSpec.priceCurrency}`;
                                        }
                                        else {
                                            priceStr = 'No Unit Price Spec';
                                        }
                                    }
                                    else {
                                        priceStr = 'No Price Spec';
                                    }
                                    break;
                                default:
                            }
                            return {
                                type: 'box',
                                layout: 'horizontal',
                                contents: [
                                    {
                                        type: 'box',
                                        layout: 'vertical',
                                        flex: 2,
                                        contents: [
                                            {
                                                type: 'text',
                                                text: itemName,
                                                size: 'xs',
                                                color: '#555555',
                                                wrap: true
                                            },
                                            {
                                                type: 'text',
                                                text: itemDescription,
                                                size: 'xs',
                                                color: '#aaaaaa'
                                            }
                                        ]
                                    },
                                    {
                                        type: 'text',
                                        text: priceStr,
                                        size: 'xs',
                                        color: '#111111',
                                        align: 'end',
                                        flex: 1,
                                        gravity: 'top'
                                    }
                                ]
                            };
                        }),
                        {
                            type: 'separator',
                            margin: 'xxl'
                        },
                        {
                            type: 'box',
                            layout: 'horizontal',
                            margin: 'xxl',
                            contents: [
                                {
                                    type: 'text',
                                    text: 'ITEMS',
                                    size: 'sm',
                                    color: '#555555'
                                },
                                {
                                    type: 'text',
                                    text: `${order.acceptedOffers.length}`,
                                    size: 'sm',
                                    color: '#111111',
                                    align: 'end'
                                }
                            ]
                        },
                        {
                            type: 'box',
                            layout: 'horizontal',
                            contents: [
                                {
                                    type: 'text',
                                    text: 'TOTAL',
                                    size: 'sm',
                                    color: '#555555'
                                },
                                {
                                    type: 'text',
                                    text: `${order.price} ${order.priceCurrency}`,
                                    size: 'sm',
                                    color: '#111111',
                                    align: 'end'
                                }
                            ]
                        }
                    ]
                },
                {
                    type: 'separator',
                    margin: 'xxl'
                },
                {
                    type: 'box',
                    layout: 'vertical',
                    margin: 'none',
                    spacing: 'sm',
                    contents: [
                        {
                            type: 'box',
                            layout: 'horizontal',
                            margin: 'md',
                            contents: [
                                {
                                    type: 'text',
                                    text: 'PAYMENT ID',
                                    size: 'xs',
                                    color: '#aaaaaa',
                                    flex: 0
                                },
                                {
                                    type: 'text',
                                    text: (order.paymentMethods.length > 0) ? order.paymentMethods[0].paymentMethodId : '---',
                                    color: '#aaaaaa',
                                    size: 'xs',
                                    align: 'end'
                                }
                            ]
                        },
                        {
                            type: 'box',
                            layout: 'horizontal',
                            margin: 'md',
                            contents: [
                                {
                                    type: 'text',
                                    text: 'ACCOUNT ID',
                                    size: 'xs',
                                    color: '#aaaaaa',
                                    flex: 0
                                },
                                {
                                    type: 'text',
                                    text: (order.paymentMethods.length > 0) ? String(order.paymentMethods[0].accountId) : '---',
                                    color: '#aaaaaa',
                                    size: 'xs',
                                    align: 'end'
                                }
                            ]
                        }
                    ]
                }
            ]
        }
    };
}
/**
 * 座席予約コード読み込み
 */
// tslint:disable-next-line:max-func-body-length
function findScreeningEventReservationById(params) {
    return __awaiter(this, void 0, void 0, function* () {
        yield lineClient_1.default.replyMessage(params.replyToken, { type: 'text', text: 'コードを読み込んでいます...' });
        const ownershipInfoService = new cinerinoapi.service.OwnershipInfo({
            endpoint: process.env.CINERINO_ENDPOINT,
            auth: params.user.authClient
        });
        const reservationService = new cinerinoapi.service.Reservation({
            endpoint: process.env.CINERINO_ENDPOINT,
            auth: params.user.authClient
        });
        const eventService = new cinerinoapi.service.Event({
            endpoint: process.env.CINERINO_ENDPOINT,
            auth: params.user.authClient
        });
        try {
            const { token } = yield ownershipInfoService.getToken({ code: params.code });
            const ownershipInfo = yield reservationService.findScreeningEventReservationByToken({ token: token });
            yield lineClient_1.default.pushMessage(params.user.userId, { type: 'text', text: '予約が見つかりました' });
            const reservation = ownershipInfo.typeOfGood;
            const event = yield eventService.findScreeningEventById({ id: reservation.reservationFor.id });
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
                                        text: event.name.ja,
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
                                                        text: moment(event.startDate).format('llll'),
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
                                                        text: (reservation.reservedTicket.ticketedSeat !== undefined)
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
                                                        text: reservation.reservedTicket.ticketType.name.ja,
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
                                                        text: (reservation.reservedTicket.issuedBy !== undefined)
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
                                                        text: (reservation.reservedTicket.underName !== undefined)
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
// tslint:disable-next-line:max-func-body-length
function getProfile(params) {
    return __awaiter(this, void 0, void 0, function* () {
        yield lineClient_1.default.replyMessage(params.replyToken, { type: 'text', text: `プロフィールを検索しています...` });
        const personService = new cinerinoapi.service.Person({
            endpoint: process.env.CINERINO_ENDPOINT,
            auth: params.user.authClient
        });
        const profile = yield personService.getProfile({});
        yield lineClient_1.default.pushMessage(params.user.userId, { type: 'text', text: 'プロフィールが見つかりました' });
        const contents = [profile2bubble(profile)];
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
            auth: params.user.authClient
        });
        yield lineClient_1.default.replyMessage(params.replyToken, { type: 'text', text: `プロフィールを更新しています...` });
        yield personService.updateProfile(Object.assign({}, params.profile));
        yield lineClient_1.default.pushMessage(params.user.userId, { type: 'text', text: 'プロフィールを更新しました' });
        const contents = [profile2bubble(params.profile)];
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
// tslint:disable-next-line:max-func-body-length
function profile2bubble(params) {
    return {
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
                    text: 'PROFILE',
                    weight: 'bold',
                    color: '#1DB446',
                    size: 'sm'
                },
                {
                    type: 'box',
                    layout: 'vertical',
                    margin: 'xxl',
                    spacing: 'sm',
                    contents: [
                        {
                            type: 'box',
                            layout: 'horizontal',
                            contents: [
                                {
                                    type: 'text',
                                    text: '姓',
                                    size: 'sm',
                                    color: '#aaaaaa',
                                    flex: 2
                                },
                                {
                                    type: 'text',
                                    text: (params.familyName !== '') ? String(params.familyName) : 'Unknown',
                                    size: 'sm',
                                    color: '#666666',
                                    flex: 5
                                }
                            ]
                        },
                        {
                            type: 'box',
                            layout: 'horizontal',
                            contents: [
                                {
                                    type: 'text',
                                    text: '名',
                                    size: 'sm',
                                    color: '#aaaaaa',
                                    flex: 2
                                },
                                {
                                    type: 'text',
                                    text: (params.givenName !== '') ? String(params.givenName) : 'Unknown',
                                    size: 'sm',
                                    color: '#666666',
                                    flex: 5
                                }
                            ]
                        },
                        {
                            type: 'box',
                            layout: 'horizontal',
                            contents: [
                                {
                                    type: 'text',
                                    text: 'Eメール',
                                    size: 'sm',
                                    color: '#aaaaaa',
                                    flex: 2
                                },
                                {
                                    type: 'text',
                                    text: (params.email !== '') ? String(params.email) : 'Unknown',
                                    size: 'sm',
                                    color: '#666666',
                                    flex: 5
                                }
                            ]
                        },
                        {
                            type: 'box',
                            layout: 'horizontal',
                            contents: [
                                {
                                    type: 'text',
                                    text: 'TEL',
                                    size: 'sm',
                                    color: '#aaaaaa',
                                    flex: 2
                                },
                                {
                                    type: 'text',
                                    text: (params.telephone !== '') ? String(params.telephone) : 'Unknown',
                                    size: 'sm',
                                    color: '#666666',
                                    flex: 5
                                }
                            ]
                        }
                    ]
                }
            ]
        }
    };
}
