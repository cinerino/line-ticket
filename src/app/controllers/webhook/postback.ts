/**
 * LINE webhook postbackコントローラー
 */
import * as cinerinoapi from '@cinerino/api-nodejs-client';
import * as cinerino from '@cinerino/domain';
import * as createDebug from 'debug';
import { google } from 'googleapis';
import * as moment from 'moment';
import * as querystring from 'querystring';
import * as request from 'request-promise-native';

import * as LINE from '../../../line';
import User from '../../user';

const debug = createDebug('cinerino-line-ticket:*');
const customsearch = google.customsearch('v1');
const pecorinoAuthClient = new cinerino.pecorinoapi.auth.ClientCredentials({
    domain: <string>process.env.PECORINO_AUTHORIZE_SERVER_DOMAIN,
    clientId: <string>process.env.PECORINO_CLIENT_ID,
    clientSecret: <string>process.env.PECORINO_CLIENT_SECRET,
    scopes: [],
    state: ''
});

/**
 * 日付でイベント検索
 * @param {string} userId
 * @param {string} date YYYY-MM-DD形式
 */
export async function searchEventsByDate(user: User, date: string) {
    await LINE.pushMessage(user.userId, `${date}のイベントを検索しています...`);

    const eventService = new cinerinoapi.service.Event({
        endpoint: <string>process.env.CINERINO_ENDPOINT,
        auth: user.authClient
    });
    let events = await eventService.searchScreeningEvents({
        startFrom: moment(`${date}T00:00:00+09:00`).toDate(),
        startThrough: moment(`${date}T00:00:00+09:00`).add(1, 'day').toDate()
        // superEventLocationIdentifiers: ['MovieTheater-118']
    });
    // tslint:disable-next-line:no-magic-numbers
    events = events.slice(0, 10);

    await LINE.pushMessage(user.userId, `${events.length}件のイベントがみつかりました。`);

    // googleで画像検索
    const CX = '006320166286449124373:nm_gjsvlgnm';
    const API_KEY = 'AIzaSyBP1n1HhsS4_KFADZMcBCFOqqSmIgOHAYI';
    const thumbnails: any[] = [];
    await Promise.all(events.map(async (event) => {
        return new Promise((resolve) => {
            customsearch.cse.list(
                {
                    cx: CX,
                    q: event.workPerformed.name,
                    auth: API_KEY,
                    num: 1,
                    rights: 'cc_publicdomain cc_sharealike',
                    // start: 0,
                    // imgSize: 'small',
                    searchType: 'image'
                },
                (err: any, res: any) => {
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
                }
            );
        });
    }));
    debug(thumbnails);

    await request.post({
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
                        type: 'carousel',
                        contents: [
                            // tslint:disable-next-line:max-func-body-length no-magic-numbers
                            ...events.slice(0, 10).map((event) => {
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
                                                    label: '座席確保',
                                                    data: `action=createTmpReservation&eventId=${event.id}`
                                                }
                                            }
                                        ]
                                    }
                                };
                            })
                        ]
                    }
                }
            ]
        }
    }).promise();
}

/**
 * 座席仮予約
 */
// tslint:disable-next-line:max-func-body-length
export async function createTmpReservation(user: User, eventId: string) {
    // イベント詳細取得
    const eventService = new cinerinoapi.service.Event({
        endpoint: <string>process.env.CINERINO_ENDPOINT,
        auth: user.authClient
    });
    const event = await eventService.findScreeningEventById({ eventId: eventId });
    await LINE.pushMessage(user.userId, `${event.name.ja}の座席を確保します...`);

    // 販売者情報取得
    const organizationService = new cinerinoapi.service.Organization({
        endpoint: <string>process.env.CINERINO_ENDPOINT,
        auth: user.authClient
    });
    const sellers = await organizationService.searchMovieTheaters({});
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
        endpoint: <string>process.env.CINERINO_ENDPOINT,
        auth: user.authClient
    });
    const transaction = await placeOrderService.start({
        // tslint:disable-next-line:no-magic-numbers
        expires: moment().add(15, 'minutes').toDate(),
        sellerId: seller.id
        // passportToken: passportToken
    });
    debug('transaction started.', transaction.id);

    // 座席選択

    // 無料鑑賞券取得
    const ticketTypes = await eventService.searchScreeningEventTicketTypes({ eventId: eventId });
    // 空席検索
    const offers = await eventService.searchScreeningEventOffers({ eventId: eventId });
    const seatOffers = offers[0].containsPlace;
    const availableSeatOffers = seatOffers.filter(
        (o) => o.offers !== undefined && o.offers[0].availability === cinerinoapi.factory.chevre.itemAvailability.InStock
    );
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
    const seatReservationAuthorization = await placeOrderService.authorizeSeatReservation({
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
    await LINE.pushMessage(user.userId, `座席 ${selectedSeatOffer.branchCode} を確保しました。`);

    //     const LINE_ID = process.env.LINE_ID;
    //     const token = await user.signFriendPayInfo({
    //         transactionId: transaction.id,
    //         userId: user.userId,
    //         price: (<cinerino.factory.action.authorize.offer.seatReservation.IResult>seatReservationAuthorization.result).price
    //     });
    //     const friendMessage = `FriendPayToken.${token}`;
    //     const message = encodeURIComponent(`僕の代わりに決済をお願いできますか？よければ、下のリンクを押してそのままメッセージを送信してください。
    // line://oaMessage/${LINE_ID}/?${friendMessage}`);

    await request.post({
        simple: false,
        url: 'https://api.line.me/v2/bot/message/push',
        auth: { bearer: process.env.LINE_BOT_CHANNEL_ACCESS_TOKEN },
        json: true,
        body: {
            to: user.userId,
            messages: [
                {
                    type: 'text', // ①
                    text: '決済方法を選択してください',
                    quickReply: { // ②
                        items: [
                            {
                                type: 'action', // ③
                                imageUrl: `https://${user.host}/img/labels/credit-card-64.png`,
                                action: {
                                    type: 'postback',
                                    label: 'クレジットカード',
                                    data: querystring.stringify({
                                        action: 'choosePaymentMethod',
                                        paymentMethod: cinerinoapi.factory.paymentMethodType.CreditCard,
                                        transactionId: transaction.id
                                    })
                                }
                            },
                            {
                                type: 'action', // ③
                                imageUrl: `https://${user.host}/img/labels/coin-64.png`,
                                action: {
                                    type: 'postback',
                                    label: 'コイン',
                                    data: querystring.stringify({
                                        action: 'choosePaymentMethod',
                                        paymentMethod: cinerinoapi.factory.paymentMethodType.Account,
                                        transactionId: transaction.id
                                    })
                                }
                            }
                            // {
                            //     type: 'action', // ③
                            //     imageUrl: `https://${user.host}/img/labels/friend-pay-64.png`,
                            //     action: {
                            //         type: 'uri',
                            //         label: 'Friend Pay',
                            //         uri: `line://msg/text/?${message}`
                            //     }
                            // },
                        ]
                    }
                }
            ]
        }
    }).promise();
}

export type PaymentMethodType =
    cinerinoapi.factory.paymentMethodType.Account | 'FriendPay' | cinerinoapi.factory.paymentMethodType.CreditCard;

// tslint:disable-next-line:max-func-body-length
export async function choosePaymentMethod(user: User, paymentMethodType: PaymentMethodType, transactionId: string, friendPayPrice: number) {
    const personService = new cinerinoapi.service.Person({
        endpoint: <string>process.env.CINERINO_ENDPOINT,
        auth: user.authClient
    });
    const placeOrderService = new cinerinoapi.service.transaction.PlaceOrder({
        endpoint: <string>process.env.CINERINO_ENDPOINT,
        auth: user.authClient
    });

    let price: number = 0;
    const actionRepo = new cinerino.repository.Action(cinerino.mongoose.connection);
    const transactionRepo = new cinerino.repository.Transaction(cinerino.mongoose.connection);
    const authorizeActions = await actionRepo.findAuthorizeByTransactionId(transactionId);
    const transaction = await transactionRepo.findById(cinerinoapi.factory.transactionType.PlaceOrder, transactionId);
    const seatReservations = <cinerinoapi.factory.action.authorize.offer.seatReservation.IAction[]>authorizeActions
        .filter((a) => a.actionStatus === cinerinoapi.factory.actionStatusType.CompletedActionStatus)
        .filter((a) => a.object.typeOf === cinerinoapi.factory.action.authorize.offer.seatReservation.ObjectType.SeatReservation);
    const authorizeSeatReservationResult = <cinerinoapi.factory.action.authorize.offer.seatReservation.IResult>seatReservations[0].result;
    price = authorizeSeatReservationResult.price;
    const tmpReservations = authorizeSeatReservationResult.responseBody.object.reservations;
    // const requiredPoint = (<cinerinoapi.factory.action.authorize.offer.seatReservation.IResult>seatReservations[0].result).point;

    switch (paymentMethodType) {
        case cinerinoapi.factory.paymentMethodType.Account:
            await LINE.pushMessage(user.userId, '残高を確認しています...');
            // 口座番号取得
            let accounts = await personService.searchAccounts({ personId: 'me', accountType: cinerinoapi.factory.accountType.Coin })
                .then((ownershiInfos) => ownershiInfos.map((o) => o.typeOfGood));
            accounts = accounts.filter((a) => a.status === cinerinoapi.factory.pecorino.accountStatusType.Opened);
            debug('accounts:', accounts);
            if (accounts.length === 0) {
                throw new Error('口座未開設です');
            }
            const account = accounts[0];

            const accountAuthorization = await placeOrderService.authorizeAccountPayment({
                transactionId: transactionId,
                accountType: cinerinoapi.factory.accountType.Coin,
                amount: price,
                fromAccountNumber: account.accountNumber
            });
            debug('残高確認済', accountAuthorization);
            await LINE.pushMessage(user.userId, '残高の確認がとれました。');
            break;

        case cinerinoapi.factory.paymentMethodType.CreditCard:
            await LINE.pushMessage(user.userId, 'クレジットカードを確認しています...');

            // 口座番号取得
            const creditCards = await personService.searchCreditCards({ personId: 'me' });
            if (creditCards.length === 0) {
                throw new Error('クレジットカード未登録です');
            }
            const creditCard = creditCards[0];
            const orderId = `${moment().format('YYYYMMDD')}${moment().unix().toString()}`;
            await placeOrderService.authorizeCreditCardPayment({
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
            await LINE.pushMessage(user.userId, `${creditCard.cardNo}で決済を受け付けます`);
            break;

        case 'FriendPay':
            price = friendPayPrice;
        default:
            throw new Error(`Unknown payment method ${paymentMethodType}`);
    }

    const loginTicket = user.authClient.verifyIdToken({});
    let contact = await personService.getContacts({ personId: 'me' });
    contact = {
        givenName: <string>loginTicket.getUsername(),
        familyName: <string>loginTicket.getUsername(),
        email: contact.email,
        telephone: '+819012345678'
    };
    await placeOrderService.setCustomerContact({
        transactionId: transactionId,
        contact: contact
    });
    debug('customer contact set.');
    // 注文内容確認
    await request.post({
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
                                                        text: paymentMethodType,
                                                        size: 'sm',
                                                        color: '#111111',
                                                        align: 'end'
                                                    }
                                                ]
                                            }
                                        ]
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
                                        data: `action=confirmOrder&transactionId=${transactionId}`
                                    }
                                },
                                {
                                    type: 'button',
                                    action: {
                                        type: 'postback',
                                        label: 'キャンセル',
                                        data: `action=cancelOrder&transactionId=${transactionId}`
                                    }
                                }
                            ]
                        }
                    }
                }
            ]
        }
    }).promise();
}

export type IEventReservation =
    cinerinoapi.factory.chevre.reservation.event.IReservation<cinerinoapi.factory.chevre.event.screeningEvent.IEvent>;
// tslint:disable-next-line:max-func-body-length
export async function confirmOrder(user: User, transactionId: string) {
    await LINE.pushMessage(user.userId, '注文を確定しています...');

    const placeOrderService = new cinerinoapi.service.transaction.PlaceOrder({
        endpoint: <string>process.env.CINERINO_ENDPOINT,
        auth: user.authClient
    });
    const { order } = await placeOrderService.confirm({
        transactionId: transactionId
    });
    const event = (<IEventReservation>order.acceptedOffers[0].itemOffered).reservationFor;
    await request.post({
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
                                            const item = <IEventReservation>orderItem.itemOffered;
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
}

/**
 * 友達決済を承認確定
 * @param user LINEユーザー
 * @param transactionId 取引ID
 */
export async function confirmFriendPay(user: User, token: string) {
    const friendPayInfo = await user.verifyFriendPayToken(token);

    await LINE.pushMessage(user.userId, `${friendPayInfo.price}円の友達決済を受け付けます。`);
    await LINE.pushMessage(user.userId, '残高を確認しています...');

    const personService = new cinerinoapi.service.Person({
        endpoint: <string>process.env.CINERINO_ENDPOINT,
        auth: user.authClient
    });
    const placeOrderService = new cinerinoapi.service.transaction.PlaceOrder({
        endpoint: <string>process.env.CINERINO_ENDPOINT,
        auth: user.authClient
    });

    const actionRepo = new cinerino.repository.Action(cinerino.mongoose.connection);
    const authorizeActions = await actionRepo.findAuthorizeByTransactionId(friendPayInfo.transactionId);
    const seatReservations = <cinerinoapi.factory.action.authorize.offer.seatReservation.IAction[]>authorizeActions
        .filter((a) => a.actionStatus === cinerinoapi.factory.actionStatusType.CompletedActionStatus)
        .filter((a) => a.object.typeOf === cinerinoapi.factory.action.authorize.offer.seatReservation.ObjectType.SeatReservation);
    const requiredPoint = (<cinerinoapi.factory.action.authorize.offer.seatReservation.IResult>seatReservations[0].result).point;

    // 口座番号取得
    let accounts = await personService.searchAccounts({ personId: 'me', accountType: cinerinoapi.factory.accountType.Coin })
        .then((ownershipInfos) => ownershipInfos.map((o) => o.typeOfGood));
    accounts = accounts.filter((a) => a.status === cinerinoapi.factory.pecorino.accountStatusType.Opened);
    debug('accounts:', accounts);
    if (accounts.length === 0) {
        throw new Error('口座未開設です');
    }
    const account = accounts[0];
    const pecorinoAuthorization = await placeOrderService.authorizeAccountPayment({
        transactionId: friendPayInfo.transactionId,
        amount: requiredPoint,
        accountType: cinerinoapi.factory.accountType.Coin,
        fromAccountNumber: account.accountNumber
    });
    debug('残高確認済', pecorinoAuthorization);
    await LINE.pushMessage(user.userId, '残高の確認がとれました。');
    await LINE.pushMessage(user.userId, '友達決済を承認しました。');

    await request.post({
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
}

/**
 * おこづかい承認確定
 * @param user LINEユーザー
 * @param token 金額転送情報トークン
 */
export async function confirmTransferMoney(user: User, token: string, price: number) {
    const transferMoneyInfo = await user.verifyTransferMoneyToken(token);
    await LINE.pushMessage(user.userId, `${transferMoneyInfo.name}に${price}円の振込を実行します...`);
    const personService = new cinerinoapi.service.Person({
        endpoint: <string>process.env.CINERINO_ENDPOINT,
        auth: user.authClient
    });
    let accounts = await personService.searchAccounts({ personId: 'me', accountType: cinerinoapi.factory.accountType.Coin })
        .then((ownershipInfos) => ownershipInfos.map((o) => o.typeOfGood));
    accounts = accounts.filter((a) => a.status === cinerinoapi.factory.pecorino.accountStatusType.Opened);
    debug('accounts:', accounts);
    if (accounts.length === 0) {
        throw new Error('口座未開設です');
    }
    const account = accounts[0];
    const transferService = new cinerino.pecorinoapi.service.transaction.Transfer({
        endpoint: <string>process.env.PECORINO_ENDPOINT,
        auth: pecorinoAuthClient
    });
    const transaction = await transferService.start({
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
    await LINE.pushMessage(user.userId, '残高の確認がとれました。');

    // バックエンドで確定
    await transferService.confirm({
        transactionId: transaction.id
    });
    debug('transaction confirmed.');
    await LINE.pushMessage(user.userId, '転送が完了しました。');

    const contact = await personService.getContacts({ personId: 'me' });

    // 振込先に通知
    await LINE.pushMessage(transferMoneyInfo.userId, `${contact.familyName} ${contact.givenName}から${price}円おこづかいが振り込まれました。`);
}

/**
 * クレジットから口座へ入金する
 */
export async function selectDepositAmount(user: User) {
    const personService = new cinerinoapi.service.Person({
        endpoint: <string>process.env.CINERINO_ENDPOINT,
        auth: user.authClient
    });
    let accounts = await personService.searchAccounts({ personId: 'me', accountType: cinerinoapi.factory.accountType.Coin })
        .then((ownershiInfos) => ownershiInfos.map((o) => o.typeOfGood));
    accounts = accounts.filter((a) => a.status === cinerinoapi.factory.pecorino.accountStatusType.Opened);
    debug('accounts:', accounts);
    if (accounts.length === 0) {
        throw new Error('口座未開設です');
    }
    const account = accounts[0];

    await request.post({
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
                                type: 'postback',
                                label: '100',
                                // tslint:disable-next-line:max-line-length
                                data: `action=depositCoinByCreditCard&amount=100&toAccountNumber=${account.accountNumber}`
                            },
                            {
                                type: 'postback',
                                label: '1000',
                                // tslint:disable-next-line:max-line-length
                                data: `action=depositCoinByCreditCard&amount=1000&toAccountNumber=${account.accountNumber}`
                            },
                            {
                                type: 'postback',
                                label: '10000',
                                // tslint:disable-next-line:max-line-length
                                data: `action=depositCoinByCreditCard&amount=10000&toAccountNumber=${account.accountNumber}`
                            }
                        ]
                    }
                }
            ]
        }
    }).promise();
}

/**
 * クレジットから口座へ入金する
 */
export async function depositCoinByCreditCard(params: {
    user: User;
    amount: number;
    toAccountNumber: string;
}) {
    await LINE.pushMessage(params.user.userId, `${params.amount}円の入金処理を実行します...`);
    const personService = new cinerinoapi.service.Person({
        endpoint: <string>process.env.CINERINO_ENDPOINT,
        auth: params.user.authClient
    });
    const creditCards = await personService.searchCreditCards({ personId: 'me' });
    if (creditCards.length === 0) {
        throw new Error('クレジットカード未登録です');
    }

    // 入金取引開始
    const depositTransaction = new cinerino.pecorinoapi.service.transaction.Deposit({
        endpoint: <string>process.env.PECORINO_ENDPOINT,
        auth: pecorinoAuthClient
    });
    const transaction = await depositTransaction.start({
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
    await depositTransaction.confirm({
        transactionId: transaction.id
    });
    await LINE.pushMessage(params.user.userId, '入金処理が完了しました。');
}
/**
 * クレジットカード検索
 */
export async function searchCreditCards(user: User) {
    await LINE.pushMessage(user.userId, `クレジットカードを検索しています...`);

    const personService = new cinerinoapi.service.Person({
        endpoint: <string>process.env.CINERINO_ENDPOINT,
        auth: user.authClient
    });
    const creditCards = await personService.searchCreditCards({ personId: 'me' });
    await LINE.pushMessage(user.userId, `${creditCards.length}件のクレジットカードがみつかりました。`);

    await request.post({
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
                                                type: 'text',
                                                text: (creditCard.cardName.length > 0) ? creditCard.cardName : 'Unknown Card Name',
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
                                                    label: 'トークン発行',
                                                    data: `action=publishCreditCardToken&cardSeq=${creditCard.cardSeq}`
                                                }
                                            }
                                        ]
                                    }
                                };
                            })
                        ]
                    }
                }
            ]
        }
    }).promise();
}
export async function addCreditCard(user: User, token: string) {
    const personService = new cinerinoapi.service.Person({
        endpoint: <string>process.env.CINERINO_ENDPOINT,
        auth: user.authClient
    });
    const creditCard = await personService.addCreditCard({ personId: 'me', creditCard: { token: token } });
    await LINE.pushMessage(user.userId, `クレジットカード ${creditCard.cardNo} が追加されました`);
}
export async function deleteCreditCard(user: User, cardSeq: string) {
    const personService = new cinerinoapi.service.Person({
        endpoint: <string>process.env.CINERINO_ENDPOINT,
        auth: user.authClient
    });
    await personService.deleteCreditCard({ personId: 'me', cardSeq: cardSeq });
    await LINE.pushMessage(user.userId, `クレジットカードが削除されました`);
}
export async function searchCoinAccounts(user: User) {
    const personService = new cinerinoapi.service.Person({
        endpoint: <string>process.env.CINERINO_ENDPOINT,
        auth: user.authClient
    });
    let accounts = await personService.searchAccounts({ personId: 'me', accountType: cinerinoapi.factory.accountType.Coin })
        .then((ownershiInfos) => ownershiInfos.map((o) => o.typeOfGood));
    accounts = accounts.filter((a) => a.status === cinerinoapi.factory.pecorino.accountStatusType.Opened);
    debug('accounts:', accounts);
    if (accounts.length === 0) {
        throw new Error('口座未開設です');
    }
    await request.post({
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
                        type: 'carousel',
                        contents: [
                            // tslint:disable-next-line:max-func-body-length no-magic-numbers
                            ...accounts.map((account) => {
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
                                                                text: account.balance,
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
                                                                text: account.availableBalance,
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
                                                    type: 'message',
                                                    label: '取引履歴確認',
                                                    text: '口座取引履歴'
                                                }
                                            },
                                            {
                                                type: 'button',
                                                action: {
                                                    type: 'message',
                                                    label: 'おこづかいをもらう',
                                                    text: 'おこづかい'
                                                }
                                            },
                                            {
                                                type: 'button',
                                                action: {
                                                    type: 'postback',
                                                    label: 'クレジットカードで入金',
                                                    data: 'action=selectDepositAmount'
                                                }
                                            }
                                        ]
                                    }
                                };
                            })
                        ]
                    }
                }
            ]
        }
    }).promise();
}

/**
 * ユーザーのチケット(座席予約)を検索する
 */
// tslint:disable-next-line:max-func-body-length
export async function searchScreeningEventReservations(user: User) {
    await LINE.pushMessage(user.userId, '座席予約を検索しています...');

    const personService = new cinerinoapi.service.Person({
        endpoint: <string>process.env.CINERINO_ENDPOINT,
        auth: user.authClient
    });
    const ownershipInfos = await personService.searchScreeningEventReservations({
        // goodType: cinerinoapi.factory.reservationType.EventReservation,
        personId: 'me'
    });
    debug(ownershipInfos.length, 'ownershipInfos found.');

    if (ownershipInfos.length === 0) {
        await LINE.pushMessage(user.userId, '座席予約が見つかりませんでした。');
    } else {

        // googleで画像検索
        const events = ownershipInfos.map((o) => o.typeOfGood.reservationFor);
        const CX = '006320166286449124373:nm_gjsvlgnm';
        const API_KEY = 'AIzaSyBP1n1HhsS4_KFADZMcBCFOqqSmIgOHAYI';
        const thumbnails: any[] = [];
        await Promise.all(events.map(async (event) => {
            return new Promise((resolve) => {
                customsearch.cse.list(
                    {
                        cx: CX,
                        q: event.workPerformed.name,
                        auth: API_KEY,
                        num: 1,
                        rights: 'cc_publicdomain cc_sharealike',
                        // start: 0,
                        // imgSize: 'small',
                        searchType: 'image'
                    },
                    (err: any, res: any) => {
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
                    }
                );
            });
        }));
        debug(thumbnails);

        await request.post({
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
                            type: 'carousel',
                            contents: [
                                // tslint:disable-next-line:max-func-body-length no-magic-numbers
                                ...ownershipInfos.slice(0, 5).map((ownershipInfo) => {
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
                                                        type: 'uri',
                                                        label: 'チケット発行',
                                                        uri: 'https://linecorp.com'
                                                    }
                                                }
                                            ]
                                        }
                                    };
                                })
                            ]
                        }
                    }
                ]
            }
        }).promise();
    }
}
