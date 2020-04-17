/**
 * LINE Webhook messageコントローラー
 */
import * as cinerinoapi from '@cinerino/api-nodejs-client';
import { Action, QuickReplyItem, TextMessage } from '@line/bot-sdk';
import * as createDebug from 'debug';
import * as moment from 'moment';
import * as qs from 'qs';

import LINE from '../../../lineClient';
import User from '../../user';

const debug = createDebug('cinerino-line-ticket:controllers');

/**
 * 使い方を送信する
 */
// tslint:disable-next-line:max-func-body-length
export async function pushHowToUse(params: {
    replyToken: string;
    user: User;
}) {
    const quickReplyItems: QuickReplyItem[] = [];
    if (await params.user.getCredentials() !== undefined) {
        quickReplyItems.push(
            {
                type: 'action',
                imageUrl: `https://${params.user.host}/img/labels/reservation-ticket.png`,
                action: {
                    type: 'message',
                    label: '座席予約管理',
                    text: '座席予約'
                }
            },
            {
                type: 'action',
                imageUrl: `https://${params.user.host}/img/labels/credit-card-64.png`,
                action: {
                    type: 'message',
                    label: 'クレジットカード管理',
                    text: 'クレジットカード'
                }
            },
            {
                type: 'action',
                imageUrl: `https://${params.user.host}/img/labels/coin-64.png`,
                action: {
                    type: 'message',
                    label: 'コイン口座管理',
                    text: 'コイン'
                }
            },
            {
                type: 'action',
                imageUrl: `https://${params.user.host}/img/labels/order-96.png`,
                action: {
                    type: 'message',
                    label: '注文管理',
                    text: '注文'
                }
            },
            {
                type: 'action',
                imageUrl: `https://${params.user.host}/img/labels/qr-code-48.png`,
                action: {
                    type: 'message',
                    label: 'コード管理',
                    text: 'コード'
                }
            },
            {
                type: 'action',
                imageUrl: `https://${params.user.host}/img/labels/friend-pay-50.png`,
                action: {
                    type: 'message',
                    label: 'おこづかいをもらう',
                    text: 'おこづかい'
                }
            },
            {
                type: 'action',
                imageUrl: `https://${params.user.host}/img/labels/profile-96.png`,
                action: {
                    type: 'message',
                    label: 'プロフィール管理',
                    text: 'プロフィール'
                }
            },
            {
                type: 'action',
                imageUrl: `https://${params.user.host}/img/labels/login-96.png`,
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
                imageUrl: `https://${params.user.host}/img/labels/login-96.png`,
                action: {
                    type: 'message',
                    label: 'ログイン',
                    text: 'login'
                }
            },
            {
                type: 'action',
                imageUrl: `https://${params.user.host}/img/labels/reservation-ticket.png`,
                action: {
                    type: 'message',
                    label: '座席予約管理',
                    text: '座席予約'
                }
            },
            {
                type: 'action',
                imageUrl: `https://${params.user.host}/img/labels/order-96.png`,
                action: {
                    type: 'message',
                    label: '注文管理',
                    text: '注文'
                }
            },
            {
                type: 'action',
                imageUrl: `https://${params.user.host}/img/labels/qr-code-48.png`,
                action: {
                    type: 'message',
                    label: 'コード管理',
                    text: 'コード'
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
export async function showProfileMenu(params: {
    project: { id: string };
    replyToken: string;
    user: User;
}) {
    if (await params.user.getCredentials() === undefined) {
        throw new Error('Login required');
    }

    const personService = new cinerinoapi.service.Person({
        endpoint: <string>process.env.CINERINO_ENDPOINT,
        auth: params.user.authClient,
        project: { id: params.project.id }
    });

    let profile: cinerinoapi.factory.person.IProfile | undefined;

    try {
        profile = await personService.getProfile({});
        debug('profile:', profile);
    } catch (error) {
        await LINE.pushMessage(params.user.userId, { type: 'text', text: `プロフィールを取得できませんでした ${error.message}` });
    }

    // const updateProfileQuery = qs.stringify({ profile: profile });
    const updateProfileQuery = qs.stringify({});
    const updateProfileUri = `https://${params.user.host}/projects/${params.project.id}/people/me/profile?${updateProfileQuery}`;
    // const updateProfileUri = `https://${params.user.host}/people/me/profile`;
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
 * 座席予約メニューを表示する
 */
export async function showSeatReservationMenu(params: {
    replyToken: string;
    user: User;
}) {
    const actions: Action[] = [{
        type: 'postback',
        label: '座席を予約する',
        data: `action=askEventStartDate`
    }];
    if (await params.user.getCredentials() !== undefined) {
        actions.push({
            type: 'postback',
            label: 'My予約',
            data: `action=searchScreeningEventReservations`
        });
    }
    await LINE.replyMessage(params.replyToken, [
        {
            type: 'template',
            altText: '座席予約メニュー',
            template: {
                type: 'buttons',
                title: '座席予約',
                text: 'ご用件はなんでしょう？',
                actions: actions
            }
        }
    ]);
}

/**
 * 注文メニューを表示する
 */
export async function showOrderMenu(params: {
    replyToken: string;
    project: { id: string };
    user: User;
}) {
    const findOrderUri = `https://${params.user.host}/projects/${params.project.id}/orders/findByConfirmationNumber`;
    const liffUri = `line://app/${process.env.LIFF_ID}?${qs.stringify({ cb: findOrderUri })}`;
    const actions: Action[] = [
        {
            type: 'uri',
            label: '確認番号で照会',
            uri: liffUri
        }
    ];
    if (await params.user.getCredentials() !== undefined) {
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

export async function showCreditCardMenu(params: {
    project: { id: string };
    replyToken: string;
    user: User;
}) {
    const sellerService = new cinerinoapi.service.Seller({
        endpoint: <string>process.env.CINERINO_ENDPOINT,
        auth: params.user.authClient,
        project: { id: params.project.id }
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

export async function showCoinAccountMenu(params: {
    project: { id: string };
    replyToken: string;
    user: User;
}) {
    const openAccountUri = `https://${params.user.host}/projects/${params.project.id}/accounts/open?accountType=${cinerinoapi.factory.accountType.Coin}`;
    const liffUri = `line://app/${process.env.LIFF_ID}?${qs.stringify({ cb: openAccountUri })}`;
    await LINE.replyMessage(params.replyToken, [
        {
            type: 'template',
            altText: 'コイン口座管理',
            template: {
                type: 'buttons',
                title: 'コイン口座管理',
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

export async function showCodeMenu(params: {
    project: { id: string };
    replyToken: string;
    user: User;
}) {
    const scanQRUri = `/projects/${params.project.id}/reservations/scanScreeningEventReservationCode`;
    const liffUri = `line://app/${process.env.LIFF_ID}?${qs.stringify({ cb: scanQRUri })}`;
    const actions: Action[] = [
        {
            type: 'uri',
            label: '座席予約チケット読み込み',
            uri: liffUri
        }
    ];
    // if (await params.user.getCredentials() !== undefined) {
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
export async function startIndexingFace(params: {
    replyToken: string;
    user: User;
}) {
    await LINE.replyMessage(params.replyToken, { type: 'text', text: '顔写真を送信してください' });
}

/**
 * 友達決済承認確認
 */
export async function askConfirmationOfFriendPay(params: {
    replyToken: string;
    user: User;
    token: string;
}) {
    await LINE.replyMessage(params.replyToken, [
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
export async function askConfirmationOfTransferMoney(params: {
    replyToken: string;
    user: User;
    transferMoneyToken: string;
}) {
    const transferMoneyInfo = await params.user.verifyTransferMoneyToken(params.transferMoneyToken);
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
export async function selectWhomAskForMoney(params: {
    project: { id: string };
    replyToken: string;
    user: User;
}) {
    const LINE_ID = process.env.LINE_ID;
    const personService = new cinerinoapi.service.Person({
        endpoint: <string>process.env.CINERINO_ENDPOINT,
        auth: params.user.authClient,
        project: { id: params.project.id }
    });
    const personOwnershipInfoService = new cinerinoapi.service.person.OwnershipInfo({
        endpoint: <string>process.env.CINERINO_ENDPOINT,
        auth: params.user.authClient,
        project: { id: params.project.id }
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
    debug('accounts:', accounts);
    if (accounts.length === 0) {
        throw new Error('口座未開設です');
    }
    const account = accounts[0];
    const profile = await personService.getProfile({});

    const token = await params.user.signTransferMoneyInfo({
        userId: params.user.userId,
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
// export async function pushButtonsReserveNumOrTel(params: {
//     replyToken: string;
//     user: User;
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
export async function askReservationEventDate(params: {
    replyToken: string;
    user: User;
    paymentNo: string;
}) {
    await LINE.replyMessage(params.replyToken, [
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
export async function askEventStartDate(params: {
    replyToken: string;
    user: User;
}) {
    const message: TextMessage = {
        type: 'text',
        text: 'イベント日を選択してください',
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
                    imageUrl: `https://${params.user.host}/img/labels/calender-48.png`,
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
    await LINE.replyMessage(params.replyToken, [message]);
}

/**
 * 日付選択を求める
 */
export async function askFromWhenAndToWhen(params: {
    replyToken: string;
    user: User;
}) {
    await LINE.replyMessage(params.replyToken, [
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

export async function logout(params: {
    replyToken: string;
    user: User;
}) {
    const logoutUri = `https://${params.user.host}/logout?userId=${params.user.userId}`;
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
