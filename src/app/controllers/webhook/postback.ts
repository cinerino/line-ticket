/**
 * LINE webhook postbackコントローラー
 */
import * as cinerinoapi from '@cinerino/api-nodejs-client';
import { FlexBox, FlexBubble, FlexComponent, FlexMessage, QuickReplyItem, TextMessage } from '@line/bot-sdk';
import * as createDebug from 'debug';
import * as moment from 'moment';
import * as qs from 'qs';
import { format } from 'util';

import LINE from '../../../lineClient';
import User from '../../user';

const debug = createDebug('cinerino-line-ticket:controllers');

export type PaymentMethodType =
    cinerinoapi.factory.paymentMethodType.Account
    | cinerinoapi.factory.paymentMethodType.CreditCard
    | cinerinoapi.factory.paymentMethodType.Others;
export type ICreditCard = cinerinoapi.factory.paymentMethod.paymentCard.creditCard.IUncheckedCardTokenized
    | cinerinoapi.factory.paymentMethod.paymentCard.creditCard.IUnauthorizedCardOfMember;
export type IReservationPriceSpec =
    cinerinoapi.factory.chevre.reservation.IPriceSpecification<cinerinoapi.factory.chevre.reservationType.EventReservation>;

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
    const searchScreeningEventsResult = await eventService.search({
        typeOf: cinerinoapi.factory.chevre.eventType.ScreeningEvent,
        eventStatuses: [cinerinoapi.factory.chevre.eventStatusType.EventScheduled],
        inSessionFrom: moment.unix(Math.max(
            moment(`${params.date}T00:00:00+09:00`)
                .unix(),
            moment()
                .unix()
        ))
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
    await LINE.pushMessage(params.user.userId, { type: 'text', text: `${superEvents.length}件の作品がみつかりました` });
    // const accessToken = await params.user.authClient.getAccessToken();
    const flex: FlexMessage = {
        type: 'flex',
        altText: 'This is a Flex Message',
        contents: {
            type: 'carousel',
            contents: [
                // tslint:disable-next-line:no-magic-numbers
                ...superEvents.slice(0, 10)
                    // tslint:disable-next-line:max-func-body-length
                    .map<FlexBubble>((event) => {
                        const thumbnailImageUrl = (event.workPerformed.thumbnailUrl !== undefined
                            && event.workPerformed.thumbnailUrl !== null)
                            ? event.workPerformed.thumbnailUrl
                            // tslint:disable-next-line:max-line-length
                            : 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRrhpsOJOcLBwc1SPD9sWlinildy4S05-I2Wf6z2wRXnSxbmtRz';

                        const body: FlexBox = {
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
                                                        ? event.videoFormat.map((f) => f.typeOf)
                                                            .join(',')
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
                                                        ? moment.duration(event.duration)
                                                            .toIsoString()
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
    const startFrom = moment.unix(Math.max(
        moment(`${params.date}T00:00:00+09:00`)
            .unix(),
        moment()
            .unix()))
        .toDate();
    const startThrough = moment(`${params.date}T00:00:00+09:00`)
        .add(1, 'day')
        .toDate();
    const searchScreeningEventsResult = await eventService.search({
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
    await LINE.pushMessage(params.user.userId, { type: 'text', text: `${screeningEvents.length}件のスケジュールがみつかりました` });

    const MAX_AVAILABILITY_SCORE = 5;

    // tslint:disable-next-line:max-func-body-length
    const bubbles: FlexBubble[] = screeningEvents.map<FlexBubble>((event) => {
        const query = qs.stringify({ eventId: event.id, userId: params.user.userId });
        const selectSeatsUri = `/transactions/placeOrder/selectSeatOffers?${query}`;
        const liffUri = `line://app/${process.env.LIFF_ID}?${qs.stringify({ cb: selectSeatsUri })}`;
        let availability = 100;
        if (event.maximumAttendeeCapacity !== undefined && event.remainingAttendeeCapacity !== undefined) {
            // tslint:disable-next-line:no-magic-numbers
            availability = Math.floor((event.remainingAttendeeCapacity / event.maximumAttendeeCapacity) * 100);
        }
        // tslint:disable-next-line:no-magic-numbers
        const availabilityScore = Math.floor(availability / Math.floor(100 / MAX_AVAILABILITY_SCORE));

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
                            ...(availabilityScore > 0)
                                // tslint:disable-next-line:prefer-array-literal
                                ? [...Array(availabilityScore)].map(() => {
                                    return {
                                        type: 'icon',
                                        size: 'sm',
                                        url: `https://${params.user.host}/img/labels/theater-seat-blue-80.png`
                                    };
                                })
                                : [],
                            ...(availabilityScore < MAX_AVAILABILITY_SCORE)
                                // tslint:disable-next-line:prefer-array-literal
                                ? [...Array(MAX_AVAILABILITY_SCORE - availabilityScore)].map(() => {
                                    return {
                                        type: 'icon',
                                        size: 'sm',
                                        url: `https://${params.user.host}/img/labels/theater-seat-grey-80.png`
                                    };
                                })
                                : [],
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
                                        text: moment(event.startDate)
                                            .format('YYYY-MM-DD'),
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
                                        text: `${moment(event.startDate)
                                            .format('HH:mm')} - ${moment(event.endDate)
                                                .format('HH:mm')}`,
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
                            label: '座席選択',
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
    const liffUri = `line://app/${process.env.LIFF_ID}?${qs.stringify({ cb: scanQRUri })}`;
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
    const paymentService = new cinerinoapi.service.Payment({
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
            const accountAuthorization = await paymentService.authorizeAccount({
                object: {
                    typeOf: cinerinoapi.factory.paymentMethodType.Account,
                    amount: price,
                    fromAccount: account
                },
                purpose: { typeOf: cinerinoapi.factory.transactionType.PlaceOrder, id: params.transactionId }
            });
            debug('残高確認済', accountAuthorization);
            await LINE.pushMessage(params.user.userId, { type: 'text', text: '残高の確認がとれました' });
            break;

        case cinerinoapi.factory.paymentMethodType.CreditCard:
            await LINE.replyMessage(params.replyToken, { type: 'text', text: 'クレジットカードを確認しています...' });
            if (params.creditCard === undefined) {
                throw new Error('クレジットカードが指定されていません');
            }

            await paymentService.authorizeCreditCard({
                object: {
                    typeOf: cinerinoapi.factory.paymentMethodType.CreditCard,
                    name: 'クレカ',
                    amount: price,
                    method: <any>'1',
                    creditCard: params.creditCard
                },
                purpose: { typeOf: cinerinoapi.factory.transactionType.PlaceOrder, id: params.transactionId }
            });
            await LINE.pushMessage(params.user.userId, { type: 'text', text: 'クレジットカードで決済を受け付けます' });
            break;

        case cinerinoapi.factory.paymentMethodType.Others:
            await LINE.replyMessage(params.replyToken, { type: 'text', text: '決済承認を実行します...' });

            await paymentService.authorizeAnyPayment({
                object: {
                    typeOf: cinerinoapi.factory.paymentMethodType.Others,
                    name: 'LINE POS その他',
                    amount: price
                },
                purpose: { typeOf: cinerinoapi.factory.transactionType.PlaceOrder, id: params.transactionId }
            });

            await LINE.pushMessage(params.user.userId, { type: 'text', text: '決済の承認がとれました' });

            break;

        default:
            throw new Error(`Unknown payment method ${params.paymentMethodType}`);
    }

    // 購入者情報確認
    let profile: cinerinoapi.factory.person.IProfile | undefined;
    if (await params.user.getCredentials() !== undefined) {
        await LINE.pushMessage(params.user.userId, { type: 'text', text: 'プロフィールを検索しています...' });
        // const loginTicket = params.user.authClient.verifyIdToken({});
        profile = await personService.getProfile({});
        const lineProfile = await LINE.getProfile(params.user.userId);
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
    const footerContets: FlexComponent[] = [
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
    const sellerService = new cinerinoapi.service.Seller({
        endpoint: <string>process.env.CINERINO_ENDPOINT,
        auth: params.user.authClient
    });
    const searchOrganizationsResult = await sellerService.search({ limit: 1 });
    const seller = searchOrganizationsResult.data[0];
    if (seller.paymentAccepted === undefined) {
        throw new Error('許可された決済方法が見つかりません');
    }
    const creditCardPayment = <cinerinoapi.factory.seller.IPaymentAccepted<cinerinoapi.factory.paymentMethodType.CreditCard>>
        seller.paymentAccepted.find((p) => p.paymentMethodType === cinerinoapi.factory.paymentMethodType.CreditCard);
    if (creditCardPayment === undefined) {
        throw new Error('クレジットカード決済が許可されていません');
    }
    const inputCreditCardUri =
        `/transactions/placeOrder/${params.transactionId}/inputCreditCard?gmoShopId=${creditCardPayment.gmoInfo.shopId}`;
    const liffUri = `line://app/${process.env.LIFF_ID}?${qs.stringify({ cb: inputCreditCardUri })}`;
    const footerContets: FlexComponent[] = [
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
    if (await params.user.getCredentials() !== undefined) {
        const personOwnershipInfoService = new cinerinoapi.service.person.OwnershipInfo({
            endpoint: <string>process.env.CINERINO_ENDPOINT,
            auth: params.user.authClient
        });
        const creditCards = await personOwnershipInfoService.searchCreditCards({});
        await LINE.pushMessage(params.user.userId, { type: 'text', text: `${creditCards.length}件のクレジットカードが見つかりました` });
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
    const sellerService = new cinerinoapi.service.Seller({
        endpoint: <string>process.env.CINERINO_ENDPOINT,
        auth: params.user.authClient
    });
    const placeOrderService = new cinerinoapi.service.txn.PlaceOrder({
        endpoint: <string>process.env.CINERINO_ENDPOINT,
        auth: params.user.authClient
    });
    const transaction = await params.user.findTransaction();
    const seller = await sellerService.findById({ id: transaction.seller.id });
    const seatReservationAuthorization = await params.user.findSeatReservationAuthorization();
    if (seatReservationAuthorization.result === undefined) {
        throw new Error('Invalid seat reservation authorization');
    }
    const price = seatReservationAuthorization.result.price;
    const tmpReservations = (Array.isArray(seatReservationAuthorization.result.responseBody.object.reservations))
        ? seatReservationAuthorization.result.responseBody.object.reservations
        : [];

    const profile = {
        familyName: params.familyName,
        givenName: params.givenName,
        email: params.email,
        telephone: params.telephone
    };
    await placeOrderService.setCustomerContact({
        id: params.transactionId,
        object: {
            customerContact: profile
        }
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
                                                    text: `${profile.givenName} ${profile.familyName}`,
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
                                                    text: profile.email,
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
                                                    text: profile.telephone,
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
                                    const str = (item.reservedTicket.ticketedSeat !== undefined)
                                        ? `${item.reservedTicket.ticketedSeat.seatNumber} ${item.reservedTicket.ticketType.name.ja}`
                                        : '座席なし';
                                    let priceStr = String(item.priceCurrency);
                                    if (item.price !== undefined) {
                                        if (typeof item.price === 'number') {
                                            priceStr = `${item.price} ${item.priceCurrency}`;
                                        } else {
                                            // tslint:disable-next-line:max-line-length
                                            const unitPriceSpec = <cinerinoapi.factory.chevre.priceSpecification.IPriceSpecification<cinerinoapi.factory.chevre.priceSpecificationType.UnitPriceSpecification>>
                                                item.price.priceComponent.find(
                                                    // tslint:disable-next-line:max-line-length
                                                    (spec) => spec.typeOf === cinerinoapi.factory.chevre.priceSpecificationType.UnitPriceSpecification
                                                );
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
                                                        text: `${event.name.ja} ${moment(event.startDate)
                                                            .format('MM/DD HH:mm')}`,
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
}

export async function confirmOrder(params: {
    replyToken: string;
    user: User;
    transactionId: string;
}) {
    await LINE.replyMessage(params.replyToken, { type: 'text', text: '注文を確定しています...' });

    const placeOrderService = new cinerinoapi.service.txn.PlaceOrder({
        endpoint: <string>process.env.CINERINO_ENDPOINT,
        auth: params.user.authClient
    });
    const { order } = await placeOrderService.confirm({
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
    const placeOrderService = new cinerinoapi.service.txn.PlaceOrder({
        endpoint: <string>process.env.CINERINO_ENDPOINT,
        auth: params.user.authClient
    });
    await placeOrderService.cancel({
        id: params.transactionId
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
    const sellerService = new cinerinoapi.service.Seller({
        endpoint: <string>process.env.CINERINO_ENDPOINT,
        auth: params.user.authClient
    });

    const searchAccountsResult = await personOwnershipInfoService.search<cinerinoapi.factory.ownershipInfo.AccountGoodType.Account>({
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
    const searchSellersResult = await sellerService.search({ limit: 1 });
    const seller = searchSellersResult.data.shift();
    if (seller === undefined) {
        throw new Error('販売者が見つかりませんでした');
    }

    const moneyTransferService = new cinerinoapi.service.txn.MoneyTransfer({
        endpoint: <string>process.env.CINERINO_ENDPOINT,
        auth: params.user.authClient
    });
    // 通貨転送取引開始
    const moneyTransferTransaction =
        await moneyTransferService.start<cinerinoapi.factory.accountType.Coin, cinerinoapi.factory.pecorino.account.TypeOf.Account>({
            project: { typeOf: 'Project', id: (<any>account).project.id },
            expires: moment()
                .add(1, 'minutes')
                .toDate(),
            agent: {
                typeOf: cinerinoapi.factory.personType.Person,
                id: <string>params.user.authClient.options.clientId
            },
            recipient: {
                typeOf: cinerinoapi.factory.personType.Person,
                id: transferMoneyInfo.userId,
                name: transferMoneyInfo.name,
                url: ''
            },
            seller: { typeOf: seller.typeOf, id: seller.id },
            object: {
                amount: params.price,
                authorizeActions: [],
                description: 'Cinerino LINE Ticket Pocket Money',
                fromLocation: {
                    typeOf: cinerinoapi.factory.pecorino.account.TypeOf.Account,
                    accountType: cinerinoapi.factory.accountType.Coin,
                    accountNumber: account.accountNumber
                },
                toLocation: {
                    typeOf: cinerinoapi.factory.pecorino.account.TypeOf.Account,
                    accountType: cinerinoapi.factory.accountType.Coin,
                    accountNumber: transferMoneyInfo.accountNumber
                }
            }
        });
    await LINE.pushMessage(params.user.userId, { type: 'text', text: '残高の確認がとれました' });

    // 取引確定
    await moneyTransferService.confirm({
        id: moneyTransferTransaction.id
    });
    debug('transaction confirmed.');
    await LINE.pushMessage(params.user.userId, { type: 'text', text: '転送が完了しました' });

    const profile = await personService.getProfile({});

    // 振込先に通知
    await LINE.pushMessage(params.user.userId, {
        type: 'text',
        text: `${profile.familyName} ${profile.givenName}から${params.price}円のおこづかいが振り込まれました`
    });
}

/**
 * コイン口座入金金額選択
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
    await LINE.pushMessage(params.user.userId, [message]);
}

/**
 * クレジット決済でコイン入金
 */
export async function depositCoinByCreditCard(params: {
    replyToken: string;
    user: User;
    amount: number;
    toAccountNumber: string;
}) {
    await LINE.replyMessage(params.replyToken, { type: 'text', text: `${params.amount}円の入金処理を実行します...` });

    const personService = new cinerinoapi.service.Person({
        endpoint: <string>process.env.CINERINO_ENDPOINT,
        auth: params.user.authClient
    });
    const personOwnershipInfoService = new cinerinoapi.service.person.OwnershipInfo({
        endpoint: <string>process.env.CINERINO_ENDPOINT,
        auth: params.user.authClient
    });
    const sellerService = new cinerinoapi.service.Seller({
        endpoint: <string>process.env.CINERINO_ENDPOINT,
        auth: params.user.authClient
    });

    const creditCards = await personOwnershipInfoService.searchCreditCards({});
    const creditCard = creditCards.shift();
    if (creditCard === undefined) {
        throw new Error('クレジットカードが登録されていません');
    }

    const lineProfile = await LINE.getProfile(params.user.userId);

    // 取引に販売者を指定する必要があるので、適当に検索
    const searchSellersResult = await sellerService.search({ limit: 1 });
    const seller = searchSellersResult.data.shift();
    if (seller === undefined) {
        throw new Error('販売者が見つかりませんでした');
    }

    const profile = await personService.getProfile({});

    // 入金取引
    await processOrderCoin({
        replyToken: params.replyToken,
        user: params.user,
        amount: params.amount,
        toAccountNumber: params.toAccountNumber,
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
}

async function processOrderCoin(params: {
    replyToken: string;
    user: User;
    amount: number;
    toAccountNumber: string;
    creditCard: cinerinoapi.factory.paymentMethod.paymentCard.creditCard.IUnauthorizedCardOfMember;
    profile: cinerinoapi.factory.transaction.placeOrder.ICustomerProfile;
    seller: cinerinoapi.factory.seller.IOrganization<any>;
}) {
    const placeOrderService = new cinerinoapi.service.txn.PlaceOrder({
        endpoint: <string>process.env.CINERINO_ENDPOINT,
        auth: params.user.authClient
    });
    const offerService = new cinerinoapi.service.Offer({
        endpoint: <string>process.env.CINERINO_ENDPOINT,
        auth: params.user.authClient
    });
    const paymentService = new cinerinoapi.service.Payment({
        endpoint: <string>process.env.CINERINO_ENDPOINT,
        auth: params.user.authClient
    });

    // 入金取引開始
    const placeOrderTransaction = await placeOrderService.start({
        agent: {
            identifier: [{ name: 'lineUserId', value: params.user.userId }]
        },
        seller: { typeOf: params.seller.typeOf, id: params.seller.id },
        expires: moment()
            .add(1, 'minutes')
            .toDate()
    });

    await placeOrderService.setCustomerContact({
        id: placeOrderTransaction.id,
        object: {
            customerContact: params.profile
        }
    });

    await offerService.authorizeMoneyTransfer({
        recipient: {
            typeOf: cinerinoapi.factory.personType.Person,
            id: params.user.userId,
            name: `${params.profile.givenName} ${params.profile.familyName}`
        },
        object: {
            typeOf: cinerinoapi.factory.actionType.MoneyTransfer,
            amount: Number(params.amount),
            toLocation: {
                typeOf: cinerinoapi.factory.pecorino.account.TypeOf.Account,
                accountType: cinerinoapi.factory.accountType.Coin,
                accountNumber: params.toAccountNumber
            }
        },
        purpose: { typeOf: placeOrderTransaction.typeOf, id: placeOrderTransaction.id }
    });

    await paymentService.authorizeCreditCard({
        object: {
            typeOf: cinerinoapi.factory.paymentMethodType.CreditCard,
            amount: Number(params.amount),
            method: <any>'1',
            creditCard: params.creditCard
        },
        purpose: { typeOf: placeOrderTransaction.typeOf, id: placeOrderTransaction.id }
    });

    await placeOrderService.confirm({
        id: placeOrderTransaction.id
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
    const creditCards = await personOwnershipInfoService.searchCreditCards({});
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
    const creditCard = await personOwnershipInfoService.addCreditCard({ creditCard: { token: params.token } });
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
    await personOwnershipInfoService.deleteCreditCard({ cardSeq: params.cardSeq });
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
    await personOwnershipInfoService.closeAccount({ accountType: params.accountType, accountNumber: params.accountNumber });
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
                                                    text: moment(account.openDate)
                                                        .format('lll'),
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
        limit: 10,
        page: 1,
        sort: {
            startDate: cinerinoapi.factory.pecorino.sortType.Descending
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
                                                    text: moment(a.endDate)
                                                        .format('YY.MM.DD HH:mm'),
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
    seatNumbers?: string[];
    numSeats?: number;
    offerId?: string;
}) {
    const eventService = new cinerinoapi.service.Event({
        endpoint: <string>process.env.CINERINO_ENDPOINT,
        auth: params.user.authClient
    });
    const sellerService = new cinerinoapi.service.Seller({
        endpoint: <string>process.env.CINERINO_ENDPOINT,
        auth: params.user.authClient
    });
    const placeOrderService = new cinerinoapi.service.txn.PlaceOrder({
        endpoint: <string>process.env.CINERINO_ENDPOINT,
        auth: params.user.authClient
    });

    const event = await eventService.findById<cinerinoapi.factory.chevre.eventType.ScreeningEvent>({ id: params.eventId });

    const reservedSeatsAvailable = !(event.offers !== undefined
        && event.offers.itemOffered !== undefined
        && event.offers.itemOffered.serviceOutput !== undefined
        && event.offers.itemOffered.serviceOutput.reservedTicket !== undefined
        && event.offers.itemOffered.serviceOutput.reservedTicket.ticketedSeat === undefined);

    // 販売者情報取得
    const searchSellersResult = await sellerService.search({});
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

    const storeId = <string>params.user.authClient.options.clientId;
    await LINE.pushMessage(params.user.userId, { type: 'text', text: `店舗ID:${storeId}でオファーを検索しています...` });
    let ticketOffers = await eventService.searchTicketOffers({
        event: { id: params.eventId },
        seller: seller,
        store: { id: storeId }
    });
    await LINE.pushMessage(params.user.userId, { type: 'text', text: `${ticketOffers.length}件のオファーが見つかりました` });

    // ムビチケ以外のオファーを選択
    ticketOffers = ticketOffers.filter((offer) => {
        const movieTicketTypeChargeSpecification = offer.priceSpecification.priceComponent.find(
            (component) => component.typeOf === cinerinoapi.factory.chevre.priceSpecificationType.MovieTicketTypeChargeSpecification
        );

        return movieTicketTypeChargeSpecification === undefined;
    });
    if (ticketOffers.length === 0) {
        throw new Error('ムビチケなしのオファーが見つかりません');
    }

    // 券種未選択であれば、券種選択へ
    if (params.offerId === undefined) {
        // tslint:disable-next-line:no-magic-numbers
        const quickReplyItems4selectOffer: QuickReplyItem[] = ticketOffers.slice(0, 10)
            .map((o) => {
                const unitPriceSpec = o.priceSpecification.priceComponent.find(
                    (c) => c.typeOf === cinerinoapi.factory.chevre.priceSpecificationType.UnitPriceSpecification
                );
                const priceStr = (unitPriceSpec !== undefined) ? `${unitPriceSpec.price} ${unitPriceSpec.priceCurrency}` : '';

                return {
                    type: 'action',
                    imageUrl: `https://${params.user.host}/img/labels/reservation-ticket.png`,
                    action: {
                        type: 'postback',
                        label: `${String(o.name.ja)
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

        const message4selectOffer: TextMessage = {
            type: 'text',
            text: '券種を選択してください',
            quickReply: {
                items: quickReplyItems4selectOffer
            }
        };
        await LINE.pushMessage(params.user.userId, [message4selectOffer]);

        return;
    }

    const selectedTicketOffer = ticketOffers.find((o) => o.id === params.offerId);
    if (selectedTicketOffer === undefined) {
        await LINE.pushMessage(params.user.userId, { type: 'text', text: `オファー ${params.offerId} が見つかりません` });

        return;
    }

    await LINE.pushMessage(params.user.userId, { type: 'text', text: `オファー ${selectedTicketOffer.name.ja} を選択しました` });

    const TRANSACTION_EXPIRES_IN_MINUTES = 5;
    await LINE.pushMessage(params.user.userId, { type: 'text', text: '取引を開始します...' });
    const transaction = await placeOrderService.start({
        expires: moment()
            .add(TRANSACTION_EXPIRES_IN_MINUTES, 'minutes')
            .toDate(),
        seller: seller,
        object: {}
    });
    await LINE.pushMessage(params.user.userId, { type: 'text', text: `${TRANSACTION_EXPIRES_IN_MINUTES}分以内に取引を終了してください` });
    debug('transaction started.', transaction.id);
    await params.user.saveTransaction(transaction);

    if (reservedSeatsAvailable) {
        if (params.seatNumbers === undefined) {
            await LINE.pushMessage(params.user.userId, { type: 'text', text: '座席が指定されていません' });

            return;
        }

        await LINE.pushMessage(params.user.userId, { type: 'text', text: `${event.name.ja}の座席を確保します...` });
        debug('creating a seat reservation authorization...');
        const seatReservationAuthorization =
            <cinerinoapi.factory.action.authorize.offer.seatReservation.IAction<cinerinoapi.factory.service.webAPI.Identifier.Chevre>>
            await placeOrderService.authorizeSeatReservation({
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
                                seatingType: <any>{}
                            },
                            additionalProperty: []
                        };
                    })
                },
                purpose: transaction
            });
        debug('seatReservationAuthorization:', seatReservationAuthorization);
        await LINE.pushMessage(params.user.userId, { type: 'text', text: `座席 ${params.seatNumbers.join(' ')} を確保しました` });

        await params.user.saveSeatReservationAuthorization(seatReservationAuthorization);
    } else {
        if (params.numSeats === undefined) {
            await LINE.pushMessage(params.user.userId, { type: 'text', text: '枚数が指定されていません' });

            return;
        }

        await LINE.pushMessage(params.user.userId, { type: 'text', text: `${params.numSeats}枚を確保します...` });
        debug('creating a seat reservation authorization...');
        const seatReservationAuthorization =
            <cinerinoapi.factory.action.authorize.offer.seatReservation.IAction<cinerinoapi.factory.service.webAPI.Identifier.Chevre>>
            await placeOrderService.authorizeSeatReservation({
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
        await LINE.pushMessage(params.user.userId, { type: 'text', text: `${params.numSeats}枚を確保しました` });

        await params.user.saveSeatReservationAuthorization(seatReservationAuthorization);
    }

    const quickReplyItems: QuickReplyItem[] = [
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

    if (await params.user.getCredentials() !== undefined) {
        quickReplyItems.push(
            {
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
            },
            {
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
            },
            {
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
        ownershipInfoId: params.id
    });
    await LINE.pushMessage(params.user.userId, { type: 'text', text: 'コードが発行されました' });
    let flex: FlexMessage;
    switch (params.goodType) {
        case cinerinoapi.factory.chevre.reservationType.EventReservation:
            const searchScreeningEventReservationsResult =
                await personOwnershipInfoService.search<cinerinoapi.factory.chevre.reservationType.EventReservation>({
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
            const event = await eventService.findById<cinerinoapi.factory.chevre.eventType.ScreeningEvent>({
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
            await LINE.pushMessage(params.user.userId, [flex]);
            break;

        case cinerinoapi.factory.ownershipInfo.AccountGoodType.Account:
            const searchAccountsResult =
                await personOwnershipInfoService.search<cinerinoapi.factory.ownershipInfo.AccountGoodType.Account>({
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
    const reservations = <cinerinoapi.factory.order.IReservation[]>order.acceptedOffers
        .filter((o) => o.itemOffered.typeOf === cinerinoapi.factory.chevre.reservationType.EventReservation)
        .map((o) => o.itemOffered);
    const event = await eventService.findById<cinerinoapi.factory.chevre.eventType.ScreeningEvent>({
        id: reservations[0].reservationFor.id
    });
    const thumbnailImageUrl = (event.workPerformed !== undefined
        && event.workPerformed.thumbnailUrl !== undefined
        && event.workPerformed.thumbnailUrl !== null)
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
                                        url: format(
                                            '%s%s',
                                            `https://chart.apis.google.com/chart?chs=300x300&cht=qr&chl=`,
                                            (r.reservedTicket !== undefined) ? r.reservedTicket.ticketToken : 'notickettoken'
                                        ),
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
                                    text: moment(order.orderDate)
                                        .format('llll'),
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
                            let itemName = String(orderItem.itemOffered.typeOf);
                            let itemDescription = 'no description';
                            let priceStr = orderItem.priceCurrency.toString();

                            switch (orderItem.itemOffered.typeOf) {
                                case 'ProgramMembership':
                                    break;

                                case cinerinoapi.factory.chevre.reservationType.EventReservation:
                                    const item = orderItem.itemOffered;
                                    const event = item.reservationFor;

                                    itemName = format(
                                        '%s %s',
                                        event.name.ja,
                                        moment(event.startDate)
                                            .format('MM/DD HH:mm')
                                    );

                                    // tslint:disable-next-line:max-line-length no-unnecessary-local-variable
                                    if (item.reservedTicket !== undefined) {
                                        if (item.reservedTicket.ticketedSeat !== undefined) {
                                            itemDescription = format(
                                                '%s %s',
                                                item.reservedTicket.ticketedSeat.seatNumber,
                                                item.reservedTicket.ticketType.name.ja
                                            );
                                        } else {
                                            itemDescription = format(
                                                '%s %s',
                                                '座席なし',
                                                item.reservedTicket.ticketType.name.ja
                                            );
                                        }
                                    } else {
                                        itemDescription = 'No Reserved Ticket';
                                    }

                                    if (orderItem.priceSpecification !== undefined) {
                                        const priceSpecification = <IReservationPriceSpec>orderItem.priceSpecification;
                                        // tslint:disable-next-line:max-line-length
                                        const unitPriceSpec = <cinerinoapi.factory.chevre.priceSpecification.IPriceSpecification<cinerinoapi.factory.chevre.priceSpecificationType.UnitPriceSpecification>>
                                            priceSpecification.priceComponent.find(
                                                // tslint:disable-next-line:max-line-length
                                                (spec) => spec.typeOf === cinerinoapi.factory.chevre.priceSpecificationType.UnitPriceSpecification
                                            );
                                        if (unitPriceSpec !== undefined) {
                                            // tslint:disable-next-line:max-line-length
                                            priceStr = `${unitPriceSpec.price}/${unitPriceSpec.referenceQuantity.value} ${unitPriceSpec.priceCurrency}`;
                                        } else {
                                            priceStr = 'No Unit Price Spec';
                                        }
                                    } else {
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
                    margin: 'md',
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
                                    text: (order.paymentMethods.length > 0)
                                        ? (String(order.paymentMethods[0].paymentMethodId).length > 0)
                                            ? String(order.paymentMethods[0].paymentMethodId)
                                            : 'No ID'
                                        : '---',
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
                                    text: (order.paymentMethods.length > 0)
                                        ? (String(order.paymentMethods[0].accountId).length > 0)
                                            ? String(order.paymentMethods[0].accountId)
                                            : 'No ID'
                                        : '---',
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
        const event = await eventService.findById<cinerinoapi.factory.chevre.eventType.ScreeningEvent>({
            id: reservation.reservationFor.id
        });
        const thumbnailImageUrl = (event.workPerformed !== undefined
            && event.workPerformed.thumbnailUrl !== undefined
            && event.workPerformed.thumbnailUrl !== null)
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
                                                        ? reservation.reservedTicket.ticketType.name.ja
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
    const profile = await personService.getProfile({});
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
    await personService.updateProfile({ ...params.profile });
    await LINE.pushMessage(params.user.userId, { type: 'text', text: 'プロフィールを更新しました' });
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
