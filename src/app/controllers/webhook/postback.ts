import * as cinerinoapi from '@cinerino/sdk';
import { FlexBubble, FlexComponent, FlexMessage, QuickReplyItem, TextMessage } from '@line/bot-sdk';
import * as createDebug from 'debug';
import { Request } from 'express';
import * as moment from 'moment';
import * as qs from 'qs';
// import { format } from 'util';

import LINE from '../../../lineClient';
import User from '../../user';

import { CoinAccountController } from '../account/coin';

import {
    account2flexBubble,
    createConfirmOrderFlexBubble,
    creditCard2flexBubble,
    IAccountOwnershipInfoWithDetail,
    IReservationOwnershipInfoWithDetail,
    moneyTransferAction2flexBubble,
    order2flexBubble,
    paymentCard2flexBubble,
    product2flexBubble,
    profile2bubble,
    reservation2flexBubble,
    // reservation2Ticket,
    // reservations2Ticket,
    screeningEvent2flexBubble,
    screeningEventSeries2flexBubble
} from '../../contentsBuilder';

const debug = createDebug('cinerino-line-ticket:controllers');

export type PaymentMethodType =
    'PaymentCard'
    | cinerinoapi.factory.paymentMethodType.CreditCard
    | 'Others';
export type ICreditCard = cinerinoapi.factory.chevre.paymentMethod.paymentCard.creditCard.IUncheckedCardTokenized
    | cinerinoapi.factory.chevre.paymentMethod.paymentCard.creditCard.IUnauthorizedCardOfMember;
export type ISeatReservationAuthorization
    = cinerinoapi.factory.action.authorize.offer.seatReservation.IAction<cinerinoapi.factory.service.webAPI.Identifier.Chevre>;

/**
 * ポストバックウェブフックコントローラ
 */
export class PostbackWebhookController {
    private readonly req: Request;
    private readonly project?: { id: string };
    private readonly user: User;

    constructor(req: Request) {
        this.req = req;
        this.project = req.project;
        this.user = req.user;
    }

    /**
     * 日付でイベント検索
     * @params.date {string} date YYYY-MM-DD形式
     */
    public async searchEventsByDate(params: {
        replyToken: string;
        date: string;
    }) {
        await LINE.replyMessage(params.replyToken, { type: 'text', text: `${params.date}のイベントを検索しています...` });

        const eventService = new cinerinoapi.service.Event({
            endpoint: <string>process.env.CINERINO_ENDPOINT,
            auth: this.user.authClient,
            project: { id: this.project?.id }
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
        await LINE.pushMessage(this.user.userId, { type: 'text', text: `${superEvents.length}件の作品がみつかりました` });

        if (superEvents.length === 0) {
            // 日付を再選択
            await this.askEventStartDate({
                replyToken: params.replyToken,
                text: '他の日付はいかがでしょうか？'
            });

            return;
        }

        // const accessToken = await params.user.authClient.getAccessToken();
        const flex: FlexMessage = {
            type: 'flex',
            altText: 'This is a Flex Message',
            contents: {
                type: 'carousel',
                contents: [
                    // tslint:disable-next-line:no-magic-numbers
                    ...superEvents.slice(0, 10)
                        .map<FlexBubble>((event) => {
                            return screeningEventSeries2flexBubble({ date: params.date, event: event });
                        })
                ]
            }
        };
        await LINE.pushMessage(this.user.userId, [flex]);
    }

    /**
     * 上映イベントスケジュールをたずねる
     */
    public async askScreeningEvent(params: {
        replyToken: string;
        screeningEventSeriesId: string;
        date: string;
    }) {
        await LINE.replyMessage(params.replyToken, { type: 'text', text: `${params.date}のイベントを検索しています...` });
        const eventService = new cinerinoapi.service.Event({
            endpoint: <string>process.env.CINERINO_ENDPOINT,
            auth: this.user.authClient,
            project: { id: this.project?.id }
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
        await LINE.pushMessage(this.user.userId, { type: 'text', text: `${screeningEvents.length}件のスケジュールがみつかりました` });

        const bubbles: FlexBubble[] = screeningEvents.map<FlexBubble>((event) => {
            return screeningEvent2flexBubble({ event: event, user: this.user });
        });

        await LINE.pushMessage(this.user.userId, [
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
     * メンバーシップサービスを検索する
     */
    public async searchMembershipServices(params: {
        replyToken: string;
    }) {
        await LINE.replyMessage(params.replyToken, { type: 'text', text: 'プロダクトを検索しています...' });
        const productService = new cinerinoapi.service.Product({
            endpoint: <string>process.env.CINERINO_ENDPOINT,
            auth: this.user.authClient,
            project: { id: this.project?.id }
        });
        const searchProductsResult = await productService.search({
            typeOf: { $eq: 'MembershipService' }
        });
        let products = searchProductsResult.data;
        // tslint:disable-next-line:no-magic-numbers
        products = products.slice(0, 10);
        await LINE.pushMessage(this.user.userId, { type: 'text', text: `${products.length}件のプロダクトがみつかりました` });

        const bubbles: FlexBubble[] = products.map<FlexBubble>((product) => {
            // api仕様上必須なので、いったん固定で
            return product2flexBubble({ product, user: this.user, accessCode: '1234' });
        });

        await LINE.pushMessage(this.user.userId, [
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
    public async askPaymentCode(params: {
        replyToken: string;
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
        const scanQRUri = `/projects/${this.project?.id}/transactions/placeOrder/scanQRCode?transactionId=${params.transactionId}`;
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
    public async selectPaymentMethodType(params: {
        replyToken: string;
        amount: number;
        paymentMethodType: PaymentMethodType;
        transactionId: string;
        code: string | undefined;
        creditCard: ICreditCard | undefined;
        paymentCard?: cinerinoapi.factory.chevre.paymentMethod.paymentCard.IPaymentCard;
    }) {
        const personService = new cinerinoapi.service.Person({
            endpoint: <string>process.env.CINERINO_ENDPOINT,
            auth: this.user.authClient,
            project: { id: this.project?.id }
        });
        // const personOwnershipInfoService = new cinerinoapi.service.person.OwnershipInfo({
        //     endpoint: <string>process.env.CINERINO_ENDPOINT,
        //     auth: this.user.authClient,
        //     project: { id: this.project?.id }
        // });
        const paymentService = new cinerinoapi.service.Payment({
            endpoint: <string>process.env.CINERINO_ENDPOINT,
            auth: this.user.authClient,
            project: { id: this.project?.id }
        });
        // const ownershipInfoService = new cinerinoapi.service.OwnershipInfo({
        //     endpoint: <string>process.env.CINERINO_ENDPOINT,
        //     auth: this.user.authClient,
        //     project: { id: this.project?.id }
        // });
        const price = params.amount;

        // 金額が0であれば決済不要
        if (price > 0) {
            switch (params.paymentMethodType) {
                case 'PaymentCard':
                    // let account: cinerinoapi.factory.pecorino.account.IAccount<string> | string;
                    // if (params.code === undefined) {
                    //     // 口座番号取得
                    //     const searchAccountsResult =
                    //         await personOwnershipInfoService.search<cinerinoapi.factory.ownershipInfo.AccountGoodType.Account>({
                    //             typeOfGood: {
                    //                 typeOf: cinerinoapi.factory.ownershipInfo.AccountGoodType.Account,
                    //                 accountType: cinerinoapi.factory.accountType.Prepaid
                    //             }
                    //         });
                    //     let accounts = searchAccountsResult.data.map((o) => o.typeOfGood);
                    //     accounts = accounts.filter((a) => a.status === cinerinoapi.factory.pecorino.accountStatusType.Opened);
                    //     debug('accounts:', accounts);
                    //     if (accounts.length === 0) {
                    //         throw new Error('口座未開設です');
                    //     }
                    //     account = accounts[0];
                    // } else {
                    //     const { token } = await ownershipInfoService.getToken({ code: params.code });
                    //     account = token;
                    // }
                    const paymentCard = params.paymentCard;
                    if (paymentCard === undefined) {
                        throw new Error('ペイメントカードが指定されていません');
                    }
                    await LINE.pushMessage(this.user.userId, { type: 'text', text: `${JSON.stringify(paymentCard)}` });
                    await LINE.pushMessage(this.user.userId, { type: 'text', text: `${paymentCard.identifier}の残高を確認しています...` });
                    const accountAuthorization = await paymentService.authorizePaymentCard({
                        object: {
                            typeOf: cinerinoapi.factory.action.authorize.paymentMethod.any.ResultType.Payment,
                            amount: price,
                            fromLocation: paymentCard,
                            paymentMethod: paymentCard.typeOf
                        },
                        purpose: { typeOf: cinerinoapi.factory.transactionType.PlaceOrder, id: params.transactionId }
                    });
                    debug('残高確認済', accountAuthorization);
                    await LINE.pushMessage(this.user.userId, { type: 'text', text: '残高の確認がとれました' });
                    break;

                case cinerinoapi.factory.paymentMethodType.CreditCard:
                    await LINE.pushMessage(this.user.userId, { type: 'text', text: `${JSON.stringify(params.creditCard)}` });
                    await LINE.replyMessage(params.replyToken, { type: 'text', text: 'クレジットカードを確認しています...' });
                    if (params.creditCard === undefined) {
                        throw new Error('クレジットカードが指定されていません');
                    }

                    await paymentService.authorizeCreditCard({
                        object: {
                            typeOf: cinerinoapi.factory.action.authorize.paymentMethod.any.ResultType.Payment,
                            name: 'クレカ',
                            amount: price,
                            method: '1',
                            paymentMethod: cinerinoapi.factory.chevre.paymentMethodType.CreditCard,
                            creditCard: params.creditCard
                        },
                        purpose: { typeOf: cinerinoapi.factory.transactionType.PlaceOrder, id: params.transactionId }
                    });
                    await LINE.pushMessage(this.user.userId, { type: 'text', text: 'クレジットカードで決済を受け付けます' });
                    break;

                case 'Others':
                    await LINE.replyMessage(params.replyToken, { type: 'text', text: '決済承認を実行します...' });

                    await paymentService.authorizeAnyPayment({
                        object: {
                            typeOf: cinerinoapi.factory.action.authorize.paymentMethod.any.ResultType.Payment,
                            name: 'LINE POS その他',
                            amount: price,
                            paymentMethod: 'Others'
                        },
                        purpose: { typeOf: cinerinoapi.factory.transactionType.PlaceOrder, id: params.transactionId }
                    });

                    await LINE.pushMessage(this.user.userId, { type: 'text', text: '決済の承認がとれました' });

                    break;

                default:
                    throw new Error(`Unknown payment method ${params.paymentMethodType}`);
            }
        }

        // セッションに金額保管
        await this.user.saveTransactionAmount(price);

        // 購入者情報確認
        let profile: cinerinoapi.factory.person.IProfile | undefined;
        if (await this.user.getCredentials() !== undefined) {
            await LINE.pushMessage(this.user.userId, { type: 'text', text: 'プロフィールを検索しています...' });
            // const loginTicket = params.user.authClient.verifyIdToken({});
            profile = await personService.getProfile({});
            const lineProfile = await LINE.getProfile(this.user.userId);
            profile = {
                givenName: (profile.givenName === '') ? lineProfile.displayName : profile.givenName,
                familyName: (profile.familyName === '') ? 'LINE' : profile.familyName,
                email: profile.email,
                telephone: (profile.telephone === '') ? '+819012345678' : profile.telephone
            };
        } else {
            profile = await this.user.findProfile();
        }

        const setCustomerContactQuery = qs.stringify({ profile: profile });
        const setCustomerContactUri = `/projects/${this.project?.id}/transactions/placeOrder/${params.transactionId}/setCustomerContact?${setCustomerContactQuery}`;
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
                    label: 'このまま進む',
                    data: qs.stringify({
                        action: 'setProfile',
                        transactionId: params.transactionId,
                        familyName: profile.familyName,
                        givenName: profile.givenName,
                        email: profile.email,
                        telephone: profile.telephone
                    })
                }
            });
        }

        await LINE.pushMessage(this.user.userId, [
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
                                                        text: (profile !== undefined)
                                                            ? `${profile.givenName} ${profile.familyName}`
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
                                                        text: 'Email',
                                                        color: '#aaaaaa',
                                                        size: 'sm',
                                                        flex: 1
                                                    },
                                                    {
                                                        type: 'text',
                                                        text: (typeof profile?.email === 'string') ? profile.email : '---',
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
                                                        text: (typeof profile?.telephone === 'string') ? profile.telephone : '---',
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
    public async selectCreditCard(params: {
        replyToken: string;
        amount: number;
        transactionId: string;
    }) {
        const sellerService = new cinerinoapi.service.Seller({
            endpoint: <string>process.env.CINERINO_ENDPOINT,
            auth: this.user.authClient,
            project: { id: this.project?.id }
        });
        const searchOrganizationsResult = await sellerService.search({ limit: 1 });
        const seller = searchOrganizationsResult.data[0];
        if (seller.paymentAccepted === undefined) {
            throw new Error('許可された決済方法が見つかりません');
        }
        const creditCardPayment = <cinerinoapi.factory.seller.IPaymentAccepted>
            seller.paymentAccepted.find((p) => p.paymentMethodType === cinerinoapi.factory.paymentMethodType.CreditCard);
        if (creditCardPayment === undefined) {
            throw new Error('クレジットカード決済が許可されていません');
        }
        const inputCreditCardUri =
            `/projects/${seller.project.id}/transactions/placeOrder/${params.transactionId}/inputCreditCard?gmoShopId=${(<any>creditCardPayment).gmoInfo.shopId}&amount=${params.amount}`;
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
        if (await this.user.getCredentials() !== undefined) {
            // myクレカサービスに対応しているとは限らない
            let creditCards: cinerinoapi.factory.paymentMethod.paymentCard.creditCard.ICheckedCard[] = [];

            try {
                const personOwnershipInfoService = new cinerinoapi.service.person.OwnershipInfo({
                    endpoint: <string>process.env.CINERINO_ENDPOINT,
                    auth: this.user.authClient,
                    project: { id: this.project?.id }
                });
                creditCards = await personOwnershipInfoService.searchCreditCards({});
                await LINE.pushMessage(this.user.userId, { type: 'text', text: `${creditCards.length}件のクレジットカードが見つかりました` });
            } catch (error) {
                await LINE.pushMessage(this.user.userId, { type: 'text', text: '※クレジットカード保持サービス非対応' });
            }

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
                            amount: params.amount,
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

        await LINE.pushMessage(this.user.userId, [
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
     * ペイメントカード照会
     */
    public async checkPaymentCard(params: {
        replyToken: string;
        paymentCard: {
            typeOf: string;
            identifier: string;
            accessCode: string;
        };
    }) {
        const paymentService = new cinerinoapi.service.Payment({
            endpoint: <string>process.env.CINERINO_ENDPOINT,
            auth: this.user.authClient,
            project: { id: this.project?.id }
        });

        const paymentCard = await paymentService.checkPaymentCard({
            object: params.paymentCard
        });

        await LINE.pushMessage(this.user.userId, { type: 'text', text: `カードが見つかりました:${paymentCard.identifier}` });
        const flex: FlexMessage = {
            type: 'flex',
            altText: 'This is a Flex Message',
            contents: {
                type: 'carousel',
                contents: [
                    paymentCard2flexBubble({ paymentCard: { ...paymentCard, accessCode: params.paymentCard.accessCode }, user: this.user })
                ]
            }
        };
        await LINE.pushMessage(this.user.userId, [flex]);
    }

    /**
     * プロダクト注文
     * メンバーシップ、ペイメントカードなど...
     */
    // tslint:disable-next-line:max-func-body-length
    public async orderPaymentCard(params: {
        replyToken: string;
        itemOffered: any;
        offer?: { id: string };
    }) {
        const placeOrderService = new cinerinoapi.service.transaction.PlaceOrder({
            endpoint: <string>process.env.CINERINO_ENDPOINT,
            auth: this.user.authClient,
            project: { id: this.project?.id }
        });

        const offerService = new cinerinoapi.service.Offer({
            endpoint: <string>process.env.CINERINO_ENDPOINT,
            auth: this.user.authClient,
            project: { id: this.project?.id }
        });

        const sellerService = new cinerinoapi.service.Seller({
            endpoint: <string>process.env.CINERINO_ENDPOINT,
            auth: this.user.authClient,
            project: { id: this.project?.id }
        });

        const productService = new cinerinoapi.service.Product({
            endpoint: <string>process.env.CINERINO_ENDPOINT,
            auth: this.user.authClient,
            project: { id: this.project?.id }
        });

        // 販売者検索
        const searchOrganizationsResult = await sellerService.search({ limit: 1 });
        const seller = searchOrganizationsResult.data[0];
        // if (seller.paymentAccepted === undefined) {
        //     throw new Error('許可された決済方法が見つかりません');
        // }
        // const creditCardPayment = <cinerinoapi.factory.seller.IPaymentAccepted<cinerinoapi.factory.paymentMethodType.CreditCard>>
        //     seller.paymentAccepted.find((p) => p.paymentMethodType === cinerinoapi.factory.paymentMethodType.CreditCard);
        // if (creditCardPayment === undefined) {
        //     throw new Error('クレジットカード決済が許可されていません');
        // }

        // プロダクト検索
        // const product = await productService.search({
        //     limit:1,
        //     id:
        // });

        // オファー未選択であれば、オファー選択へ
        if (typeof params.offer?.id !== 'string') {
            await LINE.pushMessage(this.user.userId, { type: 'text', text: 'オファーを検索しています...' });
            const offers = await productService.searchOffers({
                itemOffered: { id: params.itemOffered?.id },
                seller: { id: String(seller.id) }
            });

            if (offers.length === 0) {
                await LINE.pushMessage(this.user.userId, { type: 'text', text: 'オファーが見つかりませんでした' });
            } else {
                await LINE.pushMessage(this.user.userId, { type: 'text', text: `${offers.length}オファーが見つかりました` });

                // tslint:disable-next-line:no-magic-numbers
                const quickReplyItems4selectOffer: QuickReplyItem[] = offers.slice(0, 10)
                    .map((o) => {
                        const unitPriceSpec = o.priceSpecification.priceComponent.find(
                            (c) => c.typeOf === cinerinoapi.factory.chevre.priceSpecificationType.UnitPriceSpecification
                        );
                        const priceStr = (unitPriceSpec !== undefined) ? `${unitPriceSpec.price} ${unitPriceSpec.priceCurrency}` : '';

                        // const name = (typeof o.name === 'string') ? o.name : o.name?.ja;

                        let serviceOutputAmountValue = o.itemOffered?.serviceOutput?.amount?.value;
                        if (typeof serviceOutputAmountValue !== 'number') {
                            serviceOutputAmountValue = 0;
                        }

                        return {
                            type: 'action',
                            imageUrl: `https://${this.user.host}/img/labels/reservation-ticket.png`,
                            action: {
                                type: 'postback',
                                label: `${priceStr}円 (${serviceOutputAmountValue}円入金)`,
                                // label: String(o.id),
                                data: qs.stringify({
                                    action: 'orderPaymentCard',
                                    itemOffered: params.itemOffered,
                                    // profile: params.profile,
                                    offer: {
                                        id: o.id
                                    }
                                })
                            }
                        };
                    });

                const message4selectOffer: TextMessage = {
                    type: 'text',
                    text: 'オファーを選択してください',
                    quickReply: {
                        items: quickReplyItems4selectOffer
                    }
                };
                await LINE.pushMessage(this.user.userId, [message4selectOffer]);
            }

            return;
        }

        await LINE.pushMessage(this.user.userId, { type: 'text', text: '注文取引を開始します...' });
        const transaction = await placeOrderService.start({
            expires: moment()
                .add(1, 'minutes')
                .toDate(),
            agent: {},
            seller: {
                typeOf: seller.typeOf,
                id: String(seller.id)
            },
            object: {
                // passport: { token: passportToken }
            }
        });
        await LINE.pushMessage(this.user.userId, { type: 'text', text: `取引を開始しました: ${transaction.id}` });
        await this.user.saveTransaction(transaction);

        const paymentCardAuthorization = await offerService.authorizeProduct({
            object: [{
                project: { typeOf: transaction.project.typeOf, id: transaction.project.id },
                typeOf: cinerinoapi.factory.chevre.offerType.Offer,
                priceCurrency: cinerinoapi.factory.priceCurrency.JPY,
                id: params.offer?.id,
                itemOffered: {
                    project: { typeOf: transaction.project.typeOf, id: transaction.project.id },
                    typeOf: cinerinoapi.factory.chevre.product.ProductType.PaymentCard,
                    id: params.itemOffered?.id,
                    serviceOutput: {
                        project: { typeOf: transaction.project.typeOf, id: transaction.project.id },
                        typeOf: 'PaymentCard',
                        accessCode: params.itemOffered?.serviceOutput?.accessCode,
                        name: params.itemOffered?.serviceOutput?.name,
                        additionalProperty: []
                    }
                },
                seller: {
                    project: { typeOf: transaction.project.typeOf, id: transaction.project.id },
                    typeOf: seller.typeOf,
                    name: (typeof seller.name === 'string') ? seller.name : String(seller.name?.ja)
                }
            }],
            purpose: { typeOf: transaction.typeOf, id: transaction.id }
        });
        await LINE.pushMessage(this.user.userId, { type: 'text', text: `オファー ${params.offer?.id} を承認しました` });
        await this.user.saveProductOfferAuthorization(paymentCardAuthorization);

        const price = paymentCardAuthorization.result?.price;

        const quickReplyItems: QuickReplyItem[] = [];

        if (price === 0) {
            quickReplyItems.push({
                type: 'action',
                imageUrl: `https://${this.user.host}/img/labels/coin-64.png`,
                action: {
                    type: 'postback',
                    label: '決済なし',
                    data: qs.stringify({
                        action: 'selectPaymentMethodType',
                        amount: price,
                        paymentMethod: 'Others',
                        transactionId: transaction.id
                    })
                }
            });
        } else {
            // クレジットカード決済
            quickReplyItems.push(
                {
                    type: 'action',
                    imageUrl: `https://${this.user.host}/img/labels/credit-card-64.png`,
                    action: {
                        type: 'postback',
                        label: 'クレジットカード',
                        data: qs.stringify({
                            action: 'selectCreditCard',
                            amount: price,
                            transactionId: transaction.id
                        })
                    }
                }
            );

            if (await this.user.getCredentials() !== undefined) {
                quickReplyItems.push(
                    {
                        type: 'action',
                        imageUrl: `https://${this.user.host}/img/labels/friend-pay-50.png`,
                        action: {
                            type: 'postback',
                            label: 'Friend Pay',
                            data: qs.stringify({
                                action: 'askPaymentCode',
                                amount: price,
                                transactionId: transaction.id
                            })
                        }
                    },
                    {
                        type: 'action',
                        imageUrl: `https://${this.user.host}/img/labels/coin-64.png`,
                        action: {
                            type: 'postback',
                            label: 'その他',
                            data: qs.stringify({
                                action: 'selectPaymentMethodType',
                                amount: price,
                                paymentMethod: 'Others',
                                transactionId: transaction.id
                            })
                        }
                    }
                );
            }
        }

        const message: TextMessage = {
            type: 'text',
            text: `決済方法を選択してください(${price}円)`,
            quickReply: {
                items: quickReplyItems
            }
        };
        await LINE.pushMessage(this.user.userId, [message]);
    }

    /**
     * ペイメントカード選択
     */
    // tslint:disable-next-line:max-func-body-length
    public async selectPaymentCard(params: {
        replyToken: string;
        amount: number;
        transactionId: string;
    }) {
        const sellerService = new cinerinoapi.service.Seller({
            endpoint: <string>process.env.CINERINO_ENDPOINT,
            auth: this.user.authClient,
            project: { id: this.project?.id }
        });
        const searchOrganizationsResult = await sellerService.search({ limit: 1 });
        const seller = searchOrganizationsResult.data[0];
        if (seller.paymentAccepted === undefined) {
            throw new Error('許可された決済方法が見つかりません');
        }
        // const creditCardPayment = <cinerinoapi.factory.seller.IPaymentAccepted<cinerinoapi.factory.paymentMethodType.CreditCard>>
        //     seller.paymentAccepted.find((p) => p.paymentMethodType === cinerinoapi.factory.paymentMethodType.CreditCard);
        // if (creditCardPayment === undefined) {
        //     throw new Error('クレジットカード決済が許可されていません');
        // }
        const inputPaymentCardUri =
            `/projects/${seller.project.id}/transactions/placeOrder/${params.transactionId}/inputPaymentCard?amount=${params.amount}`;
        const liffUri = `line://app/${process.env.LIFF_ID}?${qs.stringify({ cb: inputPaymentCardUri })}`;
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
        // if (await this.user.getCredentials() !== undefined) {
        //     const personOwnershipInfoService = new cinerinoapi.service.person.OwnershipInfo({
        //         endpoint: <string>process.env.CINERINO_ENDPOINT,
        //         auth: this.user.authClient,
        //         project: { id: this.project?.id }
        //     });
        //     const creditCards = await personOwnershipInfoService.searchCreditCards({});
        //     await LINE.pushMessage(this.user.userId, { type: 'text', text: `${creditCards.length}件のクレジットカードが見つかりました` });
        //     if (creditCards.length > 0) {
        //         const creditCard = creditCards[0];
        //         footerContets.push({
        //             type: 'button',
        //             style: 'primary',
        //             action: {
        //                 type: 'postback',
        //                 label: creditCard.cardNo,
        //                 data: qs.stringify({
        //                     action: 'selectPaymentMethodType',
        //                     transactionId: params.transactionId,
        //                     paymentMethod: cinerinoapi.factory.paymentMethodType.CreditCard,
        //                     creditCard: {
        //                         memberId: 'me',
        //                         cardSeq: creditCard.cardSeq
        //                     }
        //                 })
        //             }
        //         });
        //     }
        // }

        await LINE.pushMessage(this.user.userId, [
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
                                text: 'ペイメントカードを選択してください',
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
    public async setProfile(params: {
        replyToken: string;
        transactionId: string;
        familyName: string;
        givenName: string;
        email: string;
        telephone: string;
    }) {
        const sellerService = new cinerinoapi.service.Seller({
            endpoint: <string>process.env.CINERINO_ENDPOINT,
            auth: this.user.authClient,
            project: { id: this.project?.id }
        });
        const placeOrderService = new cinerinoapi.service.txn.PlaceOrder({
            endpoint: <string>process.env.CINERINO_ENDPOINT,
            auth: this.user.authClient,
            project: { id: this.project?.id }
        });

        const transaction = await this.user.findTransaction();
        const seller = await sellerService.findById({ id: String(transaction.seller.id) });

        const profile: cinerinoapi.factory.person.IProfile = {
            familyName: params.familyName,
            givenName: params.givenName,
            email: params.email,
            name: `${params.givenName} ${params.familyName}`,
            telephone: params.telephone
        };

        await placeOrderService.setProfile({
            id: params.transactionId,
            agent: profile
        });
        await this.user.saveProfile(profile);
        await LINE.pushMessage(this.user.userId, { type: 'text', text: `プロフィールを設定しました: ${transaction.id}` });

        // 注文内容確認
        await LINE.pushMessage(this.user.userId, { type: 'text', text: `注文内容を確認します... ${transaction.id}` });

        const seatReservationAuthorization = await this.user.findSeatReservationAuthorization({ purpose: { id: transaction.id } });
        let tmpReservations = seatReservationAuthorization?.result?.responseBody.object.reservations;
        tmpReservations = (Array.isArray(tmpReservations)) ? tmpReservations : [];

        const productOfferAuthorization = await this.user.findProductOfferAuthorization({ purpose: { id: transaction.id } });
        let productOffers = productOfferAuthorization?.object;
        productOffers = (Array.isArray(productOffers)) ? productOffers : [];

        const price = await this.user.findTransactionAmount();

        await LINE.pushMessage(this.user.userId, [
            createConfirmOrderFlexBubble({
                seller: seller,
                profile: profile,
                productOffers,
                tmpReservations,
                id: params.transactionId,
                price: price
            })
        ]);
    }

    public async confirmOrder(params: {
        replyToken: string;
        transactionId: string;
    }) {
        await LINE.replyMessage(params.replyToken, { type: 'text', text: '注文を確定しています...' });

        const placeOrderService = new cinerinoapi.service.txn.PlaceOrder({
            endpoint: <string>process.env.CINERINO_ENDPOINT,
            auth: this.user.authClient,
            project: { id: this.project?.id }
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
                                        toRecipient: { name: `LINE User ${this.user.userId}` }
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
            contents: order2flexBubble({ order })
        };
        await LINE.pushMessage(this.user.userId, [flex]);
    }

    public async cancelOrder(params: {
        replyToken: string;
        transactionId: string;
    }) {
        await LINE.replyMessage(params.replyToken, { type: 'text', text: '注文取引をキャンセルしています...' });
        const placeOrderService = new cinerinoapi.service.txn.PlaceOrder({
            endpoint: <string>process.env.CINERINO_ENDPOINT,
            auth: this.user.authClient,
            project: { id: this.project?.id }
        });
        await placeOrderService.cancel({
            id: params.transactionId
        });
        await LINE.pushMessage(this.user.userId, { type: 'text', text: '注文取引をキャンセルしました' });
    }
    /**
     * 友達決済を承認確定
     */
    public async confirmFriendPay(__: {
        replyToken: string;
        token: string;
    }) {
        await LINE.pushMessage(this.user.userId, { type: 'text', text: 'implementing...' });
        // await LINE.replyMessage(params.replyToken, { type: 'text', text: 'implementing...' });
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
    public async confirmTransferMoney(params: {
        replyToken: string;
        token: string;
        price: number;
    }) {
        const transferMoneyInfo = await this.user.verifyTransferMoneyToken(params.token);
        await LINE.replyMessage(params.replyToken, { type: 'text', text: `${transferMoneyInfo.name}に${params.price}円の振込を実行します...` });

        const personService = new cinerinoapi.service.Person({
            endpoint: <string>process.env.CINERINO_ENDPOINT,
            auth: this.user.authClient,
            project: { id: this.project?.id }
        });
        const personOwnershipInfoService = new cinerinoapi.service.person.OwnershipInfo({
            endpoint: <string>process.env.CINERINO_ENDPOINT,
            auth: this.user.authClient,
            project: { id: this.project?.id }
        });
        const sellerService = new cinerinoapi.service.Seller({
            endpoint: <string>process.env.CINERINO_ENDPOINT,
            auth: this.user.authClient,
            project: { id: this.project?.id }
        });

        const searchAccountsResult = await personOwnershipInfoService.search({
            typeOfGood: {
                typeOf: 'Account',
                accountType: cinerinoapi.factory.accountType.Prepaid
            }
        });
        const accounts = searchAccountsResult.data
            .map((o) => <cinerinoapi.factory.account.IAccount>o.typeOfGood)
            .filter((a) => (a).status === cinerinoapi.factory.accountStatusType.Opened);
        const account = accounts.shift();
        if (account === undefined) {
            throw new Error('ペイメントカード未作成なので振込を実行できません');
        }

        // 取引に販売者を指定する必要があるので、適当に検索
        const searchSellersResult = await sellerService.search({ limit: 1 });
        const seller = searchSellersResult.data.shift();
        if (seller === undefined) {
            throw new Error('販売者が見つかりませんでした');
        }

        const profile = await personService.getProfile({});

        const coinAccountController = new CoinAccountController(this.req);
        await coinAccountController.processTransferCoin({
            amount: params.price,
            fromLocation: {
                accountNumber: account.accountNumber
            },
            transferMoneyInfo: transferMoneyInfo,
            profile: profile,
            seller: seller
        });
    }

    /**
     * ペイメントカード入金金額選択
     */
    public async selectDepositAmount(params: {
        replyToken: string;
        paymentCard: {
            typeOf: string;
            identifier: string;
        };
    }) {
        const message: TextMessage = {
            type: 'text',
            text: 'いくら入金しますか?',
            quickReply: {
                items: [
                    {
                        type: 'action',
                        imageUrl: `https://${this.user.host}/img/labels/coin-64.png`,
                        action: {
                            type: 'postback',
                            label: '100',
                            data: qs.stringify({
                                action: 'depositCoinByCreditCard',
                                amount: 100,
                                paymentCard: params.paymentCard
                            })
                        }
                    },
                    {
                        type: 'action',
                        imageUrl: `https://${this.user.host}/img/labels/coin-64.png`,
                        action: {
                            type: 'postback',
                            label: '1000',
                            data: qs.stringify({
                                action: 'depositCoinByCreditCard',
                                amount: 1000,
                                paymentCard: params.paymentCard
                            })
                        }
                    },
                    {
                        type: 'action',
                        imageUrl: `https://${this.user.host}/img/labels/coin-64.png`,
                        action: {
                            type: 'postback',
                            label: '10000',
                            data: qs.stringify({
                                action: 'depositCoinByCreditCard',
                                amount: 10000,
                                paymentCard: params.paymentCard
                            })
                        }
                    }
                ]
            }
        };
        await LINE.pushMessage(this.user.userId, [message]);
    }

    /**
     * クレジット決済でペイメントカード入金
     */
    // tslint:disable-next-line:max-func-body-length
    public async depositCoinByCreditCard(params: {
        replyToken: string;
        amount: number;
        paymentCard: {
            typeOf: string;
            identifier: string;
        };
    }) {
        await LINE.replyMessage(params.replyToken, { type: 'text', text: `${params.amount}円の入金処理を実行します...` });

        const sellerService = new cinerinoapi.service.Seller({
            endpoint: <string>process.env.CINERINO_ENDPOINT,
            auth: this.user.authClient,
            project: { id: this.project?.id }
        });
        const placeOrderService = new cinerinoapi.service.txn.PlaceOrder({
            endpoint: <string>process.env.CINERINO_ENDPOINT,
            auth: this.user.authClient,
            project: { id: this.project?.id }
        });
        const offerService = new cinerinoapi.service.Offer({
            endpoint: <string>process.env.CINERINO_ENDPOINT,
            auth: this.user.authClient,
            project: { id: this.project?.id }
        });

        // 販売者情報取得
        const searchSellersResult = await sellerService.search({
            project: { id: { $eq: this.req.project?.id } }
        });
        const seller = searchSellersResult.data.shift();
        if (seller === undefined) {
            throw new Error('販売者が見つかりません');
        }

        const TRANSACTION_EXPIRES_IN_MINUTES = 5;
        await LINE.pushMessage(this.user.userId, { type: 'text', text: '取引を開始します...' });
        const transaction = await placeOrderService.start({
            expires: moment()
                .add(TRANSACTION_EXPIRES_IN_MINUTES, 'minutes')
                .toDate(),
            seller: { id: String(seller.id), typeOf: seller.typeOf },
            object: {}
        });
        await LINE.pushMessage(this.user.userId, { type: 'text', text: `${TRANSACTION_EXPIRES_IN_MINUTES}分以内に取引を終了してください` });
        debug('transaction started.', transaction.id);
        await this.user.saveTransaction(transaction);

        await offerService.authorizeMonetaryAmount({
            object: {
                project: { typeOf: cinerinoapi.factory.chevre.organizationType.Project, id: transaction.project.id },
                typeOf: cinerinoapi.factory.chevre.offerType.Offer,
                itemOffered: {
                    typeOf: 'MonetaryAmount',
                    value: Number(params.amount),
                    currency: cinerinoapi.factory.accountType.Prepaid
                },
                priceCurrency: cinerinoapi.factory.priceCurrency.JPY,
                seller: {
                    project: { typeOf: cinerinoapi.factory.chevre.organizationType.Project, id: transaction.project.id },
                    typeOf: seller.typeOf,
                    name: (typeof seller.name === 'string') ? seller.name : String(seller.name?.ja)
                },
                toLocation: params.paymentCard
            },
            purpose: { typeOf: transaction.typeOf, id: transaction.id }
        });

        const price = params.amount;

        const quickReplyItems: QuickReplyItem[] = [];

        if (price === 0) {
            quickReplyItems.push({
                type: 'action',
                imageUrl: `https://${this.user.host}/img/labels/coin-64.png`,
                action: {
                    type: 'postback',
                    label: '決済なし',
                    data: qs.stringify({
                        action: 'selectPaymentMethodType',
                        amount: 0,
                        paymentMethod: 'Others',
                        transactionId: transaction.id
                    })
                }
            });
        } else {
            // クレジットカード決済
            quickReplyItems.push(
                {
                    type: 'action',
                    imageUrl: `https://${this.user.host}/img/labels/credit-card-64.png`,
                    action: {
                        type: 'postback',
                        label: 'クレジットカード',
                        data: qs.stringify({
                            action: 'selectCreditCard',
                            amount: price,
                            transactionId: transaction.id
                        })
                    }
                },
                {
                    type: 'action',
                    imageUrl: `https://${this.user.host}/img/labels/credit-card-64.png`,
                    action: {
                        type: 'postback',
                        label: 'ペイメントカード',
                        data: qs.stringify({
                            action: 'selectPaymentCard',
                            amount: price,
                            transactionId: transaction.id
                        })
                    }
                }
            );

            if (await this.user.getCredentials() !== undefined) {
                quickReplyItems.push(
                    {
                        type: 'action',
                        imageUrl: `https://${this.user.host}/img/labels/friend-pay-50.png`,
                        action: {
                            type: 'postback',
                            label: 'Friend Pay',
                            data: qs.stringify({
                                action: 'askPaymentCode',
                                amount: price,
                                transactionId: transaction.id
                            })
                        }
                    },
                    {
                        type: 'action',
                        imageUrl: `https://${this.user.host}/img/labels/coin-64.png`,
                        action: {
                            type: 'postback',
                            label: 'その他',
                            data: qs.stringify({
                                action: 'selectPaymentMethodType',
                                amount: price,
                                paymentMethod: 'Others',
                                transactionId: transaction.id
                            })
                        }
                    }
                );
            }
        }

        const message: TextMessage = {
            type: 'text',
            text: `決済方法を選択してください(${price}円)`,
            quickReply: {
                items: quickReplyItems
            }
        };
        await LINE.pushMessage(this.user.userId, [message]);
    }

    /**
     * クレジットカード検索
     */
    public async searchCreditCards(params: {
        replyToken: string;
    }) {
        await LINE.replyMessage(params.replyToken, { type: 'text', text: 'クレジットカードを検索しています...' });
        const personOwnershipInfoService = new cinerinoapi.service.person.OwnershipInfo({
            endpoint: <string>process.env.CINERINO_ENDPOINT,
            auth: this.user.authClient,
            project: { id: this.project?.id }
        });
        const creditCards = await personOwnershipInfoService.searchCreditCards({});
        await LINE.pushMessage(this.user.userId, { type: 'text', text: `${creditCards.length}件のクレジットカードがみつかりました` });

        if (creditCards.length > 0) {
            const flex: FlexMessage = {
                type: 'flex',
                altText: 'This is a Flex Message',
                contents: {
                    type: 'carousel',
                    contents: [
                        ...creditCards.map<FlexBubble>((creditCard) => {
                            return creditCard2flexBubble({ creditCard: creditCard, user: this.user });
                        })
                    ]
                }
            };
            await LINE.pushMessage(this.user.userId, [flex]);
        }
    }

    public async addCreditCard(params: {
        replyToken: string;
        token: string;
    }) {
        const personOwnershipInfoService = new cinerinoapi.service.person.OwnershipInfo({
            endpoint: <string>process.env.CINERINO_ENDPOINT,
            auth: this.user.authClient,
            project: { id: this.project?.id }
        });
        const creditCard = await personOwnershipInfoService.addCreditCard({ creditCard: { token: params.token } });
        await LINE.replyMessage(params.replyToken, { type: 'text', text: `クレジットカード ${creditCard.cardNo} が追加されました` });
    }

    public async deleteCreditCard(params: {
        replyToken: string;
        cardSeq: string;
    }) {
        const personOwnershipInfoService = new cinerinoapi.service.person.OwnershipInfo({
            endpoint: <string>process.env.CINERINO_ENDPOINT,
            auth: this.user.authClient,
            project: { id: this.project?.id }
        });
        await personOwnershipInfoService.deleteCreditCard({ cardSeq: params.cardSeq });
        await LINE.replyMessage(params.replyToken, { type: 'text', text: 'クレジットカードが削除されました' });
    }

    /**
     * 口座開設
     */
    public async openAccount(params: {
        replyToken: string;
        name: string;
        accountType: string;
    }) {
        const personOwnershipInfoService = new cinerinoapi.service.person.OwnershipInfo({
            endpoint: <string>process.env.CINERINO_ENDPOINT,
            auth: this.user.authClient,
            project: { id: this.project?.id }
        });
        const openResult = await personOwnershipInfoService.openAccount({
            name: params.name,
            accountType: params.accountType
        });
        await LINE.replyMessage(params.replyToken, {
            type: 'text',
            text: `${params.accountType}口座 が開設されました 注文番号:${openResult.order.orderNumber}`
        });
    }

    /**
     * 口座解約
     */
    public async closeAccount(params: {
        replyToken: string;
        accountType: string;
        accountNumber: string;
    }) {
        const personOwnershipInfoService = new cinerinoapi.service.person.OwnershipInfo({
            endpoint: <string>process.env.CINERINO_ENDPOINT,
            auth: this.user.authClient,
            project: { id: this.project?.id }
        });
        await personOwnershipInfoService.closeAccount({ accountNumber: params.accountNumber });
        await LINE.replyMessage(params.replyToken, { type: 'text', text: `${params.accountType}口座 ${params.accountNumber} が解約されました` });
    }

    public async searchCoinAccounts(__: {
        replyToken: string;
    }) {
        const personOwnershipInfoService = new cinerinoapi.service.person.OwnershipInfo({
            endpoint: <string>process.env.CINERINO_ENDPOINT,
            auth: this.user.authClient,
            project: { id: this.project?.id }
        });
        const searchAccountsResult = await personOwnershipInfoService.search({
            typeOfGood: {
                typeOf: 'Account',
                accountType: cinerinoapi.factory.accountType.Prepaid
            }
        });
        const accountOwnershipInfos = <IAccountOwnershipInfoWithDetail[]>searchAccountsResult.data.filter(
            (o) => (<cinerinoapi.factory.account.IAccount>o.typeOfGood).status
                === cinerinoapi.factory.accountStatusType.Opened
        );
        if (accountOwnershipInfos.length === 0) {
            throw new Error('口座未開設です');
        }

        const flex: FlexMessage = {
            type: 'flex',
            altText: 'This is a Flex Message',
            contents: {
                type: 'carousel',
                contents: [
                    ...accountOwnershipInfos.map<FlexBubble>((ownershipInfo) => {
                        return account2flexBubble({ ownershipInfo: ownershipInfo, user: this.user });
                    })
                ]
            }
        };
        await LINE.pushMessage(this.user.userId, [flex]);
    }

    /**
     * 口座取引履歴検索
     */
    public async searchAccountMoneyTransferActions(params: {
        replyToken: string;
        accountType: string;
        accountNumber: string;
    }) {
        const personOwnershipInfoService = new cinerinoapi.service.person.OwnershipInfo({
            endpoint: <string>process.env.CINERINO_ENDPOINT,
            auth: this.user.authClient,
            project: { id: this.project?.id }
        });
        const searchAccountsResult = await personOwnershipInfoService.search({
            typeOfGood: {
                typeOf: 'Account',
                accountType: params.accountType
            }
        });
        const accountOwnershipInfo = searchAccountsResult.data.find(
            (o) => (<cinerinoapi.factory.ownershipInfo.IAccount>o.typeOfGood).accountNumber === params.accountNumber
        );
        debug('accounts:', accountOwnershipInfo);
        if (accountOwnershipInfo === undefined) {
            throw new Error('口座が見つかりません');
        }

        await LINE.replyMessage(params.replyToken, { type: 'text', text: '取引履歴を検索します...' });
        const searchActions = await personOwnershipInfoService.searchAccountMoneyTransferActions({
            limit: 10,
            page: 1,
            sort: {
                startDate: cinerinoapi.factory.sortType.Descending
            },
            accountNumber: params.accountNumber
        });
        const transferActions = searchActions.data;
        if (searchActions.data.length === 0) {
            await LINE.pushMessage(this.user.userId, { type: 'text', text: 'まだ取引履歴はありません' });

            return;
        }
        await LINE.pushMessage(this.user.userId, {
            type: 'text',
            text: '取引履歴が見つかりました'
        });

        if (transferActions.length > 0) {
            await LINE.pushMessage(this.user.userId, { type: 'text', text: `直近の${transferActions.length}件は以下の通りです` });

            const flex: FlexMessage = {
                type: 'flex',
                altText: 'This is a Flex Message',
                contents: {
                    type: 'carousel',
                    contents: [
                        ...transferActions.map<FlexBubble>((a) => {
                            return moneyTransferAction2flexBubble({ action: a, user: this.user });
                        })
                    ]
                }
            };
            await LINE.pushMessage(this.user.userId, [flex]);
        }
    }

    /**
     * ユーザーのチケット(予約)を検索する
     */
    public async searchScreeningEventReservations(params: {
        replyToken: string;
    }) {
        const now = new Date();
        await LINE.replyMessage(params.replyToken, { type: 'text', text: 'ここ一カ月の予約を検索しています...' });
        const personOwnershipInfoService = new cinerinoapi.service.person.OwnershipInfo({
            endpoint: <string>process.env.CINERINO_ENDPOINT,
            auth: this.user.authClient,
            project: { id: this.project?.id }
        });
        const searchScreeningEventReservationsResult =
            await personOwnershipInfoService.search({
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
        const ownershipInfos = <IReservationOwnershipInfoWithDetail[]>searchScreeningEventReservationsResult.data;
        // 未来の予約
        if (searchScreeningEventReservationsResult.data.length === 0) {
            await LINE.pushMessage(this.user.userId, { type: 'text', text: '予約が見つかりませんでした' });
        } else {
            await LINE.pushMessage(this.user.userId, {
                type: 'text',
                text: '予約が見つかりました'
            });

            await LINE.pushMessage(this.user.userId, { type: 'text', text: `直近の${ownershipInfos.length}件は以下の通りです` });

            const flex: FlexMessage = {
                type: 'flex',
                altText: 'This is a Flex Message',
                contents: {
                    type: 'carousel',
                    contents: [
                        ...ownershipInfos
                            .map<FlexBubble>((ownershipInfo) => {
                                return reservation2flexBubble({ ownershipInfo: ownershipInfo });
                            })
                    ]
                }
            };
            await LINE.pushMessage(this.user.userId, [flex]);
        }
    }

    /**
     * 仮予約
     */
    // tslint:disable-next-line:max-func-body-length
    public async selectSeatOffers(params: {
        replyToken: string;
        eventId: string;
        seatNumbers?: string[];
        numSeats?: number;
        offerId?: string;
    }) {
        const eventService = new cinerinoapi.service.Event({
            endpoint: <string>process.env.CINERINO_ENDPOINT,
            auth: this.user.authClient,
            project: { id: this.project?.id }
        });
        const sellerService = new cinerinoapi.service.Seller({
            endpoint: <string>process.env.CINERINO_ENDPOINT,
            auth: this.user.authClient,
            project: { id: this.project?.id }
        });
        const placeOrderService = new cinerinoapi.service.txn.PlaceOrder({
            endpoint: <string>process.env.CINERINO_ENDPOINT,
            auth: this.user.authClient,
            project: { id: this.project?.id }
        });

        const event = await eventService.findById<cinerinoapi.factory.chevre.eventType.ScreeningEvent>({ id: params.eventId });

        const reservedSeatsAvailable = event.offers?.itemOffered.serviceOutput?.reservedTicket?.ticketedSeat !== undefined;

        // 販売者情報取得(イベントのオファーに販売者情報あり)
        const searchSellersResult = await sellerService.search({
            project: { id: { $eq: event.project.id } }
        });
        const seller = searchSellersResult.data.find((s) => s.id === event.offers?.seller?.id);
        if (seller === undefined) {
            throw new Error(`イベントの販売者が見つかりません: ${event.offers?.seller?.id}`);
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

        const storeId = <string>this.user.authClient.options.clientId;
        await LINE.pushMessage(this.user.userId, { type: 'text', text: `店舗ID:${storeId}でオファーを検索しています...` });
        let ticketOffers = await eventService.searchTicketOffers({
            event: { id: params.eventId },
            seller: { id: String(seller.id), typeOf: seller.typeOf },
            store: { id: storeId }
        });
        await LINE.pushMessage(this.user.userId, { type: 'text', text: `${ticketOffers.length}件のオファーが見つかりました` });

        // ムビチケ以外のオファーを選択
        ticketOffers = ticketOffers.filter((offer) => {
            const movieTicketTypeChargeSpecification = offer.priceSpecification.priceComponent.find(
                (component) => component.typeOf === cinerinoapi.factory.chevre.priceSpecificationType.MovieTicketTypeChargeSpecification
            );

            return movieTicketTypeChargeSpecification === undefined;
        });
        if (ticketOffers.length === 0) {
            throw new Error('使用可能なオファーが見つかりませんでした');
        }

        // オファー未選択であれば、オファー選択へ
        if (params.offerId === undefined) {
            // tslint:disable-next-line:no-magic-numbers
            const quickReplyItems4selectOffer: QuickReplyItem[] = ticketOffers.slice(0, 10)
                .map((o) => {
                    const unitPriceSpec = o.priceSpecification.priceComponent.find(
                        (c) => c.typeOf === cinerinoapi.factory.chevre.priceSpecificationType.UnitPriceSpecification
                    );
                    const priceStr = (unitPriceSpec !== undefined) ? `${unitPriceSpec.price} ${unitPriceSpec.priceCurrency}` : '';

                    const name = (typeof o.name === 'string') ? o.name : o.name?.ja;

                    return {
                        type: 'action',
                        imageUrl: `https://${this.user.host}/img/labels/reservation-ticket.png`,
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

            const message4selectOffer: TextMessage = {
                type: 'text',
                text: 'オファーを選択してください',
                quickReply: {
                    items: quickReplyItems4selectOffer
                }
            };
            await LINE.pushMessage(this.user.userId, [message4selectOffer]);

            return;
        }

        const selectedTicketOffer = ticketOffers.find((o) => o.id === params.offerId);
        if (selectedTicketOffer === undefined) {
            await LINE.pushMessage(this.user.userId, { type: 'text', text: `オファー ${params.offerId} が見つかりません` });

            return;
        }

        await LINE.pushMessage(this.user.userId, { type: 'text', text: `オファー ${selectedTicketOffer.identifier} を選択しました` });

        const TRANSACTION_EXPIRES_IN_MINUTES = 5;
        await LINE.pushMessage(this.user.userId, { type: 'text', text: '取引を開始します...' });
        const transaction = await placeOrderService.start({
            expires: moment()
                .add(TRANSACTION_EXPIRES_IN_MINUTES, 'minutes')
                .toDate(),
            seller: { id: String(seller.id), typeOf: seller.typeOf },
            object: {}
        });
        await LINE.pushMessage(this.user.userId, { type: 'text', text: `${TRANSACTION_EXPIRES_IN_MINUTES}分以内に取引を終了してください` });
        debug('transaction started.', transaction.id);
        await this.user.saveTransaction(transaction);

        // tslint:disable-next-line:max-line-length
        let seatReservationAuthorization: ISeatReservationAuthorization;

        if (reservedSeatsAvailable) {
            if (params.seatNumbers === undefined) {
                await LINE.pushMessage(this.user.userId, { type: 'text', text: '座席が指定されていません' });

                return;
            }

            await LINE.pushMessage(this.user.userId, { type: 'text', text: `${event.name.ja}の座席を確保します...` });
            debug('creating a seat reservation authorization...');
            const authorizeObject: cinerinoapi.factory.assetTransaction.reserve.IObjectWithoutDetail = {
                reservationFor: { id: event.id },
                acceptedOffer: params.seatNumbers.map((seatNumber) => {
                    // return '';
                    return {
                        id: <string>selectedTicketOffer.id,
                        itemOffered: {
                            serviceOutput: {
                                typeOf: cinerinoapi.factory.reservationType.EventReservation,
                                // additionalProperty?: IPropertyValue<string>[];
                                // additionalTicketText?: string;
                                // programMembershipUsed?: {
                                //     accessCode?: string;
                                //     identifier?: string;
                                // };
                                reservedTicket: {
                                    typeOf: 'Ticket',
                                    ticketedSeat: {
                                        typeOf: cinerinoapi.factory.chevre.placeType.Seat,
                                        seatNumber: seatNumber,
                                        seatSection: 'Default',
                                        seatRow: ''
                                        // seatingType: <any>{}
                                    }
                                }
                                // subReservation?: IAcceptedSubReservation[];
                            }
                        }
                        // additionalProperty: []
                    };
                })
            };
            seatReservationAuthorization = <ISeatReservationAuthorization>await placeOrderService.authorizeSeatReservation({
                object: authorizeObject,
                purpose: transaction
            });
            debug('seatReservationAuthorization:', seatReservationAuthorization);
            await LINE.pushMessage(this.user.userId, { type: 'text', text: `座席 ${params.seatNumbers.join(' ')} を確保しました` });

            await this.user.saveSeatReservationAuthorization(seatReservationAuthorization);
        } else {
            if (params.numSeats === undefined) {
                await LINE.pushMessage(this.user.userId, { type: 'text', text: '枚数が指定されていません' });

                return;
            }

            await LINE.pushMessage(this.user.userId, { type: 'text', text: `${params.numSeats}枚を確保します...` });
            debug('creating a seat reservation authorization...');
            seatReservationAuthorization = <ISeatReservationAuthorization>await placeOrderService.authorizeSeatReservation({
                object: {
                    reservationFor: { id: event.id },
                    // tslint:disable-next-line:prefer-array-literal
                    acceptedOffer: [...Array(params.numSeats)].map(() => {
                        return {
                            id: <string>selectedTicketOffer.id,
                            additionalProperty: []
                        };
                    })
                },
                purpose: transaction
            });
            debug('seatReservationAuthorization:', seatReservationAuthorization);
            await LINE.pushMessage(this.user.userId, { type: 'text', text: `${params.numSeats}枚を確保しました` });

            await this.user.saveSeatReservationAuthorization(seatReservationAuthorization);
        }

        if (seatReservationAuthorization.result === undefined) {
            throw new Error('予約承認結果が見つかりません');
        }

        const price = seatReservationAuthorization.result.price;

        const quickReplyItems: QuickReplyItem[] = [];

        if (price === 0) {
            quickReplyItems.push({
                type: 'action',
                imageUrl: `https://${this.user.host}/img/labels/coin-64.png`,
                action: {
                    type: 'postback',
                    label: '決済なし',
                    data: qs.stringify({
                        action: 'selectPaymentMethodType',
                        amount: price,
                        paymentMethod: 'Others',
                        transactionId: transaction.id
                    })
                }
            });
        } else {
            // クレジットカード決済
            quickReplyItems.push(
                {
                    type: 'action',
                    imageUrl: `https://${this.user.host}/img/labels/credit-card-64.png`,
                    action: {
                        type: 'postback',
                        label: 'クレジットカード',
                        data: qs.stringify({
                            action: 'selectCreditCard',
                            amount: price,
                            transactionId: transaction.id
                        })
                    }
                },
                {
                    type: 'action',
                    imageUrl: `https://${this.user.host}/img/labels/credit-card-64.png`,
                    action: {
                        type: 'postback',
                        label: 'ペイメントカード',
                        data: qs.stringify({
                            action: 'selectPaymentCard',
                            amount: price,
                            transactionId: transaction.id
                        })
                    }
                }
            );

            if (await this.user.getCredentials() !== undefined) {
                quickReplyItems.push(
                    {
                        type: 'action',
                        imageUrl: `https://${this.user.host}/img/labels/friend-pay-50.png`,
                        action: {
                            type: 'postback',
                            label: 'Friend Pay',
                            data: qs.stringify({
                                action: 'askPaymentCode',
                                amount: price,
                                transactionId: transaction.id
                            })
                        }
                    },
                    {
                        type: 'action',
                        imageUrl: `https://${this.user.host}/img/labels/coin-64.png`,
                        action: {
                            type: 'postback',
                            label: 'その他',
                            data: qs.stringify({
                                action: 'selectPaymentMethodType',
                                amount: price,
                                paymentMethod: 'Others',
                                transactionId: transaction.id
                            })
                        }
                    }
                );
            }
        }

        const message: TextMessage = {
            type: 'text',
            text: `決済方法を選択してください(${price}円)`,
            quickReply: {
                items: quickReplyItems
            }
        };
        await LINE.pushMessage(this.user.userId, [message]);
    }

    /**
     * 所有権コード発行
     */
    // tslint:disable-next-line:max-func-body-length
    public async authorizeOwnershipInfo(params: {
        replyToken: string;
        goodType: string;
        id: string;
    }) {
        await LINE.replyMessage(params.replyToken, { type: 'text', text: 'コード発行中...' });
        const personOwnershipInfoService = new cinerinoapi.service.person.OwnershipInfo({
            endpoint: <string>process.env.CINERINO_ENDPOINT,
            auth: this.user.authClient,
            project: { id: this.project?.id }
        });
        const eventService = new cinerinoapi.service.Event({
            endpoint: <string>process.env.CINERINO_ENDPOINT,
            auth: this.user.authClient,
            project: { id: this.project?.id }
        });
        const { code } = await personOwnershipInfoService.authorize({
            ownershipInfoId: params.id
        });
        await LINE.pushMessage(this.user.userId, { type: 'text', text: 'コードが発行されました' });
        let flex: FlexMessage;
        switch (params.goodType) {
            case cinerinoapi.factory.chevre.reservationType.EventReservation:
                const searchScreeningEventReservationsResult =
                    await personOwnershipInfoService.search({
                        typeOfGood: {
                            typeOf: cinerinoapi.factory.chevre.reservationType.EventReservation
                        }
                    });
                const ownershipInfos = searchScreeningEventReservationsResult.data;
                const reservation = ownershipInfos.find((o) => o.id === params.id);
                if (reservation === undefined) {
                    throw new Error('Reservation not found');
                }
                const itemOffered = <cinerinoapi.factory.order.IReservation>reservation.typeOfGood;
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
                                                            text: `${(<any>event.superEvent.location.name).ja} ${(<any>event.location.name).ja}`,
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
                                                                : String(itemOffered.reservedTicket.ticketType.name?.ja),
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
                await LINE.pushMessage(this.user.userId, [flex]);
                break;

            case 'Account':
                const searchAccountsResult =
                    await personOwnershipInfoService.search({
                        typeOfGood: {
                            typeOf: 'Account',
                            accountType: cinerinoapi.factory.accountType.Prepaid
                        }
                    });
                const accountOwnershipInfo = searchAccountsResult.data.find((o) => o.id === params.id);
                if (accountOwnershipInfo === undefined) {
                    throw new Error('Account not found');
                }

                const account = <cinerinoapi.factory.account.IAccount>accountOwnershipInfo.typeOfGood;
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
                await LINE.pushMessage(this.user.userId, [flex]);
                break;

            default:
                throw new Error(`Unknown goodType ${params.goodType}`);
        }
    }

    /**
     * 注文を検索する
     */
    public async searchOrders(params: {
        replyToken: string;
    }) {
        const now = new Date();
        await LINE.replyMessage(params.replyToken, { type: 'text', text: `ここ一カ月の注文を検索しています...` });
        const personService = new cinerinoapi.service.Person({
            endpoint: <string>process.env.CINERINO_ENDPOINT,
            auth: this.user.authClient,
            project: { id: this.project?.id }
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
        if (searchOrdersResult.data.length === 0) {
            await LINE.pushMessage(this.user.userId, { type: 'text', text: '注文が見つかりませんでした' });
        } else {
            await LINE.pushMessage(this.user.userId, { type: 'text', text: '注文が見つかりました' });
            await LINE.pushMessage(this.user.userId, { type: 'text', text: `直近の${orders.length}件は以下の通りです` });
            const contents: FlexBubble[] = orders.map<FlexBubble>((order) => {
                return order2flexBubble({ order });
            });
            const flex: FlexMessage = {
                type: 'flex',
                altText: 'This is a Flex Message',
                contents: {
                    type: 'carousel',
                    contents: contents
                }
            };
            await LINE.pushMessage(this.user.userId, [flex]);
        }
    }

    /**
     * 注文照会
     */
    public async findOrderByConfirmationNumber(params: {
        replyToken: string;
        confirmationNumber: number;
        telephone: string;
    }) {
        await LINE.replyMessage(params.replyToken, { type: 'text', text: `${params.confirmationNumber}で注文を検索しています...` });
        const orderService = new cinerinoapi.service.Order({
            endpoint: <string>process.env.CINERINO_ENDPOINT,
            auth: this.user.authClient,
            project: { id: this.project?.id }
        });
        let order: cinerinoapi.factory.order.IOrder | undefined;
        const orders = await orderService.findByConfirmationNumber({
            confirmationNumber: String(params.confirmationNumber),
            customer: {
                telephone: params.telephone
            }
        });
        if (Array.isArray(orders)) {
            order = orders[0];
        }
        if (order === undefined) {
            await LINE.pushMessage(this.user.userId, { type: 'text', text: '注文が見つかりませんでした' });

            return;
        }

        await LINE.pushMessage(this.user.userId, { type: 'text', text: '注文が見つかりました' });
        const contents: FlexBubble[] = [order2flexBubble({ order })];
        const flex: FlexMessage = {
            type: 'flex',
            altText: 'This is a Flex Message',
            contents: {
                type: 'carousel',
                contents: contents
            }
        };
        await LINE.pushMessage(this.user.userId, [flex]);

        // 発券メッセージ
        const message: TextMessage = {
            type: 'text',
            text: '下記対応が可能です',
            quickReply: {
                items: [
                    {
                        type: 'action',
                        imageUrl: `https://${this.user.host}/img/labels/qr-code-48.png`,
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
        await LINE.pushMessage(this.user.userId, [message]);
    }

    /**
     * 注文発券
     */
    // tslint:disable-next-line:max-func-body-length
    public async authorizeOwnershipInfosByOrder(params: {
        replyToken: string;
        orderNumber: string;
        telephone: string;
    }) {
        await LINE.replyMessage(params.replyToken, { type: 'text', text: `${params.orderNumber}に対して発券処理を実行します...` });
        await LINE.pushMessage(this.user.userId, { type: 'text', text: 'implementing...' });
        // const eventService = new cinerinoapi.service.Event({
        //     endpoint: <string>process.env.CINERINO_ENDPOINT,
        //     auth: this.user.authClient,
        //     project: { id: this.project?.id }
        // });
        // const orderService = new cinerinoapi.service.Order({
        //     endpoint: <string>process.env.CINERINO_ENDPOINT,
        //     auth: this.user.authClient,
        //     project: { id: this.project?.id }
        // });
        // const order = await orderService.authorizeOwnershipInfos({
        //     orderNumber: <any>params.orderNumber,
        //     customer: {
        //         telephone: params.telephone
        //     }
        // });
        // await LINE.pushMessage(this.user.userId, { type: 'text', text: 'コードが発行されました' });
        // const reservations = <cinerinoapi.factory.order.IReservation[]>order.acceptedOffers
        //     .filter((o) => o.itemOffered.typeOf === cinerinoapi.factory.chevre.reservationType.EventReservation)
        //     .map((o) => o.itemOffered);
        // const event = await eventService.findById<cinerinoapi.factory.chevre.eventType.ScreeningEvent>({
        //     id: reservations[0].reservationFor.id
        // });
        // const flex = reservations2Ticket({ reservations, event });
        // await LINE.pushMessage(this.user.userId, [flex]);
    }

    /**
     * 予約コード読み込み
     */
    // tslint:disable-next-line:max-func-body-length
    public async findScreeningEventReservationById(params: {
        replyToken: string;
        code: string;
    }) {
        await LINE.replyMessage(params.replyToken, { type: 'text', text: 'コードを読み込んでいます...' });
        // const ownershipInfoService = new cinerinoapi.service.OwnershipInfo({
        //     endpoint: <string>process.env.CINERINO_ENDPOINT,
        //     auth: this.user.authClient,
        //     project: { id: this.project?.id }
        // });
        // const reservationService = new cinerinoapi.service.Reservation({
        //     endpoint: <string>process.env.CINERINO_ENDPOINT,
        //     auth: this.user.authClient,
        //     project: { id: this.project?.id }
        // });
        // const eventService = new cinerinoapi.service.Event({
        //     endpoint: <string>process.env.CINERINO_ENDPOINT,
        //     auth: this.user.authClient,
        //     project: { id: this.project?.id }
        // });
        try {
            await LINE.pushMessage(this.user.userId, { type: 'text', text: 'implementing...' });
            // const { token } = await ownershipInfoService.getToken({ code: params.code });
            // const ownershipInfo = await reservationService.findScreeningEventReservationByToken({ token: token });
            // await LINE.pushMessage(this.user.userId, { type: 'text', text: '予約が見つかりました' });
            // const reservation = ownershipInfo.typeOfGood;
            // const event = await eventService.findById<cinerinoapi.factory.chevre.eventType.ScreeningEvent>({
            //     id: reservation.reservationFor.id
            // });
            // const flex = reservation2Ticket({ reservation, event });
            // await LINE.pushMessage(this.user.userId, [flex]);
        } catch (error) {
            await LINE.pushMessage(this.user.userId, { type: 'text', text: `Invalid code ${error.message}` });
        }
    }

    /**
     * プロフィール検索
     */
    public async getProfile(params: {
        replyToken: string;
    }) {
        await LINE.replyMessage(params.replyToken, { type: 'text', text: `プロフィールを検索しています...` });
        const personService = new cinerinoapi.service.Person({
            endpoint: <string>process.env.CINERINO_ENDPOINT,
            auth: this.user.authClient,
            project: { id: this.project?.id }
        });
        const profile = await personService.getProfile({});
        await LINE.pushMessage(this.user.userId, { type: 'text', text: 'プロフィールが見つかりました' });
        const contents: FlexBubble[] = [profile2bubble(profile)];
        const flex: FlexMessage = {
            type: 'flex',
            altText: 'This is a Flex Message',
            contents: {
                type: 'carousel',
                contents: contents
            }
        };
        await LINE.pushMessage(this.user.userId, [flex]);
    }

    /**
     * プロフィール更新
     */
    public async updateProfile(params: {
        replyToken: string;
        profile: cinerinoapi.factory.person.IProfile;
    }) {
        const personService = new cinerinoapi.service.Person({
            endpoint: <string>process.env.CINERINO_ENDPOINT,
            auth: this.user.authClient,
            project: { id: this.project?.id }
        });
        await LINE.replyMessage(params.replyToken, { type: 'text', text: `プロフィールを更新しています...` });
        await personService.updateProfile({ ...params.profile });
        await LINE.pushMessage(this.user.userId, { type: 'text', text: 'プロフィールを更新しました' });
        const contents: FlexBubble[] = [profile2bubble(params.profile)];
        const flex: FlexMessage = {
            type: 'flex',
            altText: 'This is a Flex Message',
            contents: {
                type: 'carousel',
                contents: contents
            }
        };
        await LINE.pushMessage(this.user.userId, [flex]);
    }

    /**
     * 日付選択を求める
     */
    public async askEventStartDate(params: {
        replyToken: string;
        text?: string;
    }) {
        const message: TextMessage = {
            type: 'text',
            text: (typeof params.text === 'string' && params.text.length > 0) ? params.text : 'イベント日を選択してください',
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
                                date: moment()
                                    .add(0, 'days')
                                    .format('YYYY-MM-DD')
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
                                date: moment()
                                    .add(1, 'days')
                                    .format('YYYY-MM-DD')
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
                                date: moment()
                                    // tslint:disable-next-line:no-magic-numbers
                                    .add(2, 'days')
                                    .format('YYYY-MM-DD')
                            })
                        }
                    },
                    {
                        type: 'action',
                        imageUrl: `https://${this.user.host}/img/labels/calender-48.png`,
                        action: {
                            type: 'datetimepicker',
                            label: '選ぶ',
                            mode: 'date',
                            data: 'action=searchEventsByDate',
                            initial: moment()
                                .add(1, 'days')
                                .format('YYYY-MM-DD'),
                            max: moment()
                                // tslint:disable-next-line:no-magic-numbers
                                .add(6, 'months')
                                .format('YYYY-MM-DD'),
                            min: moment()
                                .add(1, 'days')
                                .format('YYYY-MM-DD')
                        }
                    }
                ]
            }
        };
        await LINE.pushMessage(this.user.userId, [message]);
    }
}
