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
const request = require("request-promise-native");
const LINE = require("../../../line");
const debug = createDebug('cinerino-line-ticket:controller:webhook:postback');
// const MESSAGE_TRANSACTION_NOT_FOUND = '該当取引はありません';
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
function searchEventsByDate(user, date) {
    return __awaiter(this, void 0, void 0, function* () {
        yield LINE.pushMessage(user.userId, `${date}のイベントを検索しています...`);
        const eventService = new cinerinoapi.service.Event({
            endpoint: process.env.CINERINO_ENDPOINT,
            auth: user.authClient
        });
        let events = yield eventService.searchScreeningEvents({
            startFrom: moment(`${date}T00:00:00+09:00`).toDate(),
            startThrough: moment(`${date}T00:00:00+09:00`).add(1, 'day').toDate()
            // superEventLocationIdentifiers: ['MovieTheater-118']
        });
        // tslint:disable-next-line:no-magic-numbers
        events = events.slice(0, 10);
        yield LINE.pushMessage(user.userId, `${events.length}件のイベントがみつかりました。`);
        // googleで画像検索
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
        yield request.post({
            simple: false,
            url: 'https://api.line.me/v2/bot/message/push',
            auth: { bearer: process.env.LINE_BOT_CHANNEL_ACCESS_TOKEN },
            json: true,
            body: {
                to: user.userId,
                messages: [
                    {
                        type: 'template',
                        altText: 'this is a carousel template',
                        template: {
                            type: 'carousel',
                            columns: events.map((event) => {
                                const thumbnail = thumbnails.find((t) => t.eventId === event.id);
                                const thumbnailImageUrl = (thumbnail !== undefined)
                                    ? thumbnail.thumbnailLink
                                    // tslint:disable-next-line:max-line-length
                                    : 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRrhpsOJOcLBwc1SPD9sWlinildy4S05-I2Wf6z2wRXnSxbmtRz';
                                return {
                                    // tslint:disable-next-line:max-line-length no-http-string
                                    thumbnailImageUrl: thumbnailImageUrl,
                                    imageBackgroundColor: '#000000',
                                    title: event.workPerformed.name,
                                    text: `${event.superEvent.location.name.ja} ${event.location.name.ja}`,
                                    actions: [
                                        {
                                            type: 'postback',
                                            label: '座席確保',
                                            data: `action=createTmpReservation&eventId=${event.id}`
                                        }
                                    ]
                                };
                            })
                            // imageAspectRatio: 'rectangle',
                            // imageSize: 'cover'
                        }
                    }
                ]
            }
        }).promise();
    });
}
exports.searchEventsByDate = searchEventsByDate;
/**
 * 座席仮予約
 */
// tslint:disable-next-line:max-func-body-length
function createTmpReservation(user, eventId) {
    return __awaiter(this, void 0, void 0, function* () {
        // イベント詳細取得
        const eventService = new cinerinoapi.service.Event({
            endpoint: process.env.CINERINO_ENDPOINT,
            auth: user.authClient
        });
        const event = yield eventService.findScreeningEventById({ eventId: eventId });
        yield LINE.pushMessage(user.userId, `${event.name.ja}の座席を確保します...`);
        // 販売者情報取得
        const organizationService = new cinerinoapi.service.Organization({
            endpoint: process.env.CINERINO_ENDPOINT,
            auth: user.authClient
        });
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
        const placeOrderService = new cinerinoapi.service.transaction.PlaceOrder({
            endpoint: process.env.CINERINO_ENDPOINT,
            auth: user.authClient
        });
        const transaction = yield placeOrderService.start({
            // tslint:disable-next-line:no-magic-numbers
            expires: moment().add(15, 'minutes').toDate(),
            sellerId: seller.id
            // passportToken: passportToken
        });
        debug('transaction started.', transaction.id);
        // 座席選択
        // 無料鑑賞券取得
        const ticketTypes = yield eventService.searchScreeningEventTicketTypes({ eventId: eventId });
        // 空席検索
        const offers = yield eventService.searchScreeningEventOffers({ eventId: eventId });
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
        const selectedSeatOffer = availableSeatOffers[Math.floor(availableSeatOffers.length * Math.random())];
        debug('creating a seat reservation authorization...');
        const seatReservationAuthorization = yield placeOrderService.authorizeSeatReservation({
            transactionId: transaction.id,
            event: { id: event.id },
            tickets: [
                {
                    ticketType: {
                        id: selectedTicketType.id
                    },
                    ticketedSeat: {
                        typeOf: cinerinoapi.factory.chevre.placeType.Seat,
                        seatNumber: selectedSeatOffer.branchCode,
                        seatSection: selectedScreeningRoomSection,
                        seatRow: '',
                        seatingType: ''
                    }
                }
            ],
            notes: 'test from samples'
        });
        debug('seatReservationAuthorization:', seatReservationAuthorization);
        yield LINE.pushMessage(user.userId, `座席 ${selectedSeatOffer.branchCode} を確保しました。`);
        const LINE_ID = process.env.LINE_ID;
        const token = yield user.signFriendPayInfo({
            transactionId: transaction.id,
            userId: user.userId,
            price: seatReservationAuthorization.result.price
        });
        const friendMessage = `FriendPayToken.${token}`;
        const message = encodeURIComponent(`僕の代わりに決済をお願いできますか？よければ、下のリンクを押してそのままメッセージを送信してください。
line://oaMessage/${LINE_ID}/?${friendMessage}`);
        yield request.post({
            simple: false,
            url: 'https://api.line.me/v2/bot/message/push',
            auth: { bearer: process.env.LINE_BOT_CHANNEL_ACCESS_TOKEN },
            json: true,
            body: {
                to: user.userId,
                messages: [
                    {
                        type: 'template',
                        altText: 'This is a buttons template',
                        template: {
                            type: 'buttons',
                            title: '決済方法選択',
                            text: '決済方法を選択してください。Friend Payの場合、ボタンを押して友達を選択してください。',
                            actions: [
                                {
                                    type: 'postback',
                                    label: 'クレジットカード',
                                    data: querystring.stringify({
                                        action: 'choosePaymentMethod',
                                        paymentMethod: cinerinoapi.factory.paymentMethodType.CreditCard,
                                        transactionId: transaction.id
                                    })
                                },
                                {
                                    type: 'postback',
                                    label: 'コイン',
                                    data: querystring.stringify({
                                        action: 'choosePaymentMethod',
                                        paymentMethod: cinerinoapi.factory.paymentMethodType.Account,
                                        transactionId: transaction.id
                                    })
                                },
                                {
                                    type: 'uri',
                                    label: 'Friend Pay',
                                    uri: `line://msg/text/?${message}`
                                }
                            ]
                        }
                    }
                ]
            }
        }).promise();
    });
}
exports.createTmpReservation = createTmpReservation;
// tslint:disable-next-line:max-func-body-length
function choosePaymentMethod(user, paymentMethodType, transactionId, friendPayPrice) {
    return __awaiter(this, void 0, void 0, function* () {
        const personService = new cinerinoapi.service.Person({
            endpoint: process.env.CINERINO_ENDPOINT,
            auth: user.authClient
        });
        const placeOrderService = new cinerinoapi.service.transaction.PlaceOrder({
            endpoint: process.env.CINERINO_ENDPOINT,
            auth: user.authClient
        });
        let price = 0;
        const actionRepo = new cinerino.repository.Action(cinerino.mongoose.connection);
        const authorizeActions = yield actionRepo.findAuthorizeByTransactionId(transactionId);
        const seatReservations = authorizeActions
            .filter((a) => a.actionStatus === cinerinoapi.factory.actionStatusType.CompletedActionStatus)
            .filter((a) => a.object.typeOf === cinerinoapi.factory.action.authorize.offer.seatReservation.ObjectType.SeatReservation);
        price = seatReservations[0].result.price;
        // const requiredPoint = (<cinerinoapi.factory.action.authorize.offer.seatReservation.IResult>seatReservations[0].result).point;
        switch (paymentMethodType) {
            case cinerinoapi.factory.paymentMethodType.Account:
                yield LINE.pushMessage(user.userId, '残高を確認しています...');
                // 口座番号取得
                let accounts = yield personService.searchAccounts({ personId: 'me', accountType: cinerinoapi.factory.accountType.Coin })
                    .then((ownershiInfos) => ownershiInfos.map((o) => o.typeOfGood));
                accounts = accounts.filter((a) => a.status === cinerinoapi.factory.pecorino.accountStatusType.Opened);
                debug('accounts:', accounts);
                if (accounts.length === 0) {
                    throw new Error('口座未開設です');
                }
                const account = accounts[0];
                const accountAuthorization = yield placeOrderService.authorizeAccountPayment({
                    transactionId: transactionId,
                    accountType: cinerinoapi.factory.accountType.Coin,
                    amount: price,
                    fromAccountNumber: account.accountNumber
                });
                debug('残高確認済', accountAuthorization);
                yield LINE.pushMessage(user.userId, '残高の確認がとれました。');
                break;
            case cinerinoapi.factory.paymentMethodType.CreditCard:
                yield LINE.pushMessage(user.userId, 'クレジットカードを確認しています...');
                // 口座番号取得
                const creditCards = yield personService.searchCreditCards({ personId: 'me' });
                if (creditCards.length === 0) {
                    throw new Error('クレジットカード未登録です');
                }
                const creditCard = creditCards[0];
                const orderId = `${moment().format('YYYYMMDD')}${moment().unix().toString()}`;
                yield placeOrderService.authorizeCreditCardPayment({
                    transactionId: transactionId,
                    amount: price,
                    orderId: orderId,
                    method: '1',
                    creditCard: {
                        memberId: 'me',
                        cardSeq: Number(creditCard.cardSeq)
                        // cardPass?: string;
                    }
                });
                yield LINE.pushMessage(user.userId, `${creditCard.cardNo}で決済を受け付けます`);
                break;
            case 'FriendPay':
                price = friendPayPrice;
            default:
                throw new Error(`Unknown payment method ${paymentMethodType}`);
        }
        const loginTicket = user.authClient.verifyIdToken({});
        let contact = yield personService.getContacts({ personId: 'me' });
        contact = {
            givenName: loginTicket.getUsername(),
            familyName: loginTicket.getUsername(),
            email: contact.email,
            telephone: '+819012345678'
        };
        yield placeOrderService.setCustomerContact({
            transactionId: transactionId,
            contact: contact
        });
        debug('customer contact set.');
        yield LINE.pushMessage(user.userId, `以下の通り注文を受け付けます...
------------
購入者情報
------------
${contact.givenName} ${contact.familyName}
${contact.email}
${contact.telephone}

------------
決済方法
------------
${paymentMethodType}
${price} JPY
`);
        // 注文内容確認
        yield request.post({
            simple: false,
            url: 'https://api.line.me/v2/bot/message/push',
            auth: { bearer: process.env.LINE_BOT_CHANNEL_ACCESS_TOKEN },
            json: true,
            body: {
                to: user.userId,
                messages: [
                    {
                        type: 'template',
                        altText: 'This is a buttons template',
                        template: {
                            type: 'confirm',
                            text: '注文を確定しますか？',
                            actions: [
                                {
                                    type: 'postback',
                                    label: 'Yes',
                                    data: `action=confirmOrder&transactionId=${transactionId}`
                                },
                                {
                                    type: 'postback',
                                    label: 'No',
                                    data: `action=cancelOrder&transactionId=${transactionId}`
                                }
                            ]
                        }
                    }
                ]
            }
        }).promise();
    });
}
exports.choosePaymentMethod = choosePaymentMethod;
// tslint:disable-next-line:max-func-body-length
function confirmOrder(user, transactionId) {
    return __awaiter(this, void 0, void 0, function* () {
        yield LINE.pushMessage(user.userId, '注文を確定しています...');
        const placeOrderService = new cinerinoapi.service.transaction.PlaceOrder({
            endpoint: process.env.CINERINO_ENDPOINT,
            auth: user.authClient
        });
        const { order } = yield placeOrderService.confirm({
            transactionId: transactionId
        });
        const event = order.acceptedOffers[0].itemOffered.reservationFor;
        const reservedTickets = order.acceptedOffers.map((orderItem) => {
            const item = orderItem.itemOffered;
            // tslint:disable-next-line:max-line-length no-unnecessary-local-variable
            const str = `${item.reservedTicket.ticketedSeat.seatNumber} ${item.reservedTicket.ticketType.name.ja} ￥${item.reservedTicket.ticketType.charge}`;
            return str;
        }).join('\n');
        const orderDetails = `--------------------
注文内容
--------------------
確認番号: ${order.confirmationNumber}
--------------------
購入者情報
--------------------
${order.customer.name}
${order.customer.telephone}
${order.customer.email}
${(order.customer.memberOf !== undefined) ? `${order.customer.memberOf.membershipNumber}` : ''}
--------------------
座席予約
--------------------
${event.name.ja}
${moment(event.startDate).format('YYYY-MM-DD HH:mm')}-${moment(event.endDate).format('HH:mm')}
@${event.superEvent.location.name.ja} ${event.location.name.ja}
${reservedTickets}
--------------------
決済方法
--------------------
${order.paymentMethods.map((p) => p.paymentMethod).join(' ')}
${order.price}
--------------------
割引
--------------------
`;
        yield LINE.pushMessage(user.userId, orderDetails);
        yield request.post({
            simple: false,
            url: 'https://api.line.me/v2/bot/message/push',
            auth: { bearer: process.env.LINE_BOT_CHANNEL_ACCESS_TOKEN },
            json: true,
            body: {
                to: user.userId,
                messages: [
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
                                                                text: `${moment(event.startDate).format('YYYY-MM-DD HH:mm')}`,
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
                                                                text: `${event.superEvent.location.name.ja} ${event.location.name.ja}`,
                                                                wrap: true,
                                                                color: '#666666',
                                                                size: 'sm',
                                                                flex: 4
                                                            }
                                                        ]
                                                    }
                                                    // {
                                                    //     type: 'box',
                                                    //     layout: 'baseline',
                                                    //     spacing: 'sm',
                                                    //     contents: [
                                                    //         {
                                                    //             type: 'text',
                                                    //             text: 'Seats',
                                                    //             color: '#aaaaaa',
                                                    //             size: 'sm',
                                                    //             flex: 1
                                                    //         },
                                                    //         {
                                                    //             type: 'text',
                                                    //             text: 'C Row, 18 Seat',
                                                    //             wrap: true,
                                                    //             color: '#666666',
                                                    //             size: 'sm',
                                                    //             flex: 4
                                                    //         }
                                                    //     ]
                                                    // }
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
                                            ...[
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
                    // {
                    //     type: 'template',
                    //     altText: 'this is a carousel template',
                    //     template: {
                    //         type: 'carousel',
                    //         columns: order.acceptedOffers.map((offer) => {
                    //             const itemOffered = <IEventReservation>offer.itemOffered;
                    // tslint:disable-next-line:max-line-length
                    //             const qr = `https://chart.apis.google.com/chart?chs=300x300&cht=qr&chl=${itemOffered.reservedTicket.ticketToken}`;
                    //             return {
                    //                 thumbnailImageUrl: qr,
                    //                 // imageBackgroundColor: '#000000',
                    //                 title: itemOffered.reservationFor.name.ja,
                    // tslint:disable-next-line:max-line-length
                    //                 text: `${itemOffered.reservedTicket.ticketedSeat.seatNumber} ${itemOffered.reservedTicket.ticketType.name.ja} ￥${itemOffered.reservedTicket.ticketType.charge}`,
                    //                 actions: [
                    //                     {
                    //                         type: 'postback',
                    //                         label: '???',
                    //                         data: `action=selectTicket&ticketToken=${itemOffered.reservedTicket.ticketToken}`
                    //                     }
                    //                 ]
                    //             };
                    //         }),
                    //         imageAspectRatio: 'square'
                    //         // imageSize: 'cover'
                    //     }
                    // }
                ]
            }
        }).promise();
    });
}
exports.confirmOrder = confirmOrder;
/**
 * 友達決済を承認確定
 * @param user LINEユーザー
 * @param transactionId 取引ID
 */
function confirmFriendPay(user, token) {
    return __awaiter(this, void 0, void 0, function* () {
        const friendPayInfo = yield user.verifyFriendPayToken(token);
        yield LINE.pushMessage(user.userId, `${friendPayInfo.price}円の友達決済を受け付けます。`);
        yield LINE.pushMessage(user.userId, '残高を確認しています...');
        const personService = new cinerinoapi.service.Person({
            endpoint: process.env.CINERINO_ENDPOINT,
            auth: user.authClient
        });
        const placeOrderService = new cinerinoapi.service.transaction.PlaceOrder({
            endpoint: process.env.CINERINO_ENDPOINT,
            auth: user.authClient
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
            accountType: cinerinoapi.factory.accountType.Coin,
            fromAccountNumber: account.accountNumber
        });
        debug('残高確認済', pecorinoAuthorization);
        yield LINE.pushMessage(user.userId, '残高の確認がとれました。');
        yield LINE.pushMessage(user.userId, '友達決済を承認しました。');
        yield request.post({
            simple: false,
            url: 'https://api.line.me/v2/bot/message/push',
            auth: { bearer: process.env.LINE_BOT_CHANNEL_ACCESS_TOKEN },
            json: true,
            body: {
                to: friendPayInfo.userId,
                messages: [
                    {
                        type: 'template',
                        altText: 'This is a buttons template',
                        template: {
                            type: 'confirm',
                            text: '友達決済の承認が確認できました。取引を続行しますか?',
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
                    }
                ]
            }
        }).promise();
    });
}
exports.confirmFriendPay = confirmFriendPay;
/**
 * おこづかい承認確定
 * @param user LINEユーザー
 * @param token 金額転送情報トークン
 */
function confirmTransferMoney(user, token, price) {
    return __awaiter(this, void 0, void 0, function* () {
        const transferMoneyInfo = yield user.verifyTransferMoneyToken(token);
        yield LINE.pushMessage(user.userId, `${transferMoneyInfo.name}に${price}円の振込を実行します...`);
        const personService = new cinerinoapi.service.Person({
            endpoint: process.env.CINERINO_ENDPOINT,
            auth: user.authClient
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
                name: user.userId
            },
            recipient: {
                typeOf: 'Person',
                id: transferMoneyInfo.userId,
                name: transferMoneyInfo.name,
                url: ''
            },
            amount: price,
            notes: 'LINEチケットおこづかい',
            fromAccountNumber: account.accountNumber,
            toAccountNumber: transferMoneyInfo.accountNumber
        });
        debug('transaction started.', transaction.id);
        yield LINE.pushMessage(user.userId, '残高の確認がとれました。');
        // バックエンドで確定
        yield transferService.confirm({
            transactionId: transaction.id
        });
        debug('transaction confirmed.');
        yield LINE.pushMessage(user.userId, '転送が完了しました。');
        const contact = yield personService.getContacts({ personId: 'me' });
        // 振込先に通知
        yield LINE.pushMessage(transferMoneyInfo.userId, `${contact.familyName} ${contact.givenName}から${price}円おこづかいが振り込まれました。`);
    });
}
exports.confirmTransferMoney = confirmTransferMoney;
/**
 * クレジットから口座へ入金する
 */
function selectDepositAmount(user) {
    return __awaiter(this, void 0, void 0, function* () {
        const personService = new cinerinoapi.service.Person({
            endpoint: process.env.CINERINO_ENDPOINT,
            auth: user.authClient
        });
        let accounts = yield personService.searchAccounts({ personId: 'me', accountType: cinerinoapi.factory.accountType.Coin })
            .then((ownershiInfos) => ownershiInfos.map((o) => o.typeOfGood));
        accounts = accounts.filter((a) => a.status === cinerinoapi.factory.pecorino.accountStatusType.Opened);
        debug('accounts:', accounts);
        if (accounts.length === 0) {
            throw new Error('口座未開設です');
        }
        const account = accounts[0];
        const gmoShopId = 'tshop00026096';
        const creditCardCallback = `https://${user.host}/transactions/transactionId/inputCreditCard?userId=${user.userId}`;
        // tslint:disable-next-line:max-line-length
        const creditCardUrl = `https://${user.host}/transactions/inputCreditCard?cb=${encodeURIComponent(creditCardCallback)}&gmoShopId=${gmoShopId}`;
        yield request.post({
            simple: false,
            url: 'https://api.line.me/v2/bot/message/push',
            auth: { bearer: process.env.LINE_BOT_CHANNEL_ACCESS_TOKEN },
            json: true,
            body: {
                to: user.userId,
                messages: [
                    {
                        type: 'template',
                        altText: 'コイン口座入金',
                        template: {
                            type: 'buttons',
                            title: 'コイン口座へ入金する',
                            text: 'いくら入金しますか?',
                            actions: [
                                {
                                    type: 'uri',
                                    label: '100',
                                    uri: `${creditCardUrl}&amount=100&toAccountNumber=${account.accountNumber}`
                                },
                                {
                                    type: 'uri',
                                    label: '1000',
                                    uri: `${creditCardUrl}&amount=1000&toAccountNumber=${account.accountNumber}`
                                },
                                {
                                    type: 'uri',
                                    label: '10000',
                                    uri: `${creditCardUrl}&amount=10000&toAccountNumber=${account.accountNumber}`
                                }
                            ]
                        }
                    }
                ]
            }
        }).promise();
    });
}
exports.selectDepositAmount = selectDepositAmount;
/**
 * クレジットから口座へ入金する
 */
function depositFromCreditCard(params) {
    return __awaiter(this, void 0, void 0, function* () {
        yield LINE.pushMessage(params.user.userId, `${params.amount}円の入金処理を実行します...`);
        // const personService = new cinerinoapi.service.Person({
        //     endpoint: <string>process.env.CINERINO_ENDPOINT,
        //     auth: user.authClient
        // });
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
                name: params.user.userId,
                url: ''
            },
            recipient: {
                typeOf: 'Person',
                id: params.user.userId,
                name: params.user.userId,
                url: ''
            },
            amount: params.amount,
            notes: 'LINEチケット入金',
            accountType: cinerinoapi.factory.accountType.Coin,
            toAccountNumber: params.toAccountNumber
        });
        yield depositTransaction.confirm({
            transactionId: transaction.id
        });
        yield LINE.pushMessage(params.user.userId, '入金処理が完了しました。');
    });
}
exports.depositFromCreditCard = depositFromCreditCard;
function addCreditCard(user, token) {
    return __awaiter(this, void 0, void 0, function* () {
        const personService = new cinerinoapi.service.Person({
            endpoint: process.env.CINERINO_ENDPOINT,
            auth: user.authClient
        });
        const creditCard = yield personService.addCreditCard({ personId: 'me', creditCard: { token: token } });
        yield LINE.pushMessage(user.userId, `クレジットカード ${creditCard.cardNo} が追加されました`);
    });
}
exports.addCreditCard = addCreditCard;
/**
 * クレジットカード検索
 */
function searchCreditCards(user) {
    return __awaiter(this, void 0, void 0, function* () {
        yield LINE.pushMessage(user.userId, `クレジットカードを検索しています...`);
        const personService = new cinerinoapi.service.Person({
            endpoint: process.env.CINERINO_ENDPOINT,
            auth: user.authClient
        });
        const creditCards = yield personService.searchCreditCards({ personId: 'me' });
        yield LINE.pushMessage(user.userId, `${creditCards.length}件のクレジットカードがみつかりました。`);
        yield request.post({
            simple: false,
            url: 'https://api.line.me/v2/bot/message/push',
            auth: { bearer: process.env.LINE_BOT_CHANNEL_ACCESS_TOKEN },
            json: true,
            body: {
                to: user.userId,
                messages: [
                    {
                        type: 'template',
                        altText: 'this is a carousel template',
                        template: {
                            type: 'carousel',
                            columns: creditCards.map((creditCard) => {
                                return {
                                    // tslint:disable-next-line:max-line-length no-http-string
                                    // thumbnailImageUrl: thumbnailImageUrl,
                                    imageBackgroundColor: '#000000',
                                    title: creditCard.cardNo,
                                    text: `${creditCard.cardName} ${creditCard.holderName} ${creditCard.expire}`,
                                    actions: [
                                        {
                                            type: 'postback',
                                            label: '削除する',
                                            data: `action=deleteCreditCard&cardSeq=${creditCard.cardSeq}`
                                        }
                                    ]
                                };
                            })
                            // imageAspectRatio: 'rectangle',
                            // imageSize: 'cover'
                        }
                    }
                ]
            }
        }).promise();
    });
}
exports.searchCreditCards = searchCreditCards;
