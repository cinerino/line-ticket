/**
 * LINE webhook postbackコントローラー
 */
import * as cinerinoapi from '@cinerino/api-nodejs-client';
import { FlexBox, FlexBubble, FlexComponent, FlexMessage, QuickReplyItem, TextMessage } from '@line/bot-sdk';
import * as pecorino from '@pecorino/api-nodejs-client';
import * as createDebug from 'debug';
import * as moment from 'moment';
import * as querystring from 'qs';

import LINE from '../../../lineClient';
import User from '../../user';

const debug = createDebug('cinerino-line-ticket:controllers');
const pecorinoAuthClient = new pecorino.auth.ClientCredentials({
    domain: <string>process.env.PECORINO_AUTHORIZE_SERVER_DOMAIN,
    clientId: <string>process.env.PECORINO_CLIENT_ID,
    clientSecret: <string>process.env.PECORINO_CLIENT_SECRET,
    scopes: [],
    state: ''
});

/**
 * 日付でイベント検索
 * @params.date {string} date YYYY-MM-DD形式
 */
export async function searchEventsByDate(params: {
    replyToken: string;
    user: User;
    date: string;
}) {
    await LINE.replyMessage(params.replyToken, { type: 'text', text: `${params.date}のイベントを検索しています...` });
    const eventService = new cinerinoapi.service.Event({
        endpoint: <string>process.env.CINERINO_ENDPOINT,
        auth: params.user.authClient
    });
    const searchScreeningEventsResult = await eventService.searchScreeningEvents({
        inSessionFrom: moment.unix(Math.max(moment(`${params.date}T00:00:00+09:00`).unix(), moment().unix())).toDate(),
        inSessionThrough: moment(`${params.date}T00:00:00+09:00`).add(1, 'day').toDate()
        // superEventLocationIdentifiers: ['MovieTheater-118']
    });
    const screeningEvents = searchScreeningEventsResult.data;
    // 上映イベントシリーズをユニークに
    let superEvents = screeningEvents.map((e) => e.superEvent);
    superEvents = superEvents.filter((e, index, events) => events.map((e2) => e2.id).indexOf(e.id) === index);
    // tslint:disable-next-line:no-magic-numbers
    superEvents = superEvents.slice(0, 10);
    await LINE.pushMessage(params.user.userId, { type: 'text', text: `${superEvents.length}件の作品がみつかりました` });
    // const accessToken = await params.user.authClient.getAccessToken();
    const flex: FlexMessage = {
        type: 'flex',
        altText: 'This is a Flex Message',
        contents: {
            type: 'carousel',
            contents: [
                // tslint:disable-next-line:max-func-body-length no-magic-numbers
                ...superEvents.slice(0, 10).map<FlexBubble>((event) => {
                    const thumbnailImageUrl = (event.workPerformed.thumbnailUrl !== undefined)
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
                                                    text: (event.videoFormat !== undefined) ? event.videoFormat : '---',
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
    await LINE.pushMessage(params.user.userId, [flex]);
}

/**
 * 上映イベントスケジュールをたずねる
 */
// tslint:disable-next-line:max-func-body-length
export async function askScreeningEvent(params: {
    replyToken: string;
    user: User;
    screeningEventSeriesId: string;
    date: string;
}) {
    await LINE.replyMessage(params.replyToken, { type: 'text', text: `${params.date}のイベントを検索しています...` });
    const eventService = new cinerinoapi.service.Event({
        endpoint: <string>process.env.CINERINO_ENDPOINT,
        auth: params.user.authClient
    });
    const startFrom = moment.unix(Math.max(moment(`${params.date}T00:00:00+09:00`).unix(), moment().unix())).toDate();
    const startThrough = moment(`${params.date}T00:00:00+09:00`).add(1, 'day').toDate();
    const searchScreeningEventsResult = await eventService.searchScreeningEvents({
        inSessionFrom: startFrom,
        inSessionThrough: startThrough
        // superEventLocationIdentifiers: ['MovieTheater-118']
    });
    let screeningEvents = searchScreeningEventsResult.data;
    // 上映イベントシリーズをユニークに
    screeningEvents = screeningEvents
        .filter((e) => e.superEvent.id === params.screeningEventSeriesId)
        // tslint:disable-next-line:no-magic-numbers
        .slice(0, 10);
    await LINE.pushMessage(params.user.userId, { type: 'text', text: `${screeningEvents.length}件のスケジュールがみつかりました` });
    // tslint:disable-next-line:max-func-body-length
    const bubbles: FlexBubble[] = screeningEvents.map<FlexBubble>((event) => {
        const query = querystring.stringify({ eventId: event.id, userId: params.user.userId });
        const selectSeatsUri = `/transactions/placeOrder/selectSeatOffers?${query}`;
        const liffUri = `line://app/${process.env.LIFF_ID}?${querystring.stringify({ cb: selectSeatsUri })}`;
        let availability = 100;
        if (event.maximumAttendeeCapacity !== undefined && event.remainingAttendeeCapacity !== undefined) {
            // tslint:disable-next-line:no-magic-numbers
            availability = Math.floor((event.remainingAttendeeCapacity / event.maximumAttendeeCapacity) * 100);
        }
        // tslint:disable-next-line:no-magic-numbers
        const availabilityScore = Math.floor(availability / 20);

        return {
            type: 'bubble',
            body: <any>{
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
    await LINE.pushMessage(params.user.userId, [
        {
            type: 'flex',
            altText: 'This is a Flex Message',
            contents: {
                type: 'carousel',
                contents: bubbles
            }
        }
    ]);
}

/**
 * 決済コードをたずねる
 */
export async function askPaymentCode(params: {
    replyToken: string;
    user: User;
    transactionId: string;
}) {
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
    await LINE.replyMessage(params.replyToken, [
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
}
export type PaymentMethodType =
    cinerinoapi.factory.paymentMethodType.Account | cinerinoapi.factory.paymentMethodType.CreditCard;
export type ICreditCard = cinerinoapi.factory.paymentMethod.paymentCard.creditCard.IUncheckedCardTokenized
    | cinerinoapi.factory.paymentMethod.paymentCard.creditCard.IUnauthorizedCardOfMember;
/**
 * 決済方法選択
 */
// tslint:disable-next-line:max-func-body-length
export async function selectPaymentMethodType(params: {
    replyToken: string;
    user: User;
    paymentMethodType: PaymentMethodType;
    transactionId: string;
    code: string | undefined;
    creditCard: ICreditCard | undefined;
}) {
    const personService = new cinerinoapi.service.Person({
        endpoint: <string>process.env.CINERINO_ENDPOINT,
        auth: params.user.authClient
    });
    const personOwnershipInfoService = new cinerinoapi.service.person.OwnershipInfo({
        endpoint: <string>process.env.CINERINO_ENDPOINT,
        auth: params.user.authClient
    });
    const placeOrderService = new cinerinoapi.service.transaction.PlaceOrder({
        endpoint: <string>process.env.CINERINO_ENDPOINT,
        auth: params.user.authClient
    });
    const ownershipInfoService = new cinerinoapi.service.OwnershipInfo({
        endpoint: <string>process.env.CINERINO_ENDPOINT,
        auth: params.user.authClient
    });
    const seatReservationAuthorization = await params.user.findSeatReservationAuthorization();
    if (seatReservationAuthorization.result === undefined) {
        throw new Error('Invalid seat reservation authorization');
    }
    const price = seatReservationAuthorization.result.price;
    // const tmpReservations = seatReservationAuthorization.result.responseBody.object.reservations;

    switch (params.paymentMethodType) {
        case cinerinoapi.factory.paymentMethodType.Account:
            await LINE.replyMessage(params.replyToken, { type: 'text', text: '残高を確認しています...' });
            let account: cinerinoapi.factory.pecorino.account.IAccount<cinerinoapi.factory.accountType> | string;
            if (params.code === undefined) {
                // 口座番号取得
                const searchAccountsResult =
                    await personOwnershipInfoService.search<cinerinoapi.factory.ownershipInfo.AccountGoodType.Account>({
                        personId: 'me',
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
            } else {
                const { token } = await ownershipInfoService.getToken({ code: params.code });
                account = token;
            }
            const accountAuthorization = await placeOrderService.authorizeAccountPayment({
                transactionId: params.transactionId,
                amount: price,
                fromAccount: account
            });
            debug('残高確認済', accountAuthorization);
            await LINE.pushMessage(params.user.userId, { type: 'text', text: '残高の確認がとれました' });
            break;

        case cinerinoapi.factory.paymentMethodType.CreditCard:
            await LINE.replyMessage(params.replyToken, { type: 'text', text: 'クレジットカードを確認しています...' });
            if (params.creditCard === undefined) {
                throw new Error('クレジットカードが指定されていません');
            }
            const orderId = `${moment().format('YYYYMMDD')}${moment().unix().toString()}`;
            await placeOrderService.authorizeCreditCardPayment({
                transactionId: params.transactionId,
                amount: price,
                orderId: orderId,
                method: '1',
                creditCard: params.creditCard
            });
            await LINE.pushMessage(params.user.userId, { type: 'text', text: 'クレジットカードで決済を受け付けます' });
            break;

        default:
            throw new Error(`Unknown payment method ${params.paymentMethodType}`);
    }

    // 購入者情報確認
    let profile: cinerinoapi.factory.person.IProfile | undefined;
    if (await params.user.getCredentials() !== null) {
        await LINE.pushMessage(params.user.userId, { type: 'text', text: 'プロフィールを検索しています...' });
        // const loginTicket = params.user.authClient.verifyIdToken({});
        profile = await personService.getProfile({ personId: 'me' });
        const lineProfile = await LINE.getProfile(params.user.userId);
        profile = {
            givenName: lineProfile.displayName,
            familyName: 'LINE',
            email: profile.email,
            telephone: '+819012345678' // dummy
        };
    }
    const setCustomerContactQuery = querystring.stringify({ profile: profile });
    const setCustomerContactUri = `/transactions/placeOrder/${params.transactionId}/setCustomerContact?${setCustomerContactQuery}`;
    const liffUri = `line://app/${process.env.LIFF_ID}?${querystring.stringify({ cb: setCustomerContactUri })}`;
    const footerContets: FlexComponent[] = [
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
                data: querystring.stringify({
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
    await LINE.pushMessage(params.user.userId, [
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
}
/**
 * クレジットカード選択
 */
// tslint:disable-next-line:max-func-body-length
export async function selectCreditCard(params: {
    replyToken: string;
    user: User;
    transactionId: string;
}) {
    const organizationService = new cinerinoapi.service.Organization({
        endpoint: <string>process.env.CINERINO_ENDPOINT,
        auth: params.user.authClient
    });
    const searchOrganizationsResult = await organizationService.searchMovieTheaters({ limit: 1 });
    const movieTheater = searchOrganizationsResult.data[0];
    if (movieTheater.paymentAccepted === undefined) {
        throw new Error('許可された決済方法が見つかりません');
    }
    const creditCardPayment = <cinerinoapi.factory.organization.IPaymentAccepted<cinerinoapi.factory.paymentMethodType.CreditCard>>
        movieTheater.paymentAccepted.find((p) => p.paymentMethodType === cinerinoapi.factory.paymentMethodType.CreditCard);
    if (creditCardPayment === undefined) {
        throw new Error('クレジットカード決済が許可されていません');
    }
    const inputCreditCardUri =
        `/transactions/placeOrder/${params.transactionId}/inputCreditCard?gmoShopId=${creditCardPayment.gmoInfo.shopId}`;
    const liffUri = `line://app/${process.env.LIFF_ID}?${querystring.stringify({ cb: inputCreditCardUri })}`;
    const footerContets: FlexComponent[] = [
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
    if (await params.user.getCredentials() !== null) {
        const personOwnershipInfoService = new cinerinoapi.service.person.OwnershipInfo({
            endpoint: <string>process.env.CINERINO_ENDPOINT,
            auth: params.user.authClient
        });
        const creditCards = await personOwnershipInfoService.searchCreditCards({ personId: 'me' });
        await LINE.pushMessage(params.user.userId, { type: 'text', text: `${creditCards.length}件のクレジットカードが見つかりました` });
        if (creditCards.length > 0) {
            const creditCard = creditCards[0];
            footerContets.push({
                type: 'button',
                action: {
                    type: 'postback',
                    label: creditCard.cardNo,
                    data: querystring.stringify({
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
    await LINE.pushMessage(params.user.userId, [
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
}
/**
 * 購入者情報決定
 */
// tslint:disable-next-line:max-func-body-length
export async function setCustomerContact(params: {
    replyToken: string;
    user: User;
    transactionId: string;
    familyName: string;
    givenName: string;
    email: string;
    telephone: string;
}) {
    const organizationService = new cinerinoapi.service.Organization({
        endpoint: <string>process.env.CINERINO_ENDPOINT,
        auth: params.user.authClient
    });
    const placeOrderService = new cinerinoapi.service.transaction.PlaceOrder({
        endpoint: <string>process.env.CINERINO_ENDPOINT,
        auth: params.user.authClient
    });
    const transaction = await params.user.findTransaction();
    const seller = await organizationService.findMovieTheaterById({ id: transaction.seller.id });
    const seatReservationAuthorization = await params.user.findSeatReservationAuthorization();
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
    await placeOrderService.setCustomerContact({
        transactionId: params.transactionId,
        contact: contact
    });
    debug('customer contact set.');
    // 注文内容確認
    await LINE.pushMessage(params.user.userId, [
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
                                ...tmpReservations.map<FlexBox>((tmpReservation) => {
                                    const item = tmpReservation;
                                    const event = item.reservationFor;
                                    // tslint:disable-next-line:max-line-length no-unnecessary-local-variable
                                    const str = `${item.reservedTicket.ticketedSeat.seatNumber} ${item.reservedTicket.ticketType.name.ja}`;

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
                                                text: `${item.price} ${item.priceCurrency}`,
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
}
export type IEventReservation =
    cinerinoapi.factory.chevre.reservation.event.IReservation<cinerinoapi.factory.chevre.event.screeningEvent.IEvent>;
// tslint:disable-next-line:max-func-body-length
export async function confirmOrder(params: {
    replyToken: string;
    user: User;
    transactionId: string;
}) {
    await LINE.replyMessage(params.replyToken, { type: 'text', text: '注文を確定しています...' });
    const placeOrderService = new cinerinoapi.service.transaction.PlaceOrder({
        endpoint: <string>process.env.CINERINO_ENDPOINT,
        auth: params.user.authClient
    });
    const { order } = await placeOrderService.confirm({
        transactionId: params.transactionId,
        sendEmailMessage: true
    });
    const flex: FlexMessage = {
        type: 'flex',
        altText: 'This is a Flex Message',
        contents: order2bubble(order)
    };
    await LINE.pushMessage(params.user.userId, [flex]);
}
export async function cancelOrder(params: {
    replyToken: string;
    user: User;
    transactionId: string;
}) {
    await LINE.replyMessage(params.replyToken, { type: 'text', text: '注文取引をキャンセルしています...' });
    const placeOrderService = new cinerinoapi.service.transaction.PlaceOrder({
        endpoint: <string>process.env.CINERINO_ENDPOINT,
        auth: params.user.authClient
    });
    await placeOrderService.cancel({
        transactionId: params.transactionId
    });
    await LINE.pushMessage(params.user.userId, { type: 'text', text: '注文取引をキャンセルしました' });
}
/**
 * 友達決済を承認確定
 */
export async function confirmFriendPay(params: {
    replyToken: string;
    user: User;
    token: string;
}) {
    await LINE.replyMessage(params.replyToken, { type: 'text', text: 'implementing...' });
    // const friendPayInfo = await params.user.verifyFriendPayToken(params.token);
    // await LINE.replyMessage(params.replyToken, { type: 'text', text: `${friendPayInfo.price}円の友達決済を受け付けます` });
    // await LINE.pushMessage(params.user.userId, { type: 'text', text: '残高を確認しています...' });

    // const personService = new cinerinoapi.service.Person({
    //     endpoint: <string>process.env.CINERINO_ENDPOINT,
    //     auth: params.user.authClient
    // });
    // const placeOrderService = new cinerinoapi.service.transaction.PlaceOrder({
    //     endpoint: <string>process.env.CINERINO_ENDPOINT,
    //     auth: params.user.authClient
    // });

    // const actionRepo = new cinerino.repository.Action(cinerino.mongoose.connection);
    // const authorizeActions = await actionRepo.findAuthorizeByTransactionId(friendPayInfo.transactionId);
    // const seatReservations = <cinerinoapi.factory.action.authorize.offer.seatReservation.IAction[]>authorizeActions
    //     .filter((a) => a.actionStatus === cinerinoapi.factory.actionStatusType.CompletedActionStatus)
    //     .filter((a) => a.object.typeOf === cinerinoapi.factory.action.authorize.offer.seatReservation.ObjectType.SeatReservation);
    // const requiredPoint = (<cinerinoapi.factory.action.authorize.offer.seatReservation.IResult>seatReservations[0].result).point;

    // let accounts = await personService.searchAccounts({ personId: 'me', accountType: cinerinoapi.factory.accountType.Coin })
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
    //                 data: querystring.stringify({
    //                     action: 'continueTransactionAfterFriendPayConfirmation',
    //                     transactionId: friendPayInfo.transactionId,
    //                     price: friendPayInfo.price
    //                 })
    //             },
    //             {
    //                 type: 'postback',
    //                 label: 'No',
    //                 data: querystring.stringify({
    //                     action: 'cancelTransactionAfterFriendPayConfirmation',
    //                     transactionId: friendPayInfo.transactionId,
    //                     price: friendPayInfo.price
    //                 })
    //             }
    //         ]
    //     }
    // };
    // await LINE.pushMessage(params.user.userId, [template]);
}
/**
 * おこづかい承認確定
 */
export async function confirmTransferMoney(params: {
    replyToken: string;
    user: User;
    token: string;
    price: number;
}) {
    const transferMoneyInfo = await params.user.verifyTransferMoneyToken(params.token);
    await LINE.replyMessage(params.replyToken, { type: 'text', text: `${transferMoneyInfo.name}に${params.price}円の振込を実行します...` });
    const personService = new cinerinoapi.service.Person({
        endpoint: <string>process.env.CINERINO_ENDPOINT,
        auth: params.user.authClient
    });
    const personOwnershipInfoService = new cinerinoapi.service.person.OwnershipInfo({
        endpoint: <string>process.env.CINERINO_ENDPOINT,
        auth: params.user.authClient
    });
    const searchAccountsResult = await personOwnershipInfoService.search<cinerinoapi.factory.ownershipInfo.AccountGoodType.Account>({
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
    const transferService = new pecorino.service.transaction.Transfer({
        endpoint: <string>process.env.PECORINO_ENDPOINT,
        auth: pecorinoAuthClient
    });
    const transaction = await transferService.start({
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
    await LINE.pushMessage(params.user.userId, { type: 'text', text: '残高の確認がとれました' });

    // バックエンドで確定
    await transferService.confirm({
        transactionId: transaction.id
    });
    debug('transaction confirmed.');
    await LINE.pushMessage(params.user.userId, { type: 'text', text: '転送が完了しました' });

    const profile = await personService.getProfile({ personId: 'me' });

    // 振込先に通知
    await LINE.pushMessage(params.user.userId, {
        type: 'text',
        text: `${profile.familyName} ${profile.givenName}から${params.price}円おこづかいが振り込まれました`
    });
}
/**
 * クレジットから口座へ入金する
 */
export async function selectDepositAmount(params: {
    replyToken: string;
    user: User;
    accountType: cinerinoapi.factory.accountType;
    accountNumber: string;
}) {
    const message: TextMessage = {
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
    await LINE.pushMessage(params.user.userId, [message]);
}
/**
 * クレジットから口座へ入金する
 */
export async function depositCoinByCreditCard(params: {
    replyToken: string;
    user: User;
    amount: number;
    accountType: cinerinoapi.factory.accountType;
    toAccountNumber: string;
}) {
    await LINE.replyMessage(params.replyToken, { type: 'text', text: `${params.amount}円の入金処理を実行します...` });
    const personOwnershipInfoService = new cinerinoapi.service.person.OwnershipInfo({
        endpoint: <string>process.env.CINERINO_ENDPOINT,
        auth: params.user.authClient
    });
    const creditCards = await personOwnershipInfoService.searchCreditCards({ personId: 'me' });
    if (creditCards.length === 0) {
        throw new Error('クレジットカード未登録です');
    }
    const lineProfile = await LINE.getProfile(params.user.userId);
    // 入金取引開始
    const depositTransaction = new pecorino.service.transaction.Deposit({
        endpoint: <string>process.env.PECORINO_ENDPOINT,
        auth: pecorinoAuthClient
    });
    const transaction = await depositTransaction.start({
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
    await depositTransaction.confirm({
        transactionId: transaction.id
    });
    await LINE.pushMessage(params.user.userId, { type: 'text', text: '入金処理が完了しました' });
}
/**
 * クレジットカード検索
 */
export async function searchCreditCards(params: {
    replyToken: string;
    user: User;
}) {
    await LINE.replyMessage(params.replyToken, { type: 'text', text: 'クレジットカードを検索しています...' });
    const personOwnershipInfoService = new cinerinoapi.service.person.OwnershipInfo({
        endpoint: <string>process.env.CINERINO_ENDPOINT,
        auth: params.user.authClient
    });
    const creditCards = await personOwnershipInfoService.searchCreditCards({ personId: 'me' });
    await LINE.pushMessage(params.user.userId, { type: 'text', text: `${creditCards.length}件のクレジットカードがみつかりました` });
    if (creditCards.length > 0) {
        const flex: FlexMessage = {
            type: 'flex',
            altText: 'This is a Flex Message',
            contents: {
                type: 'carousel',
                contents: [
                    // tslint:disable-next-line:max-func-body-length no-magic-numbers
                    ...creditCards.map<FlexBubble>((creditCard) => {
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
        await LINE.pushMessage(params.user.userId, [flex]);
    }
}
export async function addCreditCard(params: {
    replyToken: string;
    user: User;
    token: string;
}) {
    const personOwnershipInfoService = new cinerinoapi.service.person.OwnershipInfo({
        endpoint: <string>process.env.CINERINO_ENDPOINT,
        auth: params.user.authClient
    });
    const creditCard = await personOwnershipInfoService.addCreditCard({ personId: 'me', creditCard: { token: params.token } });
    await LINE.replyMessage(params.replyToken, { type: 'text', text: `クレジットカード ${creditCard.cardNo} が追加されました` });
}
export async function deleteCreditCard(params: {
    replyToken: string;
    user: User;
    cardSeq: string;
}) {
    const personOwnershipInfoService = new cinerinoapi.service.person.OwnershipInfo({
        endpoint: <string>process.env.CINERINO_ENDPOINT,
        auth: params.user.authClient
    });
    await personOwnershipInfoService.deleteCreditCard({ personId: 'me', cardSeq: params.cardSeq });
    await LINE.replyMessage(params.replyToken, { type: 'text', text: 'クレジットカードが削除されました' });
}
/**
 * 口座開設
 */
export async function openAccount(params: {
    replyToken: string;
    user: User;
    name: string;
    accountType: cinerinoapi.factory.accountType;
}) {
    const personOwnershipInfoService = new cinerinoapi.service.person.OwnershipInfo({
        endpoint: <string>process.env.CINERINO_ENDPOINT,
        auth: params.user.authClient
    });
    const accountOwnershipInfo = await personOwnershipInfoService.openAccount({
        personId: 'me',
        name: params.name,
        accountType: params.accountType
    });
    await LINE.replyMessage(params.replyToken, {
        type: 'text',
        text: `${params.accountType}口座 ${accountOwnershipInfo.typeOfGood.accountNumber} が開設されました`
    });
}
/**
 * 口座解約
 */
export async function closeAccount(params: {
    replyToken: string;
    user: User;
    accountType: cinerinoapi.factory.accountType;
    accountNumber: string;
}) {
    const personOwnershipInfoService = new cinerinoapi.service.person.OwnershipInfo({
        endpoint: <string>process.env.CINERINO_ENDPOINT,
        auth: params.user.authClient
    });
    await personOwnershipInfoService.closeAccount({ personId: 'me', accountType: params.accountType, accountNumber: params.accountNumber });
    await LINE.replyMessage(params.replyToken, { type: 'text', text: `${params.accountType}口座 ${params.accountNumber} が解約されました` });
}
export async function searchCoinAccounts(params: {
    replyToken: string;
    user: User;
}) {
    const personOwnershipInfoService = new cinerinoapi.service.person.OwnershipInfo({
        endpoint: <string>process.env.CINERINO_ENDPOINT,
        auth: params.user.authClient
    });
    const searchAccountsResult = await personOwnershipInfoService.search<cinerinoapi.factory.ownershipInfo.AccountGoodType.Account>({
        personId: 'me',
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
    const flex: FlexMessage = {
        type: 'flex',
        altText: 'This is a Flex Message',
        contents: {
            type: 'carousel',
            contents: [
                // tslint:disable-next-line:max-func-body-length no-magic-numbers
                ...accountOwnershipInfos.map<FlexBubble>((ownershipInfo) => {
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
    await LINE.pushMessage(params.user.userId, [flex]);
}
/**
 * 口座取引履歴検索
 */
export async function searchAccountMoneyTransferActions(params: {
    replyToken: string;
    user: User;
    accountType: cinerinoapi.factory.accountType;
    accountNumber: string;
}) {
    const personOwnershipInfoService = new cinerinoapi.service.person.OwnershipInfo({
        endpoint: <string>process.env.CINERINO_ENDPOINT,
        auth: params.user.authClient
    });
    const searchAccountsResult = await personOwnershipInfoService.search<cinerinoapi.factory.ownershipInfo.AccountGoodType.Account>({
        personId: 'me',
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
    await LINE.replyMessage(params.replyToken, { type: 'text', text: '取引履歴を検索します...' });
    const searchActions = await personOwnershipInfoService.searchAccountMoneyTransferActions({
        personId: 'me',
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
        await LINE.pushMessage(params.user.userId, { type: 'text', text: 'まだ取引履歴はありません' });

        return;
    }
    await LINE.pushMessage(params.user.userId, {
        type: 'text',
        text: `${searchActions.totalCount}件の取引履歴が見つかりました`
    });
    await LINE.pushMessage(params.user.userId, { type: 'text', text: `直近の${transferActions.length}件は以下の通りです` });
    const flex: FlexMessage = {
        type: 'flex',
        altText: 'This is a Flex Message',
        contents: {
            type: 'carousel',
            contents: [
                // tslint:disable-next-line:max-func-body-length no-magic-numbers
                ...transferActions.map<FlexBubble>((a) => {
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
                                                            text: `${((<any>a.fromLocation).accountNumber !== undefined) ? (<any>a.fromLocation).accountNumber : '---'}`,
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
                                                            text: `${((<any>a.toLocation).accountNumber !== undefined) ? (<any>a.toLocation).accountNumber : '---'}`,
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
    await LINE.pushMessage(params.user.userId, [flex]);
}
/**
 * ユーザーのチケット(座席予約)を検索する
 */
// tslint:disable-next-line:max-func-body-length
export async function searchScreeningEventReservations(params: {
    replyToken: string;
    user: User;
}) {
    const now = new Date();
    await LINE.replyMessage(params.replyToken, { type: 'text', text: 'ここ一カ月の座席予約を検索しています...' });
    const personOwnershipInfoService = new cinerinoapi.service.person.OwnershipInfo({
        endpoint: <string>process.env.CINERINO_ENDPOINT,
        auth: params.user.authClient
    });
    const searchScreeningEventReservationsResult =
        await personOwnershipInfoService.search<cinerinoapi.factory.chevre.reservationType.EventReservation>({
            personId: 'me',
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
        await LINE.pushMessage(params.user.userId, { type: 'text', text: '座席予約が見つかりませんでした' });
    } else {
        await LINE.pushMessage(params.user.userId, {
            type: 'text',
            text: `${searchScreeningEventReservationsResult.totalCount}件の座席予約が見つかりました`
        });
        await LINE.pushMessage(params.user.userId, { type: 'text', text: `直近の${ownershipInfos.length}件は以下の通りです` });
        const flex: FlexMessage = {
            type: 'flex',
            altText: 'This is a Flex Message',
            contents: {
                type: 'carousel',
                contents: [
                    ...ownershipInfos
                        // tslint:disable-next-line:max-func-body-length
                        .map<FlexBubble>((ownershipInfo) => {
                            const itemOffered = ownershipInfo.typeOfGood;
                            const event = itemOffered.reservationFor;
                            const thumbnailImageUrl = (event.workPerformed.thumbnailUrl !== undefined)
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
                                                            text: itemOffered.reservedTicket.issuedBy.name,
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
                                                            text: itemOffered.reservedTicket.underName.name,
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
                                                            text: itemOffered.reservationStatus,
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
        await LINE.pushMessage(params.user.userId, [flex]);
    }
}
/**
 * 座席仮予約
 */
// tslint:disable-next-line:max-func-body-length
export async function selectSeatOffers(params: {
    replyToken: string;
    user: User;
    eventId: string;
    seatNumbers: string[];
}) {
    // イベント詳細取得
    const eventService = new cinerinoapi.service.Event({
        endpoint: <string>process.env.CINERINO_ENDPOINT,
        auth: params.user.authClient
    });
    const organizationService = new cinerinoapi.service.Organization({
        endpoint: <string>process.env.CINERINO_ENDPOINT,
        auth: params.user.authClient
    });
    const placeOrderService = new cinerinoapi.service.transaction.PlaceOrder({
        endpoint: <string>process.env.CINERINO_ENDPOINT,
        auth: params.user.authClient
    });

    const event = await eventService.findScreeningEventById({ id: params.eventId });
    await LINE.replyMessage(params.replyToken, { type: 'text', text: `${event.name.ja}の座席を確保します...` });

    // 販売者情報取得
    const searchMovieTheatersResult = await organizationService.searchMovieTheaters({});
    const seller = searchMovieTheatersResult.data.find((o) => o.location.branchCode === event.superEvent.location.branchCode);
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
    const transaction = await placeOrderService.start({
        // tslint:disable-next-line:no-magic-numbers
        expires: moment().add(5, 'minutes').toDate(),
        sellerId: seller.id
        // passportToken: passportToken
    });
    debug('transaction started.', transaction.id);
    await params.user.saveTransaction(transaction);

    // 券種をランダムに選択
    const ticketTypes = await eventService.searchScreeningEventTicketTypes({ eventId: params.eventId });
    // tslint:disable-next-line:insecure-random
    const selectedTicketType = ticketTypes[Math.floor(ticketTypes.length * Math.random())];

    debug('creating a seat reservation authorization...');
    const seatReservationAuthorization = await placeOrderService.authorizeSeatReservation({
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
                    seatSection: 'Default',
                    seatRow: '',
                    seatingType: ''
                }
            };
        }),
        notes: 'test from samples'
    });
    debug('seatReservationAuthorization:', seatReservationAuthorization);
    await params.user.saveSeatReservationAuthorization(seatReservationAuthorization);

    await LINE.pushMessage(params.user.userId, { type: 'text', text: `座席 ${params.seatNumbers.join(' ')} を確保しました` });

    const quickReplyItems: QuickReplyItem[] = [
        {
            type: 'action',
            imageUrl: `https://${params.user.host}/img/labels/credit-card-64.png`,
            action: {
                type: 'postback',
                label: 'クレジットカード',
                data: querystring.stringify({
                    action: 'selectCreditCard',
                    transactionId: transaction.id
                })
            }
        }
    ];
    if (await params.user.getCredentials() !== null) {
        quickReplyItems.push(
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
        );
    }
    const message: TextMessage = {
        type: 'text',
        text: '決済方法を選択してください',
        quickReply: {
            items: quickReplyItems
        }
    };
    await LINE.pushMessage(params.user.userId, [message]);
}
/**
 * 所有権コード発行
 */
// tslint:disable-next-line:max-func-body-length
export async function authorizeOwnershipInfo(params: {
    replyToken: string;
    user: User;
    goodType: cinerinoapi.factory.ownershipInfo.IGoodType;
    id: string;
}) {
    await LINE.replyMessage(params.replyToken, { type: 'text', text: 'コード発行中...' });
    const personOwnershipInfoService = new cinerinoapi.service.person.OwnershipInfo({
        endpoint: <string>process.env.CINERINO_ENDPOINT,
        auth: params.user.authClient
    });
    const eventService = new cinerinoapi.service.Event({
        endpoint: <string>process.env.CINERINO_ENDPOINT,
        auth: params.user.authClient
    });
    const { code } = await personOwnershipInfoService.authorize({
        personId: 'me',
        ownershipInfoId: params.id
    });
    await LINE.pushMessage(params.user.userId, { type: 'text', text: 'コードが発行されました' });
    let flex: FlexMessage;
    switch (params.goodType) {
        case cinerinoapi.factory.chevre.reservationType.EventReservation:
            const searchScreeningEventReservationsResult =
                await personOwnershipInfoService.search<cinerinoapi.factory.chevre.reservationType.EventReservation>({
                    personId: 'me',
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
            const event = await eventService.findScreeningEventById({ id: itemOffered.reservationFor.id });
            const thumbnailImageUrl = (event.workPerformed.thumbnailUrl !== undefined)
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
                                                        text: itemOffered.reservedTicket.issuedBy.name,
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
                                                        text: itemOffered.reservedTicket.underName.name,
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
                                                        text: itemOffered.reservationStatus,
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
            await LINE.pushMessage(params.user.userId, [flex]);
            break;

        case cinerinoapi.factory.ownershipInfo.AccountGoodType.Account:
            const searchAccountsResult =
                await personOwnershipInfoService.search<cinerinoapi.factory.ownershipInfo.AccountGoodType.Account>({
                    personId: 'me',
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
            await LINE.pushMessage(params.user.userId, [flex]);
            break;

        default:
            throw new Error(`Unknown goodType ${params.goodType}`);
    }
}
/**
 * 注文を検索する
 */
// tslint:disable-next-line:max-func-body-length
export async function searchOrders(params: {
    replyToken: string;
    user: User;
}) {
    const now = new Date();
    await LINE.replyMessage(params.replyToken, { type: 'text', text: `ここ一カ月の注文を検索しています...` });
    const personService = new cinerinoapi.service.Person({
        endpoint: <string>process.env.CINERINO_ENDPOINT,
        auth: params.user.authClient
    });
    const searchOrdersResult = await personService.searchOrders({
        personId: 'me',
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
        await LINE.pushMessage(params.user.userId, { type: 'text', text: '注文が見つかりませんでした' });
    } else {
        await LINE.pushMessage(params.user.userId, { type: 'text', text: `${searchOrdersResult.totalCount}件の注文が見つかりました` });
        await LINE.pushMessage(params.user.userId, { type: 'text', text: `直近の${orders.length}件は以下の通りです` });
        const contents: FlexBubble[] = orders.map<FlexBubble>(order2bubble);
        const flex: FlexMessage = {
            type: 'flex',
            altText: 'This is a Flex Message',
            contents: {
                type: 'carousel',
                contents: contents
            }
        };
        await LINE.pushMessage(params.user.userId, [flex]);
    }
}
/**
 * 注文照会
 */
export async function findOrderByConfirmationNumber(params: {
    replyToken: string;
    user: User;
    confirmationNumber: number;
    telephone: string;
}) {
    await LINE.replyMessage(params.replyToken, { type: 'text', text: `${params.confirmationNumber}で注文を検索しています...` });
    const orderService = new cinerinoapi.service.Order({
        endpoint: <string>process.env.CINERINO_ENDPOINT,
        auth: params.user.authClient
    });
    const order = await orderService.findByConfirmationNumber({
        confirmationNumber: params.confirmationNumber,
        customer: {
            telephone: params.telephone
        }
    });
    await LINE.pushMessage(params.user.userId, { type: 'text', text: '注文が見つかりました' });
    const contents: FlexBubble[] = [order].map<FlexBubble>(order2bubble);
    const flex: FlexMessage = {
        type: 'flex',
        altText: 'This is a Flex Message',
        contents: {
            type: 'carousel',
            contents: contents
        }
    };
    await LINE.pushMessage(params.user.userId, [flex]);

    // 発券メッセージ
    const message: TextMessage = {
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
                        data: querystring.stringify({
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
    await LINE.pushMessage(params.user.userId, [message]);
}
/**
 * 注文発券
 */
// tslint:disable-next-line:max-func-body-length
export async function authorizeOwnershipInfosByOrder(params: {
    replyToken: string;
    user: User;
    orderNumber: string;
    telephone: string;
}) {
    await LINE.replyMessage(params.replyToken, { type: 'text', text: `${params.orderNumber}に対して発券処理を実行します...` });
    const eventService = new cinerinoapi.service.Event({
        endpoint: <string>process.env.CINERINO_ENDPOINT,
        auth: params.user.authClient
    });
    const orderService = new cinerinoapi.service.Order({
        endpoint: <string>process.env.CINERINO_ENDPOINT,
        auth: params.user.authClient
    });
    const order = await orderService.authorizeOwnershipInfos({
        orderNumber: <any>params.orderNumber,
        customer: {
            telephone: params.telephone
        }
    });
    await LINE.pushMessage(params.user.userId, { type: 'text', text: 'コードが発行されました' });
    const reservations = order.acceptedOffers.map((o) => o.itemOffered);
    const event = await eventService.findScreeningEventById({ id: reservations[0].reservationFor.id });
    const thumbnailImageUrl = (event.workPerformed.thumbnailUrl !== undefined)
        ? event.workPerformed.thumbnailUrl
        // tslint:disable-next-line:max-line-length
        : 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRrhpsOJOcLBwc1SPD9sWlinildy4S05-I2Wf6z2wRXnSxbmtRz';
    // tslint:disable-next-line:max-func-body-length
    const bubbles: FlexBubble[] = reservations.map<FlexBubble>((r) => {
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
                                        text: r.reservedTicket.ticketedSeat.seatNumber,
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
                                        text: r.reservedTicket.issuedBy.name,
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
                                        text: r.reservedTicket.underName.name,
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
                                        text: r.reservationStatus,
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
                                        url: `https://chart.apis.google.com/chart?chs=300x300&cht=qr&chl=${r.reservedTicket.ticketToken}`,
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
    const flex: FlexMessage = {
        type: 'flex',
        altText: 'This is a Flex Message',
        contents: {
            type: 'carousel',
            contents: bubbles
        }
    };
    await LINE.pushMessage(params.user.userId, [flex]);
}
// tslint:disable-next-line:max-func-body-length
function order2bubble(order: cinerinoapi.factory.order.IOrder): FlexBubble {
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
                        ...order.acceptedOffers.map<FlexBox>((orderItem) => {
                            const item = orderItem.itemOffered;
                            const event = item.reservationFor;
                            // tslint:disable-next-line:max-line-length no-unnecessary-local-variable
                            const str = `${item.reservedTicket.ticketedSeat.seatNumber} ${item.reservedTicket.ticketType.name.ja}`;

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
                                        text: `${orderItem.price} ${orderItem.priceCurrency}`,
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
}
/**
 * 座席予約コード読み込み
 */
// tslint:disable-next-line:max-func-body-length
export async function findScreeningEventReservationById(params: {
    replyToken: string;
    user: User;
    code: string;
}) {
    await LINE.replyMessage(params.replyToken, { type: 'text', text: 'コードを読み込んでいます...' });
    const ownershipInfoService = new cinerinoapi.service.OwnershipInfo({
        endpoint: <string>process.env.CINERINO_ENDPOINT,
        auth: params.user.authClient
    });
    const reservationService = new cinerinoapi.service.Reservation({
        endpoint: <string>process.env.CINERINO_ENDPOINT,
        auth: params.user.authClient
    });
    const eventService = new cinerinoapi.service.Event({
        endpoint: <string>process.env.CINERINO_ENDPOINT,
        auth: params.user.authClient
    });
    try {
        const { token } = await ownershipInfoService.getToken({ code: params.code });
        const ownershipInfo = await reservationService.findScreeningEventReservationByToken({ token: token });
        await LINE.pushMessage(params.user.userId, { type: 'text', text: '予約が見つかりました' });
        const reservation = ownershipInfo.typeOfGood;
        const event = await eventService.findScreeningEventById({ id: reservation.reservationFor.id });
        const thumbnailImageUrl = (event.workPerformed.thumbnailUrl !== undefined)
            ? event.workPerformed.thumbnailUrl
            // tslint:disable-next-line:max-line-length
            : 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRrhpsOJOcLBwc1SPD9sWlinildy4S05-I2Wf6z2wRXnSxbmtRz';
        const flex: FlexMessage = {
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
                                                    text: reservation.reservedTicket.ticketedSeat.seatNumber,
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
                                                    text: reservation.reservedTicket.issuedBy.name,
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
                                                    text: reservation.reservedTicket.underName.name,
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
                                                    text: reservation.reservationStatus,
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
        await LINE.pushMessage(params.user.userId, [flex]);
    } catch (error) {
        await LINE.pushMessage(params.user.userId, { type: 'text', text: `Invalid code ${error.message}` });
    }
}
/**
 * プロフィール検索
 */
// tslint:disable-next-line:max-func-body-length
export async function getProfile(params: {
    replyToken: string;
    user: User;
}) {
    await LINE.replyMessage(params.replyToken, { type: 'text', text: `プロフィールを検索しています...` });
    const personService = new cinerinoapi.service.Person({
        endpoint: <string>process.env.CINERINO_ENDPOINT,
        auth: params.user.authClient
    });
    const profile = await personService.getProfile({ personId: 'me' });
    await LINE.pushMessage(params.user.userId, { type: 'text', text: 'プロフィールが見つかりました' });
    const contents: FlexBubble[] = [profile2bubble(profile)];
    const flex: FlexMessage = {
        type: 'flex',
        altText: 'This is a Flex Message',
        contents: {
            type: 'carousel',
            contents: contents
        }
    };
    await LINE.pushMessage(params.user.userId, [flex]);
}
/**
 * プロフィール更新
 */
export async function updateProfile(params: {
    replyToken: string;
    user: User;
    profile: cinerinoapi.factory.person.IProfile;
}) {
    const personService = new cinerinoapi.service.Person({
        endpoint: <string>process.env.CINERINO_ENDPOINT,
        auth: params.user.authClient
    });
    await LINE.replyMessage(params.replyToken, { type: 'text', text: `プロフィールを更新しています...` });
    await personService.updateProfile({ personId: 'me', ...params.profile });
    await LINE.replyMessage(params.replyToken, { type: 'text', text: `プロフィールを更新しました` });
    const contents: FlexBubble[] = [profile2bubble(params.profile)];
    const flex: FlexMessage = {
        type: 'flex',
        altText: 'This is a Flex Message',
        contents: {
            type: 'carousel',
            contents: contents
        }
    };
    await LINE.pushMessage(params.user.userId, [flex]);
}
// tslint:disable-next-line:max-func-body-length
function profile2bubble(params: cinerinoapi.factory.person.IProfile): FlexBubble {
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
                                    text: (params.familyName !== '') ? params.familyName : 'Unknown',
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
                                    text: (params.givenName !== '') ? params.givenName : 'Unknown',
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
                                    text: (params.email !== '') ? params.email : 'Unknown',
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
                                    text: (params.telephone !== '') ? params.telephone : 'Unknown',
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
