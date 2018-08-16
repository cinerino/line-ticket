/**
 * LINE webhook postbackコントローラー
 */
import * as cinerinoapi from '@cinerino/api-nodejs-client';
import * as cinerino from '@cinerino/domain';
import * as createDebug from 'debug';
import { google } from 'googleapis';
import * as moment from 'moment';
import * as request from 'request-promise-native';

import * as LINE from '../../../line';
import User from '../../user';

const debug = createDebug('cinerino-line-ticket:controller:webhook:postback');
// const MESSAGE_TRANSACTION_NOT_FOUND = '該当取引はありません';

const customsearch = google.customsearch('v1');

const PECORINO_ENDPOINT = process.env.PECORINO_ENDPOINT;
const PECORINO_CLIENT_ID = process.env.PECORINO_CLIENT_ID;
const PECORINO_CLIENT_SECRET = process.env.PECORINO_CLIENT_SECRET;
const PECORINO_AUTHORIZE_SERVER_DOMAIN = process.env.PECORINO_AUTHORIZE_SERVER_DOMAIN;

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
                                eventIdentifier: event.identifier,
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
                    type: 'template',
                    altText: 'this is a carousel template',
                    template: {
                        type: 'carousel',
                        columns: events.map((event) => {
                            const thumbnail = thumbnails.find((t) => t.eventIdentifier === event.identifier);
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
                                        data: `action=createTmpReservation&eventIdentifier=${event.identifier}`
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
    await LINE.pushMessage(user.userId, `${event.workPerformed.name}の座席を確保しています...`);

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
    // const freeTickets = tickets.filter((t) => t.usePoint > 0 && t.flgMember === cinerino.COA.services.master.FlgMember.Member);
    // if (freeTickets.length === 0) {
    //     throw new Error('無料鑑賞券が見つかりませんでした。');
    // }
    // const selectedTicket = freeTickets[0];
    // debug('無料鑑賞券が見つかりました。', selectedTicket.ticketCode);

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

    const LINE_ID = process.env.LINE_ID;
    const token = await user.signFriendPayInfo({
        transactionId: transaction.id,
        userId: user.userId,
        price: (<cinerino.factory.action.authorize.offer.seatReservation.IResult>seatReservationAuthorization.result).price
    });
    const friendMessage = `FriendPayToken.${token}`;
    const message = encodeURIComponent(`僕の代わりに決済をお願いできますか？よければ、下のリンクを押してそのままメッセージを送信してください。
line://oaMessage/${LINE_ID}/?${friendMessage}`);

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
                    altText: 'This is a buttons template',
                    template: {
                        type: 'buttons',
                        title: '決済方法選択',
                        text: '決済方法を選択してください。Friend Payの場合、ボタンを押して友達を選択してください。',
                        actions: [
                            {
                                type: 'postback',
                                label: 'Pecorino',
                                data: `action=choosePaymentMethod&paymentMethod=Pecorino&transactionId=${transaction.id}`
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
}

export type PaymentMethodType = 'Pecorino' | 'FriendPay';

// tslint:disable-next-line:max-func-body-length
export async function choosePaymentMethod(user: User, paymentMethod: PaymentMethodType, transactionId: string, friendPayPrice: number) {
    const personService = new cinerinoapi.service.Person({
        endpoint: <string>process.env.CINERINO_ENDPOINT,
        auth: user.authClient
    });
    const placeOrderService = new cinerinoapi.service.transaction.PlaceOrder({
        endpoint: <string>process.env.CINERINO_ENDPOINT,
        auth: user.authClient
    });

    let price: number = 0;

    if (paymentMethod === 'Pecorino') {
        debug('checking balance...', paymentMethod, transactionId);
        await LINE.pushMessage(user.userId, '残高を確認しています...');

        const actionRepo = new cinerino.repository.Action(cinerino.mongoose.connection);
        const authorizeActions = await actionRepo.findAuthorizeByTransactionId(transactionId);
        const seatReservations = <cinerinoapi.factory.action.authorize.offer.seatReservation.IAction[]>authorizeActions
            .filter((a) => a.actionStatus === cinerinoapi.factory.actionStatusType.CompletedActionStatus)
            .filter((a) => a.object.typeOf === cinerinoapi.factory.action.authorize.offer.seatReservation.ObjectType.SeatReservation);
        const requiredPoint = (<cinerinoapi.factory.action.authorize.offer.seatReservation.IResult>seatReservations[0].result).point;

        // 口座番号取得
        let accounts = await personService.searchAccounts({ personId: 'me', accountType: cinerinoapi.factory.accountType.Point })
            .then((ownershiInfos) => ownershiInfos.map((o) => o.typeOfGood));
        accounts = accounts.filter((a) => a.status === cinerinoapi.factory.pecorino.accountStatusType.Opened);
        debug('accounts:', accounts);
        if (accounts.length === 0) {
            throw new Error('口座未開設です。');
        }
        const account = accounts[0];

        const pecorinoAuthorization = await placeOrderService.authorizePointPayment({
            transactionId: transactionId,
            amount: requiredPoint,
            fromAccountNumber: account.accountNumber
        });
        debug('Pecorino残高確認済', pecorinoAuthorization);
        await LINE.pushMessage(user.userId, '残高の確認がとれました。');
    } else if (paymentMethod === 'FriendPay') {
        price = friendPayPrice;
    } else {
        throw new Error(`Unknown payment method ${paymentMethod}`);
    }

    const contact = await personService.getContacts({ personId: 'me' });
    await placeOrderService.setCustomerContact({
        transactionId: transactionId,
        contact: contact
    });
    debug('customer contact set.');
    await LINE.pushMessage(user.userId, `以下の通り注文を受け付けようとしています...
------------
購入者情報
------------
${contact.givenName} ${contact.familyName}
${contact.email}
${contact.telephone}

------------
決済方法
------------
${paymentMethod}
${price} JPY
`);

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
}

export type IEventReservation =
    cinerinoapi.factory.chevre.reservation.event.IReservation<cinerinoapi.factory.chevre.event.screeningEvent.IEvent>;
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
    const reservedTickets = order.acceptedOffers.map((orderItem) => {
        const item = <IEventReservation>orderItem.itemOffered;
        // tslint:disable-next-line:max-line-length no-unnecessary-local-variable
        const str = `${item.reservedTicket.ticketedSeat.seatNumber} ${item.reservedTicket.ticketType.name.ja} ￥${item.reservedTicket.ticketType.charge}`;

        return str;
    }).join('\n');

    const orderDetails = `--------------------
注文内容
--------------------
予約番号: ${order.confirmationNumber}
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
    await LINE.pushMessage(user.userId, orderDetails);

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
                    altText: 'this is a carousel template',
                    template: {
                        type: 'carousel',
                        columns: order.acceptedOffers.map((offer) => {
                            const itemOffered = <IEventReservation>offer.itemOffered;
                            // tslint:disable-next-line:max-line-length
                            const qr = `https://chart.apis.google.com/chart?chs=300x300&cht=qr&chl=${itemOffered.reservedTicket.ticketToken}`;

                            return {
                                thumbnailImageUrl: qr,
                                // imageBackgroundColor: '#000000',
                                title: itemOffered.reservationFor.name.ja,
                                // tslint:disable-next-line:max-line-length
                                text: `${itemOffered.reservedTicket.ticketedSeat.seatNumber} ${itemOffered.reservedTicket.ticketType.name.ja} ￥${itemOffered.reservedTicket.ticketType.charge}`,
                                actions: [
                                    {
                                        type: 'postback',
                                        label: '???',
                                        data: `action=selectTicket&ticketToken=${itemOffered.reservedTicket.ticketToken}`
                                    }
                                ]
                            };
                        }),
                        imageAspectRatio: 'square'
                        // imageSize: 'cover'
                    }
                }
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

    await LINE.pushMessage(user.userId, `${friendPayInfo.price}ポイントの友達決済を受け付けます。`);
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
    let accounts = await personService.searchAccounts({ personId: 'me', accountType: cinerinoapi.factory.accountType.Point })
        .then((ownershipInfos) => ownershipInfos.map((o) => o.typeOfGood));
    accounts = accounts.filter((a) => a.status === cinerinoapi.factory.pecorino.accountStatusType.Opened);
    debug('accounts:', accounts);
    if (accounts.length === 0) {
        throw new Error('口座未開設です。');
    }
    const account = accounts[0];
    const pecorinoAuthorization = await placeOrderService.authorizePointPayment({
        transactionId: friendPayInfo.transactionId,
        amount: requiredPoint,
        fromAccountNumber: account.accountNumber
    });
    debug('Pecorino残高確認済', pecorinoAuthorization);
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

    await LINE.pushMessage(user.userId, `${transferMoneyInfo.name}に${price}ポイントの振込を実行します...`);

    if (PECORINO_ENDPOINT === undefined) {
        throw new Error('PECORINO_ENDPOINT undefined.');
    }
    if (PECORINO_CLIENT_ID === undefined) {
        throw new Error('PECORINO_CLIENT_ID undefined.');
    }
    if (PECORINO_CLIENT_SECRET === undefined) {
        throw new Error('PECORINO_CLIENT_SECRET undefined.');
    }
    if (PECORINO_AUTHORIZE_SERVER_DOMAIN === undefined) {
        throw new Error('PECORINO_AUTHORIZE_SERVER_DOMAIN undefined.');
    }

    const personService = new cinerinoapi.service.Person({
        endpoint: <string>process.env.CINERINO_ENDPOINT,
        auth: user.authClient
    });
    let accounts = await personService.searchAccounts({ personId: 'me', accountType: cinerinoapi.factory.accountType.Point })
        .then((ownershipInfos) => ownershipInfos.map((o) => o.typeOfGood));
    accounts = accounts.filter((a) => a.status === cinerinoapi.factory.pecorino.accountStatusType.Opened);
    debug('accounts:', accounts);
    if (accounts.length === 0) {
        throw new Error('口座未開設です。');
    }
    const account = accounts[0];
    const auth = new cinerino.pecorinoapi.auth.ClientCredentials({
        domain: PECORINO_AUTHORIZE_SERVER_DOMAIN,
        clientId: PECORINO_CLIENT_ID,
        clientSecret: PECORINO_CLIENT_SECRET,
        scopes: [],
        state: ''
    });
    const transferService = new cinerino.pecorinoapi.service.transaction.Transfer({
        endpoint: PECORINO_ENDPOINT,
        auth: auth
    });
    const transaction = await transferService.start({
        accountType: cinerinoapi.factory.accountType.Point,
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
    await LINE.pushMessage(transferMoneyInfo.userId, `${contact.familyName} ${contact.givenName}から${price}ポイントおこづかいが振り込まれました。`);
}

/**
 * クレジットから口座へ入金する
 */
export async function selectDepositAmount(user: User) {
    const gmoShopId = 'tshop00026096';
    const creditCardCallback = `https://${user.host}/transactions/transactionId/inputCreditCard?userId=${user.userId}`;
    // tslint:disable-next-line:max-line-length
    const creditCardUrl = `https://${user.host}/transactions/inputCreditCard?cb=${encodeURIComponent(creditCardCallback)}&gmoShopId=${gmoShopId}`;

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
                    altText: '口座へ入金',
                    template: {
                        type: 'buttons',
                        title: 'Pecorino口座へ入金する',
                        text: 'いくら入金しますか?',
                        actions: [
                            {
                                type: 'uri',
                                label: '100円',
                                uri: `${creditCardUrl}&amount=100`
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
export async function depositFromCreditCard(user: User, amount: number, __: string) {
    await LINE.pushMessage(user.userId, `${amount}ポイントの入金処理を実行します...`);

    // const personService = new cinerinoapi.service.Person({
    //     endpoint: <string>process.env.CINERINO_ENDPOINT,
    //     auth: user.authClient
    // });

    // if (PECORINO_ENDPOINT === undefined) {
    //     throw new Error('PECORINO_ENDPOINT undefined.');
    // }
    // if (PECORINO_CLIENT_ID === undefined) {
    //     throw new Error('PECORINO_CLIENT_ID undefined.');
    // }
    // if (PECORINO_CLIENT_SECRET === undefined) {
    //     throw new Error('PECORINO_CLIENT_SECRET undefined.');
    // }
    // if (PECORINO_AUTHORIZE_SERVER_DOMAIN === undefined) {
    //     throw new Error('PECORINO_AUTHORIZE_SERVER_DOMAIN undefined.');
    // }

    // const auth = new pecorinoapi.auth.ClientCredentials({
    //     domain: PECORINO_AUTHORIZE_SERVER_DOMAIN,
    //     clientId: PECORINO_CLIENT_ID,
    //     clientSecret: PECORINO_CLIENT_SECRET,
    //     scopes: [],
    //     state: ''
    // });

    // const transferTransactionService4backend = new pecorinoapi.service.transaction.Deposit({
    //     endpoint: PECORINO_ENDPOINT,
    //     auth: auth
    // });

    // const transaction = await transferTransactionService4backend.start({
    //     // tslint:disable-next-line:no-magic-numbers
    //     expires: moment().add(10, 'minutes').toDate(),
    //     agent: {
    //         typeOf: 'Person',
    //         id: user.userId,
    //         name: 'self',
    //         url: ''
    //     },
    //     recipient: {
    //         typeOf: 'Person',
    //         id: user.userId,
    //         name: 'self',
    //         url: ''
    //     },
    //     price: amount,
    //     notes: 'LINEチケット入金',
    //     toAccountId: account.id
    // });
    // debug('transaction started.', transaction.id);

    // // バックエンドで確定
    // await transferTransactionService4backend.confirm({
    //     transactionId: transaction.id
    // });
    // debug('transaction confirmed.');
    await LINE.pushMessage(user.userId, '入金処理が完了しました。');
}
