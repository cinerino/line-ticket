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
const cinerino = require("@cinerino/domain");
const createDebug = require("debug");
const googleapis_1 = require("googleapis");
const moment = require("moment");
const querystring = require("querystring");
const lineClient_1 = require("../../../lineClient");
const debug = createDebug('cinerino-line-ticket:*');
const customsearch = googleapis_1.google.customsearch('v1');
const pecorinoAuthClient = new cinerino.pecorinoapi.auth.ClientCredentials({
    domain: process.env.PECORINO_AUTHORIZE_SERVER_DOMAIN,
    clientId: process.env.PECORINO_CLIENT_ID,
    clientSecret: process.env.PECORINO_CLIENT_SECRET,
    scopes: [],
    state: ''
});
/**
 * 日付でイベント検索
 * @param {string} userId
 * @param {string} date YYYY-MM-DD形式
 */
function searchEventsByDate(params) {
    return __awaiter(this, void 0, void 0, function* () {
        yield lineClient_1.default.replyMessage(params.replyToken, { type: 'text', text: `${params.date}のイベントを検索しています...` });
        const eventService = new cinerinoapi.service.Event({
            endpoint: process.env.CINERINO_ENDPOINT,
            auth: params.user.authClient
        });
        const startFrom = moment.unix(Math.max(moment(`${params.date}T00:00:00+09:00`).unix(), moment().unix())).toDate();
        const screeningEvents = yield eventService.searchScreeningEvents({
            startFrom: startFrom,
            startThrough: moment(`${params.date}T00:00:00+09:00`).add(1, 'day').toDate()
            // superEventLocationIdentifiers: ['MovieTheater-118']
        });
        // 上映イベントシリーズをユニークに
        let superEvents = screeningEvents.map((e) => e.superEvent);
        superEvents = superEvents.filter((e, index, events) => events.map((e2) => e2.id).indexOf(e.id) === index);
        // tslint:disable-next-line:no-magic-numbers
        superEvents = superEvents.slice(0, 10);
        yield lineClient_1.default.pushMessage(params.user.userId, { type: 'text', text: `${superEvents.length}件の作品がみつかりました` });
        // googleで画像検索
        const CX = '006320166286449124373:nm_gjsvlgnm';
        const API_KEY = 'AIzaSyBP1n1HhsS4_KFADZMcBCFOqqSmIgOHAYI';
        const thumbnails = [];
        yield Promise.all(superEvents.map((event) => __awaiter(this, void 0, void 0, function* () {
            return new Promise((resolve) => {
                customsearch.cse.list({
                    cx: CX,
                    q: event.workPerformed.name,
                    auth: API_KEY,
                    num: 1,
                    rights: 'cc_publicdomain cc_sharealike',
                    // start: 0,
                    // imgSize: 'small',
                    searchType: 'image'
                }, (err, res) => {
                    if (!(err instanceof Error)) {
                        if (Array.isArray(res.data.items) && res.data.items.length > 0) {
                            debug(res.data.items[0]);
                            thumbnails.push({
                                eventId: event.id,
                                link: res.data.items[0].link,
                                thumbnailLink: res.data.items[0].image.thumbnailLink
                            });
                        }
                    }
                    resolve();
                });
            });
        })));
        debug(thumbnails);
        // const accessToken = await params.user.authClient.getAccessToken();
        const flex = {
            type: 'flex',
            altText: 'This is a Flex Message',
            contents: {
                type: 'carousel',
                contents: [
                    // tslint:disable-next-line:max-func-body-length no-magic-numbers
                    ...superEvents.slice(0, 10).map((event) => {
                        // const itemOffered = ownershipInfo.typeOfGood;
                        // const event = itemOffered.reservationFor;
                        const thumbnail = thumbnails.find((t) => t.eventId === event.id);
                        const thumbnailImageUrl = (thumbnail !== undefined)
                            ? thumbnail.thumbnailLink
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
                                                        text: 'Date',
                                                        color: '#aaaaaa',
                                                        size: 'sm',
                                                        flex: 1
                                                    },
                                                    {
                                                        type: 'text',
                                                        text: moment(event.startDate).format('lll'),
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
                                            label: 'スケジュール選択',
                                            data: querystring.stringify({
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
        yield lineClient_1.default.pushMessage(params.user.userId, {
            type: 'text',
            text: `${startFrom.toISOString()}-${startThrough.toISOString()}のイベントを検索しています...`
        });
        let screeningEvents = yield eventService.searchScreeningEvents({
            startFrom: startFrom,
            startThrough: startThrough
            // superEventLocationIdentifiers: ['MovieTheater-118']
        });
        // 上映イベントシリーズをユニークに
        screeningEvents = screeningEvents
            .filter((e) => e.superEvent.id === params.screeningEventSeriesId)
            // tslint:disable-next-line:no-magic-numbers
            .slice(0, 10);
        yield lineClient_1.default.pushMessage(params.user.userId, { type: 'text', text: `${screeningEvents.length}件のスケジュールがみつかりました` });
        // tslint:disable-next-line:max-func-body-length
        const bubbles = screeningEvents.map((event) => {
            const query = querystring.stringify({ eventId: event.id, userId: params.user.userId });
            const selectSeatsUri = `/transactions/placeOrder/selectSeatOffers?${query}`;
            const liffUri = `line://app/${process.env.LIFF_ID}?${querystring.stringify({ cb: selectSeatsUri })}`;
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
                                            text: 'Start',
                                            color: '#aaaaaa',
                                            size: 'sm',
                                            flex: 1
                                        },
                                        {
                                            type: 'text',
                                            text: moment(event.startDate).format('MM.DD HH:mm'),
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
                                            text: 'End',
                                            color: '#aaaaaa',
                                            size: 'sm',
                                            flex: 1
                                        },
                                        {
                                            type: 'text',
                                            text: moment(event.endDate).format('MM.DD HH:mm'),
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
                                label: '座席選択',
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
        const liffUri = `line://app/${process.env.LIFF_ID}?${querystring.stringify({ cb: scanQRUri })}`;
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
        const placeOrderService = new cinerinoapi.service.transaction.PlaceOrder({
            endpoint: process.env.CINERINO_ENDPOINT,
            auth: params.user.authClient
        });
        const ownershipInfoService = new cinerinoapi.service.OwnershipInfo({
            endpoint: process.env.CINERINO_ENDPOINT,
            auth: params.user.authClient
        });
        let price = 0;
        const actionRepo = new cinerino.repository.Action(cinerino.mongoose.connection);
        const transactionRepo = new cinerino.repository.Transaction(cinerino.mongoose.connection);
        const authorizeActions = yield actionRepo.findAuthorizeByTransactionId(params.transactionId);
        const transaction = yield transactionRepo.findById(cinerinoapi.factory.transactionType.PlaceOrder, params.transactionId);
        const seatReservations = authorizeActions
            .filter((a) => a.actionStatus === cinerinoapi.factory.actionStatusType.CompletedActionStatus)
            .filter((a) => a.object.typeOf === cinerinoapi.factory.action.authorize.offer.seatReservation.ObjectType.SeatReservation);
        const authorizeSeatReservationResult = seatReservations[0].result;
        price = authorizeSeatReservationResult.price;
        const tmpReservations = authorizeSeatReservationResult.responseBody.object.reservations;
        // const requiredPoint = (<cinerinoapi.factory.action.authorize.offer.seatReservation.IResult>seatReservations[0].result).point;
        switch (params.paymentMethodType) {
            case cinerinoapi.factory.paymentMethodType.Account:
                yield lineClient_1.default.replyMessage(params.replyToken, { type: 'text', text: '残高を確認しています...' });
                let account;
                if (params.code === undefined) {
                    // 口座番号取得
                    let accounts = yield personService.searchAccounts({ personId: 'me', accountType: cinerinoapi.factory.accountType.Coin })
                        .then((ownershiInfos) => ownershiInfos.map((o) => o.typeOfGood));
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
                const accountAuthorization = yield placeOrderService.authorizeAccountPayment({
                    transactionId: params.transactionId,
                    amount: price,
                    fromAccount: account
                });
                debug('残高確認済', accountAuthorization);
                yield lineClient_1.default.pushMessage(params.user.userId, { type: 'text', text: '残高の確認がとれました' });
                break;
            case cinerinoapi.factory.paymentMethodType.CreditCard:
                yield lineClient_1.default.replyMessage(params.replyToken, { type: 'text', text: 'クレジットカードを確認しています...' });
                // 口座番号取得
                const creditCards = yield personService.searchCreditCards({ personId: 'me' });
                if (creditCards.length === 0) {
                    throw new Error('クレジットカード未登録です');
                }
                const creditCard = creditCards[0];
                const orderId = `${moment().format('YYYYMMDD')}${moment().unix().toString()}`;
                yield placeOrderService.authorizeCreditCardPayment({
                    transactionId: params.transactionId,
                    amount: price,
                    orderId: orderId,
                    method: '1',
                    creditCard: {
                        memberId: 'me',
                        cardSeq: Number(creditCard.cardSeq)
                        // cardPass?: string;
                    }
                });
                yield lineClient_1.default.pushMessage(params.user.userId, { type: 'text', text: `${creditCard.cardNo}で決済を受け付けます` });
                break;
            default:
                throw new Error(`Unknown payment method ${params.paymentMethodType}`);
        }
        // const loginTicket = params.user.authClient.verifyIdToken({});
        let contact = yield personService.getContacts({ personId: 'me' });
        const lineProfile = yield lineClient_1.default.getProfile(params.user.userId);
        contact = {
            givenName: lineProfile.displayName,
            familyName: 'LINE',
            email: contact.email,
            telephone: '+819012345678' // dummy
        };
        yield placeOrderService.setCustomerContact({
            transactionId: params.transactionId,
            contact: contact
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
                                text: transaction.seller.name.ja,
                                weight: 'bold',
                                size: 'xxl',
                                margin: 'md',
                                maxLines: 0,
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
                                        type: 'text',
                                        text: `${contact.givenName} ${contact.familyName}`,
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
                                    {
                                        type: 'text',
                                        text: tmpReservations[0].reservationFor.name.ja,
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
                                                        text: 'Date',
                                                        color: '#aaaaaa',
                                                        size: 'sm',
                                                        flex: 1
                                                    },
                                                    {
                                                        type: 'text',
                                                        text: `${moment(tmpReservations[0].reservationFor.startDate).format('llll')}`,
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
                                                        text: 'Place',
                                                        color: '#aaaaaa',
                                                        size: 'sm',
                                                        flex: 1
                                                    },
                                                    {
                                                        type: 'text',
                                                        text: `${tmpReservations[0].reservationFor.location.name.ja}`,
                                                        wrap: true,
                                                        color: '#666666',
                                                        size: 'sm',
                                                        flex: 4
                                                    }
                                                ]
                                            }
                                        ]
                                    },
                                    ...tmpReservations.map((r) => {
                                        // tslint:disable-next-line:max-line-length no-unnecessary-local-variable
                                        const str = `${r.reservedTicket.ticketedSeat.seatNumber} ${r.reservedTicket.ticketType.name.ja}`;
                                        return {
                                            type: 'box',
                                            layout: 'horizontal',
                                            contents: [
                                                {
                                                    type: 'text',
                                                    text: str,
                                                    size: 'sm',
                                                    color: '#555555',
                                                    flex: 0
                                                },
                                                {
                                                    type: 'text',
                                                    text: `${r.price} ${r.priceCurrency}`,
                                                    size: 'sm',
                                                    color: '#111111',
                                                    align: 'end'
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
                                    },
                                    {
                                        type: 'box',
                                        layout: 'horizontal',
                                        contents: [
                                            {
                                                type: 'text',
                                                text: '決済方法',
                                                size: 'sm',
                                                color: '#555555'
                                            },
                                            {
                                                type: 'text',
                                                text: params.paymentMethodType,
                                                size: 'sm',
                                                color: '#111111',
                                                align: 'end'
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
exports.selectPaymentMethodType = selectPaymentMethodType;
// tslint:disable-next-line:max-func-body-length
function confirmOrder(params) {
    return __awaiter(this, void 0, void 0, function* () {
        yield lineClient_1.default.replyMessage(params.replyToken, { type: 'text', text: '注文を確定しています...' });
        const placeOrderService = new cinerinoapi.service.transaction.PlaceOrder({
            endpoint: process.env.CINERINO_ENDPOINT,
            auth: params.user.authClient
        });
        const { order } = yield placeOrderService.confirm({
            transactionId: params.transactionId
        });
        const event = order.acceptedOffers[0].itemOffered.reservationFor;
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
                                                        text: 'Date',
                                                        color: '#aaaaaa',
                                                        size: 'sm',
                                                        flex: 1
                                                    },
                                                    {
                                                        type: 'text',
                                                        text: `${moment(event.startDate).format('llll')}`,
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
                                                        text: 'Place',
                                                        color: '#aaaaaa',
                                                        size: 'sm',
                                                        flex: 1
                                                    },
                                                    {
                                                        type: 'text',
                                                        text: `${event.location.name.ja}`,
                                                        wrap: true,
                                                        color: '#666666',
                                                        size: 'sm',
                                                        flex: 4
                                                    }
                                                ]
                                            }
                                        ]
                                    },
                                    ...order.acceptedOffers.map((orderItem) => {
                                        const item = orderItem.itemOffered;
                                        // tslint:disable-next-line:max-line-length no-unnecessary-local-variable
                                        const str = `${item.reservedTicket.ticketedSeat.seatNumber} ${item.reservedTicket.ticketType.name.ja}`;
                                        return {
                                            type: 'box',
                                            layout: 'horizontal',
                                            contents: [
                                                {
                                                    type: 'text',
                                                    text: str,
                                                    size: 'sm',
                                                    color: '#555555',
                                                    flex: 0
                                                },
                                                {
                                                    type: 'text',
                                                    text: `${orderItem.price} ${orderItem.priceCurrency}`,
                                                    size: 'sm',
                                                    color: '#111111',
                                                    align: 'end'
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
                                        text: order.paymentMethods[0].paymentMethodId,
                                        color: '#aaaaaa',
                                        size: 'xs',
                                        align: 'end'
                                    }
                                ]
                            }
                        ]
                    }
                }
            }
        ]);
    });
}
exports.confirmOrder = confirmOrder;
/**
 * 友達決済を承認確定
 * @param user LINEユーザー
 * @param transactionId 取引ID
 */
function confirmFriendPay(params) {
    return __awaiter(this, void 0, void 0, function* () {
        const friendPayInfo = yield params.user.verifyFriendPayToken(params.token);
        yield lineClient_1.default.replyMessage(params.replyToken, { type: 'text', text: `${friendPayInfo.price}円の友達決済を受け付けます` });
        yield lineClient_1.default.pushMessage(params.user.userId, { type: 'text', text: '残高を確認しています...' });
        const personService = new cinerinoapi.service.Person({
            endpoint: process.env.CINERINO_ENDPOINT,
            auth: params.user.authClient
        });
        const placeOrderService = new cinerinoapi.service.transaction.PlaceOrder({
            endpoint: process.env.CINERINO_ENDPOINT,
            auth: params.user.authClient
        });
        const actionRepo = new cinerino.repository.Action(cinerino.mongoose.connection);
        const authorizeActions = yield actionRepo.findAuthorizeByTransactionId(friendPayInfo.transactionId);
        const seatReservations = authorizeActions
            .filter((a) => a.actionStatus === cinerinoapi.factory.actionStatusType.CompletedActionStatus)
            .filter((a) => a.object.typeOf === cinerinoapi.factory.action.authorize.offer.seatReservation.ObjectType.SeatReservation);
        const requiredPoint = seatReservations[0].result.point;
        // 口座番号取得
        let accounts = yield personService.searchAccounts({ personId: 'me', accountType: cinerinoapi.factory.accountType.Coin })
            .then((ownershipInfos) => ownershipInfos.map((o) => o.typeOfGood));
        accounts = accounts.filter((a) => a.status === cinerinoapi.factory.pecorino.accountStatusType.Opened);
        debug('accounts:', accounts);
        if (accounts.length === 0) {
            throw new Error('口座未開設です');
        }
        const account = accounts[0];
        const pecorinoAuthorization = yield placeOrderService.authorizeAccountPayment({
            transactionId: friendPayInfo.transactionId,
            amount: requiredPoint,
            fromAccount: {
                accountType: cinerinoapi.factory.accountType.Coin,
                accountNumber: account.accountNumber
            }
        });
        debug('残高確認済', pecorinoAuthorization);
        yield lineClient_1.default.pushMessage(params.user.userId, { type: 'text', text: '残高の確認がとれました' });
        yield lineClient_1.default.pushMessage(params.user.userId, { type: 'text', text: '友達決済を承認しました' });
        const template = {
            type: 'template',
            altText: 'This is a buttons template',
            template: {
                type: 'confirm',
                text: '取引を続行しますか?',
                actions: [
                    {
                        type: 'postback',
                        label: 'Yes',
                        // tslint:disable-next-line:max-line-length
                        data: `action=continueTransactionAfterFriendPayConfirmation&transactionId=${friendPayInfo.transactionId}&price=${friendPayInfo.price}`
                    },
                    {
                        type: 'postback',
                        label: 'No',
                        // tslint:disable-next-line:max-line-length
                        data: `action=cancelTransactionAfterFriendPayConfirmation&transactionId=${friendPayInfo.transactionId}&price=${friendPayInfo.price}`
                    }
                ]
            }
        };
        yield lineClient_1.default.pushMessage(params.user.userId, [template]);
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
        let accounts = yield personService.searchAccounts({ personId: 'me', accountType: cinerinoapi.factory.accountType.Coin })
            .then((ownershipInfos) => ownershipInfos.map((o) => o.typeOfGood));
        accounts = accounts.filter((a) => a.status === cinerinoapi.factory.pecorino.accountStatusType.Opened);
        debug('accounts:', accounts);
        if (accounts.length === 0) {
            throw new Error('口座未開設です');
        }
        const account = accounts[0];
        const transferService = new cinerino.pecorinoapi.service.transaction.Transfer({
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
        const contact = yield personService.getContacts({ personId: 'me' });
        // 振込先に通知
        yield lineClient_1.default.pushMessage(params.user.userId, {
            type: 'text',
            text: `${contact.familyName} ${contact.givenName}から${params.price}円おこづかいが振り込まれました`
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
                            data: querystring.stringify({
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
                            data: querystring.stringify({
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
                            data: querystring.stringify({
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
        const personService = new cinerinoapi.service.Person({
            endpoint: process.env.CINERINO_ENDPOINT,
            auth: params.user.authClient
        });
        const creditCards = yield personService.searchCreditCards({ personId: 'me' });
        if (creditCards.length === 0) {
            throw new Error('クレジットカード未登録です');
        }
        const lineProfile = yield lineClient_1.default.getProfile(params.user.userId);
        // 入金取引開始
        const depositTransaction = new cinerino.pecorinoapi.service.transaction.Deposit({
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
        const personService = new cinerinoapi.service.Person({
            endpoint: process.env.CINERINO_ENDPOINT,
            auth: params.user.authClient
        });
        const creditCards = yield personService.searchCreditCards({ personId: 'me' });
        yield lineClient_1.default.pushMessage(params.user.userId, { type: 'text', text: `${creditCards.length}件のクレジットカードがみつかりました` });
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
    });
}
exports.searchCreditCards = searchCreditCards;
function addCreditCard(params) {
    return __awaiter(this, void 0, void 0, function* () {
        const personService = new cinerinoapi.service.Person({
            endpoint: process.env.CINERINO_ENDPOINT,
            auth: params.user.authClient
        });
        const creditCard = yield personService.addCreditCard({ personId: 'me', creditCard: { token: params.token } });
        yield lineClient_1.default.replyMessage(params.replyToken, { type: 'text', text: `クレジットカード ${creditCard.cardNo} が追加されました` });
    });
}
exports.addCreditCard = addCreditCard;
function deleteCreditCard(params) {
    return __awaiter(this, void 0, void 0, function* () {
        const personService = new cinerinoapi.service.Person({
            endpoint: process.env.CINERINO_ENDPOINT,
            auth: params.user.authClient
        });
        yield personService.deleteCreditCard({ personId: 'me', cardSeq: params.cardSeq });
        yield lineClient_1.default.replyMessage(params.replyToken, { type: 'text', text: 'クレジットカードが削除されました' });
    });
}
exports.deleteCreditCard = deleteCreditCard;
/**
 * 口座開設
 */
function openAccount(params) {
    return __awaiter(this, void 0, void 0, function* () {
        const personService = new cinerinoapi.service.Person({
            endpoint: process.env.CINERINO_ENDPOINT,
            auth: params.user.authClient
        });
        const accountOwnershipInfo = yield personService.openAccount({
            personId: 'me',
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
        const personService = new cinerinoapi.service.Person({
            endpoint: process.env.CINERINO_ENDPOINT,
            auth: params.user.authClient
        });
        yield personService.closeAccount({ personId: 'me', accountType: params.accountType, accountNumber: params.accountNumber });
        yield lineClient_1.default.replyMessage(params.replyToken, { type: 'text', text: `${params.accountType}口座 ${params.accountNumber} が解約されました` });
    });
}
exports.closeAccount = closeAccount;
function searchCoinAccounts(params) {
    return __awaiter(this, void 0, void 0, function* () {
        const personService = new cinerinoapi.service.Person({
            endpoint: process.env.CINERINO_ENDPOINT,
            auth: params.user.authClient
        });
        let accountOwnershipInfos = yield personService.searchAccounts({ personId: 'me', accountType: cinerinoapi.factory.accountType.Coin });
        accountOwnershipInfos = accountOwnershipInfos
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
                                            data: querystring.stringify({
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
                                            data: querystring.stringify({
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
                                            data: querystring.stringify({
                                                action: 'authorizeOwnershipInfo',
                                                goodType: ownershipInfo.typeOfGood.typeOf,
                                                identifier: ownershipInfo.identifier
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
                                            data: querystring.stringify({
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
        const personService = new cinerinoapi.service.Person({
            endpoint: process.env.CINERINO_ENDPOINT,
            auth: params.user.authClient
        });
        const accountOwnershipInfos = yield personService.searchAccounts({
            personId: 'me',
            accountType: params.accountType
        });
        const accountOwnershipInfo = accountOwnershipInfos.find((o) => o.typeOfGood.accountNumber === params.accountNumber);
        debug('accounts:', accountOwnershipInfo);
        if (accountOwnershipInfo === undefined) {
            throw new Error('口座が見つかりません');
        }
        yield lineClient_1.default.replyMessage(params.replyToken, { type: 'text', text: '取引履歴を検索しています...' });
        let transferActions = yield personService.searchAccountMoneyTransferActions({
            personId: 'me',
            accountType: params.accountType,
            accountNumber: params.accountNumber
        });
        if (transferActions.length === 0) {
            yield lineClient_1.default.pushMessage(params.user.userId, { type: 'text', text: 'まだ取引履歴はありません' });
            return;
        }
        // tslint:disable-next-line:no-magic-numbers
        transferActions = transferActions.slice(0, 10);
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
        yield lineClient_1.default.replyMessage(params.replyToken, { type: 'text', text: '座席予約を検索しています...' });
        const personService = new cinerinoapi.service.Person({
            endpoint: process.env.CINERINO_ENDPOINT,
            auth: params.user.authClient
        });
        let ownershipInfos = yield personService.searchScreeningEventReservations({
            // goodType: cinerinoapi.factory.reservationType.EventReservation,
            personId: 'me'
        });
        debug(ownershipInfos.length, 'ownershipInfos found.');
        // 未来の予約
        ownershipInfos = ownershipInfos.filter((o) => moment(o.typeOfGood.reservationFor.startDate).toDate() >= now);
        if (ownershipInfos.length === 0) {
            yield lineClient_1.default.pushMessage(params.user.userId, { type: 'text', text: '座席予約が見つかりませんでした' });
        }
        else {
            // googleで画像検索
            const events = ownershipInfos.map((o) => o.typeOfGood.reservationFor);
            const CX = '006320166286449124373:nm_gjsvlgnm';
            const API_KEY = 'AIzaSyBP1n1HhsS4_KFADZMcBCFOqqSmIgOHAYI';
            const thumbnails = [];
            yield Promise.all(events.map((event) => __awaiter(this, void 0, void 0, function* () {
                return new Promise((resolve) => {
                    customsearch.cse.list({
                        cx: CX,
                        q: event.workPerformed.name,
                        auth: API_KEY,
                        num: 1,
                        rights: 'cc_publicdomain cc_sharealike',
                        // start: 0,
                        // imgSize: 'small',
                        searchType: 'image'
                    }, (err, res) => {
                        if (!(err instanceof Error)) {
                            if (Array.isArray(res.data.items) && res.data.items.length > 0) {
                                debug(res.data.items[0]);
                                thumbnails.push({
                                    eventId: event.id,
                                    link: res.data.items[0].link,
                                    thumbnailLink: res.data.items[0].image.thumbnailLink
                                });
                            }
                        }
                        resolve();
                    });
                });
            })));
            debug(thumbnails);
            const flex = {
                type: 'flex',
                altText: 'This is a Flex Message',
                contents: {
                    type: 'carousel',
                    contents: [
                        // tslint:disable-next-line:max-func-body-length no-magic-numbers
                        ...ownershipInfos
                            .sort((a, b) => (a.ownedFrom < b.ownedFrom) ? 1 : -1)
                            // tslint:disable-next-line:no-magic-numbers
                            .slice(0, 10)
                            // tslint:disable-next-line:max-func-body-length
                            .map((ownershipInfo) => {
                            const itemOffered = ownershipInfo.typeOfGood;
                            const event = itemOffered.reservationFor;
                            const thumbnail = thumbnails.find((t) => t.eventId === event.id);
                            const thumbnailImageUrl = (thumbnail !== undefined)
                                ? thumbnail.thumbnailLink
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
                                                            text: 'Date',
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
                                                            text: 'Seats',
                                                            color: '#aaaaaa',
                                                            size: 'sm',
                                                            flex: 1
                                                        },
                                                        {
                                                            type: 'text',
                                                            text: itemOffered.reservedTicket.ticketedSeat.seatNumber,
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
                                                            text: 'Ticket Type',
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
                                                data: querystring.stringify({
                                                    action: 'authorizeOwnershipInfo',
                                                    goodType: ownershipInfo.typeOfGood.typeOf,
                                                    identifier: ownershipInfo.identifier
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
        const organizationService = new cinerinoapi.service.Organization({
            endpoint: process.env.CINERINO_ENDPOINT,
            auth: params.user.authClient
        });
        const placeOrderService = new cinerinoapi.service.transaction.PlaceOrder({
            endpoint: process.env.CINERINO_ENDPOINT,
            auth: params.user.authClient
        });
        const event = yield eventService.findScreeningEventById({ eventId: params.eventId });
        yield lineClient_1.default.replyMessage(params.replyToken, { type: 'text', text: `${event.name.ja}の座席を確保します...` });
        // 販売者情報取得
        const sellers = yield organizationService.searchMovieTheaters({});
        const seller = sellers.find((o) => o.location.branchCode === event.superEvent.location.branchCode);
        if (seller === undefined) {
            throw new Error('Seller not found');
        }
        // 取引開始
        // 許可証トークンパラメーターがなければ、WAITERで許可証を取得
        // const passportToken = await request.post(
        //     `${process.env.WAITER_ENDPOINT}/passports`,
        //     {
        //         body: {
        //             scope: `placeOrderTransaction.${seller.identifier}`
        //         },
        //         json: true
        //     }
        // ).then((body) => body.token);
        // debug('passportToken published.', passportToken);
        const transaction = yield placeOrderService.start({
            // tslint:disable-next-line:no-magic-numbers
            expires: moment().add(15, 'minutes').toDate(),
            sellerId: seller.id
            // passportToken: passportToken
        });
        debug('transaction started.', transaction.id);
        // 座席選択
        // 無料鑑賞券取得
        const ticketTypes = yield eventService.searchScreeningEventTicketTypes({ eventId: params.eventId });
        // 空席検索
        const offers = yield eventService.searchScreeningEventOffers({ eventId: params.eventId });
        const seatOffers = offers[0].containsPlace;
        const availableSeatOffers = seatOffers.filter((o) => o.offers !== undefined && o.offers[0].availability === cinerinoapi.factory.chevre.itemAvailability.InStock);
        if (availableSeatOffers.length <= 0) {
            throw new Error('No available seats');
        }
        // 券種をランダムに選択
        // tslint:disable-next-line:insecure-random
        const selectedTicketType = ticketTypes[Math.floor(ticketTypes.length * Math.random())];
        // 座席をランダムに選択
        const selectedScreeningRoomSection = offers[0].branchCode;
        // tslint:disable-next-line:insecure-random
        // const selectedSeatOffer = availableSeatOffers[Math.floor(availableSeatOffers.length * Math.random())];
        debug('creating a seat reservation authorization...');
        const seatReservationAuthorization = yield placeOrderService.authorizeSeatReservation({
            transactionId: transaction.id,
            event: { id: event.id },
            tickets: params.seatNumbers.map((seatNumber) => {
                return {
                    ticketType: {
                        id: selectedTicketType.id
                    },
                    ticketedSeat: {
                        typeOf: cinerinoapi.factory.chevre.placeType.Seat,
                        seatNumber: seatNumber,
                        seatSection: selectedScreeningRoomSection,
                        seatRow: '',
                        seatingType: ''
                    }
                };
            }),
            notes: 'test from samples'
        });
        debug('seatReservationAuthorization:', seatReservationAuthorization);
        yield lineClient_1.default.pushMessage(params.user.userId, { type: 'text', text: `座席 ${params.seatNumbers.join(' ')} を確保しました` });
        const message = {
            type: 'text',
            text: '決済方法を選択してください',
            quickReply: {
                items: [
                    {
                        type: 'action',
                        imageUrl: `https://${params.user.host}/img/labels/credit-card-64.png`,
                        action: {
                            type: 'postback',
                            label: 'クレジットカード',
                            data: querystring.stringify({
                                action: 'selectPaymentMethodType',
                                paymentMethod: cinerinoapi.factory.paymentMethodType.CreditCard,
                                transactionId: transaction.id
                            })
                        }
                    },
                    {
                        type: 'action',
                        imageUrl: `https://${params.user.host}/img/labels/coin-64.png`,
                        action: {
                            type: 'postback',
                            label: 'コイン',
                            data: querystring.stringify({
                                action: 'selectPaymentMethodType',
                                paymentMethod: cinerinoapi.factory.paymentMethodType.Account,
                                transactionId: transaction.id
                            })
                        }
                    },
                    {
                        type: 'action',
                        imageUrl: `https://${params.user.host}/img/labels/friend-pay-50.png`,
                        action: {
                            type: 'postback',
                            label: 'Friend Pay',
                            data: querystring.stringify({
                                action: 'askPaymentCode',
                                transactionId: transaction.id
                            })
                        }
                    }
                ]
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
        const personService = new cinerinoapi.service.Person({
            endpoint: process.env.CINERINO_ENDPOINT,
            auth: params.user.authClient
        });
        const { code } = yield personService.authorizeOwnershipInfo({
            personId: 'me',
            goodType: params.goodType,
            identifier: params.identifier
        });
        yield lineClient_1.default.pushMessage(params.user.userId, { type: 'text', text: 'コードが発行されました' });
        let flex;
        switch (params.goodType) {
            case cinerinoapi.factory.chevre.reservationType.EventReservation:
                const ownershipInfos = yield personService.searchScreeningEventReservations({
                    personId: 'me'
                });
                const reservation = ownershipInfos.find((o) => o.identifier === params.identifier);
                if (reservation === undefined) {
                    throw new Error('Reservation not found');
                }
                // googleで画像検索
                const events = [reservation.typeOfGood.reservationFor];
                const CX = '006320166286449124373:nm_gjsvlgnm';
                const API_KEY = 'AIzaSyBP1n1HhsS4_KFADZMcBCFOqqSmIgOHAYI';
                const thumbnails = [];
                yield Promise.all(events.map((e) => __awaiter(this, void 0, void 0, function* () {
                    return new Promise((resolve) => {
                        customsearch.cse.list({
                            cx: CX,
                            q: e.workPerformed.name,
                            auth: API_KEY,
                            num: 1,
                            rights: 'cc_publicdomain cc_sharealike',
                            // start: 0,
                            // imgSize: 'small',
                            searchType: 'image'
                        }, (err, res) => {
                            if (!(err instanceof Error)) {
                                if (Array.isArray(res.data.items) && res.data.items.length > 0) {
                                    debug(res.data.items[0]);
                                    thumbnails.push({
                                        eventId: e.id,
                                        link: res.data.items[0].link,
                                        thumbnailLink: res.data.items[0].image.thumbnailLink
                                    });
                                }
                            }
                            resolve();
                        });
                    });
                })));
                debug(thumbnails);
                const itemOffered = reservation.typeOfGood;
                const event = itemOffered.reservationFor;
                const thumbnail = thumbnails.find((t) => t.eventId === event.id);
                const thumbnailImageUrl = (thumbnail !== undefined)
                    ? thumbnail.thumbnailLink
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
                                                            text: 'Date',
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
                                                            text: 'Seats',
                                                            color: '#aaaaaa',
                                                            size: 'sm',
                                                            flex: 1
                                                        },
                                                        {
                                                            type: 'text',
                                                            text: itemOffered.reservedTicket.ticketedSeat.seatNumber,
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
                                                            text: 'Ticket Type',
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
                const accountOwnershipInfos = yield personService.searchAccounts({
                    personId: 'me',
                    accountType: cinerinoapi.factory.accountType.Coin
                });
                const accountOwnershipInfo = accountOwnershipInfos.find((o) => o.identifier === params.identifier);
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
        yield lineClient_1.default.replyMessage(params.replyToken, { type: 'text', text: '注文を検索しています...' });
        const orderRepo = new cinerino.repository.Order(cinerino.mongoose.connection);
        const username = params.user.authClient.verifyIdToken({}).getUsername();
        let orders = yield orderRepo.search({
            customerMembershipNumbers: [username],
            orderDateFrom: moment(now).add(-1, 'month').toDate(),
            orderDateThrough: now
        });
        if (orders.length === 0) {
            yield lineClient_1.default.pushMessage(params.user.userId, { type: 'text', text: '注文が見つかりませんでした' });
        }
        else {
            yield lineClient_1.default.pushMessage(params.user.userId, { type: 'text', text: `${orders.length}件の注文が見つかりました` });
            // tslint:disable-next-line:no-magic-numbers
            orders = orders.slice(0, 10);
            // tslint:disable-next-line:max-func-body-length
            const contents = orders.map((order) => {
                const event = order.acceptedOffers[0].itemOffered.reservationFor;
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
                                                        text: 'OrderDate',
                                                        color: '#aaaaaa',
                                                        size: 'sm',
                                                        flex: 1
                                                    },
                                                    {
                                                        type: 'text',
                                                        text: `${moment(order.orderDate).format('llll')}`,
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
                                                        text: 'Status',
                                                        color: '#aaaaaa',
                                                        size: 'sm',
                                                        flex: 1
                                                    },
                                                    {
                                                        type: 'text',
                                                        text: `${order.orderStatus}`,
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
                                                        text: 'OrderNumber',
                                                        color: '#aaaaaa',
                                                        size: 'sm',
                                                        flex: 1
                                                    },
                                                    {
                                                        type: 'text',
                                                        text: `${order.orderNumber}`,
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
                                                        text: 'Confirmation',
                                                        color: '#aaaaaa',
                                                        size: 'sm',
                                                        flex: 1
                                                    },
                                                    {
                                                        type: 'text',
                                                        text: `${order.confirmationNumber}`,
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
                                                        text: 'Date',
                                                        color: '#aaaaaa',
                                                        size: 'sm',
                                                        flex: 1
                                                    },
                                                    {
                                                        type: 'text',
                                                        text: `${moment(event.startDate).format('llll')}`,
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
                                                        text: 'Place',
                                                        color: '#aaaaaa',
                                                        size: 'sm',
                                                        flex: 1
                                                    },
                                                    {
                                                        type: 'text',
                                                        text: `${event.location.name.ja}`,
                                                        wrap: true,
                                                        color: '#666666',
                                                        size: 'sm',
                                                        flex: 4
                                                    }
                                                ]
                                            }
                                        ]
                                    },
                                    {
                                        type: 'separator',
                                        margin: 'xxl'
                                    },
                                    ...order.acceptedOffers.map((orderItem) => {
                                        const item = orderItem.itemOffered;
                                        // tslint:disable-next-line:max-line-length no-unnecessary-local-variable
                                        const str = `${item.reservedTicket.ticketedSeat.seatNumber} ${item.reservedTicket.ticketType.name.ja}`;
                                        return {
                                            type: 'box',
                                            layout: 'horizontal',
                                            contents: [
                                                {
                                                    type: 'text',
                                                    text: str,
                                                    size: 'sm',
                                                    color: '#555555',
                                                    flex: 0
                                                },
                                                {
                                                    type: 'text',
                                                    text: `${orderItem.price} ${orderItem.priceCurrency}`,
                                                    size: 'sm',
                                                    color: '#111111',
                                                    align: 'end'
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
                                        text: order.paymentMethods[0].paymentMethodId,
                                        color: '#aaaaaa',
                                        size: 'xs',
                                        align: 'end'
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
                    contents: contents
                }
            };
            yield lineClient_1.default.pushMessage(params.user.userId, [flex]);
        }
    });
}
exports.searchOrders = searchOrders;
