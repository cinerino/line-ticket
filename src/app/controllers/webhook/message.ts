import * as cinerinoapi from '@cinerino/api-nodejs-client';
import { Action, QuickReplyItem, TextMessage } from '@line/bot-sdk';
import * as createDebug from 'debug';
import { Request } from 'express';
import * as moment from 'moment';
import * as qs from 'qs';

import LINE from '../../../lineClient';
import User from '../../user';

const debug = createDebug('cinerino-line-ticket:controllers');

/**
 * メッセージウェブフックコントローラ
 */
export class MessageWebhookController {
    private readonly project?: { id: string };
    private readonly user: User;

    constructor(req: Request) {
        this.project = req.project;
        this.user = req.user;
    }

    /**
     * 使い方を送信する
     */
    // tslint:disable-next-line:max-func-body-length
    public async pushHowToUse(params: {
        replyToken: string;
    }) {
        const quickReplyItems: QuickReplyItem[] = [];

        quickReplyItems.push(
            {
                type: 'action',
                imageUrl: `https://${this.user.host}/img/labels/project-96.png`,
                action: {
                    type: 'postback',
                    label: 'プロジェクト変更',
                    data: qs.stringify({
                        action: 'selectProject'
                    })
                }
            },
            {
                type: 'action',
                imageUrl: `https://${this.user.host}/img/labels/reservation-ticket.png`,
                action: {
                    type: 'message',
                    label: '予約管理',
                    text: '予約'
                }
            },
            {
                type: 'action',
                imageUrl: `https://${this.user.host}/img/labels/order-96.png`,
                action: {
                    type: 'message',
                    label: '注文管理',
                    text: '注文'
                }
            },
            {
                type: 'action',
                imageUrl: `https://${this.user.host}/img/labels/qr-code-48.png`,
                action: {
                    type: 'message',
                    label: 'コード管理',
                    text: 'コード'
                }
            }
        );

        if (await this.user.getCredentials() !== undefined) {
            quickReplyItems.push(
                {
                    type: 'action',
                    imageUrl: `https://${this.user.host}/img/labels/credit-card-64.png`,
                    action: {
                        type: 'message',
                        label: 'クレジットカード管理',
                        text: 'クレジットカード'
                    }
                },
                {
                    type: 'action',
                    imageUrl: `https://${this.user.host}/img/labels/coin-64.png`,
                    action: {
                        type: 'message',
                        label: 'プリペイドカード管理',
                        text: 'プリペイドカード'
                    }
                },
                {
                    type: 'action',
                    imageUrl: `https://${this.user.host}/img/labels/friend-pay-50.png`,
                    action: {
                        type: 'message',
                        label: 'おこづかいをもらう',
                        text: 'おこづかい'
                    }
                },
                {
                    type: 'action',
                    imageUrl: `https://${this.user.host}/img/labels/profile-96.png`,
                    action: {
                        type: 'message',
                        label: 'プロフィール管理',
                        text: 'プロフィール'
                    }
                },
                {
                    type: 'action',
                    imageUrl: `https://${this.user.host}/img/labels/login-96.png`,
                    action: {
                        type: 'message',
                        label: 'ログアウト',
                        text: 'logout'
                    }
                }
            );
        } else {
            quickReplyItems.push(
                {
                    type: 'action',
                    imageUrl: `https://${this.user.host}/img/labels/login-96.png`,
                    action: {
                        type: 'message',
                        label: 'ログイン',
                        text: 'login'
                    }
                }
            );
        }

        const message: TextMessage = {
            type: 'text',
            text: 'ご用件はなんでしょう？',
            quickReply: {
                items: quickReplyItems
            }
        };
        await LINE.replyMessage(params.replyToken, [message]);
    }

    /**
     * プロフィールメニューを表示する
     */
    public async showProfileMenu(params: {
        replyToken: string;
    }) {
        if (await this.user.getCredentials() === undefined) {
            throw new Error('Login required');
        }

        const personService = new cinerinoapi.service.Person({
            endpoint: <string>process.env.CINERINO_ENDPOINT,
            auth: this.user.authClient,
            project: { id: this.project?.id }
        });

        let profile: cinerinoapi.factory.person.IProfile | undefined;

        try {
            profile = await personService.getProfile({});
            debug('profile:', profile);
        } catch (error) {
            await LINE.pushMessage(this.user.userId, { type: 'text', text: `プロフィールを取得できませんでした ${error.message}` });
        }

        // const updateProfileQuery = qs.stringify({ profile: profile });
        const updateProfileQuery = qs.stringify({});
        const updateProfileUri = `https://${this.user.host}/projects/${this.project?.id}/people/me/profile?${updateProfileQuery}`;
        // const updateProfileUri = `https://${this.user.host}/people/me/profile`;
        const liffUri = `line://app/${process.env.LIFF_ID}?${qs.stringify({ cb: updateProfileUri })}`;
        debug(liffUri);

        const actions: Action[] = [];
        actions.push(
            {
                type: 'postback',
                label: 'プロフィール確認',
                data: `action=getProfile`
            },
            {
                type: 'uri',
                label: '変更する',
                uri: liffUri
            }
        );

        await LINE.replyMessage(params.replyToken, [
            {
                type: 'template',
                altText: 'プロフィールメニュー',
                template: {
                    type: 'buttons',
                    title: 'プロフィール管理',
                    text: 'ご用件はなんでしょう？',
                    actions: actions
                }
            }
        ]);
    }

    /**
     * 予約メニューを表示する
     */
    public async showSeatReservationMenu(params: {
        replyToken: string;
    }) {
        const actions: Action[] = [{
            type: 'postback',
            label: '予約する',
            data: `action=askEventStartDate`
        }];
        if (await this.user.getCredentials() !== undefined) {
            actions.push({
                type: 'postback',
                label: 'My予約',
                data: `action=searchScreeningEventReservations`
            });
        }
        await LINE.replyMessage(params.replyToken, [
            {
                type: 'template',
                altText: '予約メニュー',
                template: {
                    type: 'buttons',
                    title: '予約',
                    text: 'ご用件はなんでしょう？',
                    actions: actions
                }
            }
        ]);
    }

    /**
     * 注文メニューを表示する
     */
    public async showOrderMenu(params: {
        replyToken: string;
    }) {
        const findOrderUri = `https://${this.user.host}/projects/${this.project?.id}/orders/findByConfirmationNumber`;
        const liffUri = `line://app/${process.env.LIFF_ID}?${qs.stringify({ cb: findOrderUri })}`;
        const actions: Action[] = [
            {
                type: 'uri',
                label: '確認番号で照会',
                uri: liffUri
            }
        ];
        if (await this.user.getCredentials() !== undefined) {
            actions.push({
                type: 'postback',
                label: 'My注文',
                data: `action=searchOrders`
            });
        }
        await LINE.replyMessage(params.replyToken, [
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
    }

    public async showCreditCardMenu(params: {
        replyToken: string;
    }) {
        const sellerService = new cinerinoapi.service.Seller({
            endpoint: <string>process.env.CINERINO_ENDPOINT,
            auth: this.user.authClient,
            project: { id: this.project?.id }
        });
        const searchSellersResult = await sellerService.search({ limit: 1 });
        const seller = searchSellersResult.data[0];
        if (seller.paymentAccepted === undefined) {
            throw new Error('許可された決済方法が見つかりません');
        }
        const creditCardPayment = <cinerinoapi.factory.seller.IPaymentAccepted<cinerinoapi.factory.paymentMethodType.CreditCard>>
            seller.paymentAccepted.find((p) => p.paymentMethodType === cinerinoapi.factory.paymentMethodType.CreditCard);
        if (creditCardPayment === undefined) {
            throw new Error('クレジットカード決済が許可されていません');
        }
        const inputCreditCardUri = `/projects/${seller.project.id}/transactions/inputCreditCard?gmoShopId=${creditCardPayment.gmoInfo.shopId}`;
        await LINE.replyMessage(params.replyToken, [
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
                            label: '登録する',
                            uri: `line://app/${process.env.LIFF_ID}?${qs.stringify({ cb: inputCreditCardUri })}`
                        },
                        {
                            type: 'postback',
                            label: 'Myクレジットカード',
                            data: `action=searchCreditCards`
                        }
                    ]
                }
            }
        ]);
    }

    public async showCoinAccountMenu(params: {
        replyToken: string;
    }) {
        const openAccountUri = `https://${this.user.host}/projects/${this.project?.id}/accounts/open?accountType=${cinerinoapi.factory.paymentMethodType.PrepaidCard}`;
        const liffUri = `line://app/${process.env.LIFF_ID}?${qs.stringify({ cb: openAccountUri })}`;
        await LINE.replyMessage(params.replyToken, [
            {
                type: 'template',
                altText: 'プリペイドカード管理',
                template: {
                    type: 'buttons',
                    title: 'プリペイドカード管理',
                    text: 'ご用件はなんでしょう？',
                    actions: [
                        {
                            type: 'uri',
                            label: '開設する',
                            uri: liffUri
                        },
                        {
                            type: 'postback',
                            label: 'My口座',
                            data: 'action=searchCoinAccounts'
                        }
                    ]
                }
            }
        ]);
    }

    public async showCodeMenu(params: {
        replyToken: string;
    }) {
        const scanQRUri = `/projects/${this.project?.id}/reservations/scanScreeningEventReservationCode`;
        const liffUri = `line://app/${process.env.LIFF_ID}?${qs.stringify({ cb: scanQRUri })}`;
        const actions: Action[] = [
            {
                type: 'uri',
                label: '予約チケット読み込み',
                uri: liffUri
            }
        ];
        // if (await this.user.getCredentials() !== undefined) {
        // }
        await LINE.replyMessage(params.replyToken, [
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
    }

    /**
     * 顔写真登録を開始する
     */
    public async startIndexingFace(__: {
        replyToken: string;
    }) {
        await LINE.pushMessage(this.user.userId, { type: 'text', text: '顔写真を送信してください' });
    }

    /**
     * 友達決済承認確認
     */
    public async askConfirmationOfFriendPay(params: {
        replyToken: string;
        token: string;
    }) {
        await LINE.pushMessage(this.user.userId, [
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
    }

    /**
     * おこづかい承認確認
     */
    public async askConfirmationOfTransferMoney(params: {
        replyToken: string;
        transferMoneyToken: string;
    }) {
        const transferMoneyInfo = await this.user.verifyTransferMoneyToken(params.transferMoneyToken);
        await LINE.replyMessage(params.replyToken, [
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
    }

    /**
     * 誰からお金をもらうか選択する
     */
    public async selectWhomAskForMoney(params: {
        replyToken: string;
    }) {
        const LINE_ID = process.env.LINE_ID;
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
        const searchAccountsResult = await personOwnershipInfoService.search<cinerinoapi.factory.ownershipInfo.AccountGoodType.Account>({
            typeOfGood: {
                typeOf: cinerinoapi.factory.ownershipInfo.AccountGoodType.Account,
                accountType: cinerinoapi.factory.paymentMethodType.PrepaidCard
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
        const profile = await personService.getProfile({});

        const token = await this.user.signTransferMoneyInfo({
            userId: this.user.userId,
            accountNumber: account.accountNumber,
            name: `${profile.familyName} ${profile.givenName}`
        });
        const friendMessage = `TransferMoneyToken.${token}`;
        const message = encodeURIComponent(`おこづかいちょーだい！
よければ下のリンクを押してそのままメッセージを送信してね
line://oaMessage/${LINE_ID}/?${friendMessage}`);
        await LINE.replyMessage(params.replyToken, [
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
    }

    /**
     * 予約番号or電話番号のボタンを送信する
     */
    // public async pushButtonsReserveNumOrTel(params: {
    //     replyToken: string;
    //     message: string;
    // }) {
    //     const datas = params.message.split('-');
    //     const theater = datas[0];
    //     const reserveNumOrTel = datas[1];

    //     // キュー実行のボタン表示
    //     await LINE.replyMessage(params.replyToken, [
    //         {
    //             type: 'template',
    //             altText: 'aaa',
    //             template: {
    //                 type: 'buttons',
    //                 text: 'どちらで検索する？',
    //                 actions: [
    //                     {
    //                         type: 'postback',
    //                         label: '予約番号',
    //                         data: `action=searchTransactionByReserveNum&theater=${theater}&reserveNum=${reserveNumOrTel}`
    //                     },
    //                     {
    //                         type: 'postback',
    //                         label: '電話番号',
    //                         data: `action=searchTransactionByTel&theater=${theater}&tel=${reserveNumOrTel}`
    //                     }
    //                 ]
    //             }
    //         }
    //     ]);
    // }

    /**
     * 予約のイベント日選択を求める
     */
    public async askReservationEventDate(params: {
        replyToken: string;
        paymentNo: string;
    }) {
        await LINE.pushMessage(this.user.userId, [
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
                            initial: moment()
                                .format('YYYY-MM-DD')
                        }
                    ]
                }
            }
        ]);
    }

    /**
     * 日付選択を求める
     */
    public async askFromWhenAndToWhen(__: {
        replyToken: string;
    }) {
        await LINE.pushMessage(this.user.userId, [
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
                            initial: moment()
                                .format('YYYY-MM-DD')
                        }
                    ]
                }
            }
        ]);
    }

    public async logout(params: {
        replyToken: string;
    }) {
        const logoutUri = `https://${this.user.host}/logout?userId=${this.user.userId}`;
        const liffUri = `line://app/${process.env.LIFF_ID}?${qs.stringify({ cb: logoutUri })}`;
        await LINE.replyMessage(params.replyToken, [
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
    }

}
