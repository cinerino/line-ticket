/**
 * LINE Webhook messageコントローラー
 */
import * as cinerinoapi from '@cinerino/api-nodejs-client';
import * as createDebug from 'debug';
import * as moment from 'moment';
import * as querystring from 'querystring';

import LINE from '../../../lineClient';
import User from '../../user';

const debug = createDebug('cinerino-line-ticket:*');

/**
 * 使い方を送信する
 */
export async function pushHowToUse(replyToken: string) {
    await LINE.replyMessage(replyToken, [
        {
            type: 'template',
            altText: 'How to use',
            template: {
                type: 'buttons',
                title: '何をしますか？',
                text: '画面下部メニューから操作することもできます',
                actions: [
                    {
                        type: 'message',
                        label: '座席予約管理',
                        text: '座席予約'
                    },
                    {
                        type: 'message',
                        label: 'クレジットカード管理',
                        text: 'クレジットカード'
                    },
                    {
                        type: 'message',
                        label: 'コイン口座管理',
                        text: 'コイン'
                    },
                    {
                        type: 'message',
                        label: 'おこづかいをもらう',
                        text: 'おこづかい'
                    }
                    // {
                    //     type: 'message',
                    //     label: '顔を登録する',
                    //     text: '顔写真登録'
                    // }
                ]
            }
        }
    ]);
}
/**
 * 座席予約メニューを表示する
 */
export async function showSeatReservationMenu(replyToken: string) {
    await LINE.replyMessage(replyToken, [
        {
            type: 'template',
            altText: '座席予約メニュー',
            template: {
                type: 'buttons',
                title: '座席予約',
                text: 'ご用件はなんでしょう？',
                actions: [
                    {
                        type: 'postback',
                        label: '座席を予約する',
                        data: `action=askEventStartDate`
                    },
                    {
                        type: 'postback',
                        label: '予約を確認する',
                        data: `action=searchScreeningEventReservations`
                    }
                ]
            }
        }
    ]);
}
export async function showCreditCardMenu(replyToken: string) {
    const inputCreditCardUri = '/transactions/inputCreditCard?gmoShopId=tshop00026096';
    await LINE.replyMessage(replyToken, [
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
                        label: 'クレジットカード追加',
                        uri: `line://app/${process.env.LIFF_ID}?${querystring.stringify({ cb: inputCreditCardUri })}`
                    },
                    {
                        type: 'postback',
                        label: 'クレジットカード検索',
                        data: `action=searchCreditCards`
                    }
                ]
            }
        }
    ]);
}
export async function showCoinAccountMenu(replyToken: string, user: User) {
    const openAccountUri = `https://${user.host}/accounts/open?accountType=${cinerinoapi.factory.accountType.Coin}`;
    const liffUri = `line://app/${process.env.LIFF_ID}?${querystring.stringify({ cb: openAccountUri })}`;
    await LINE.replyMessage(replyToken, [
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
                        label: '口座開設',
                        uri: liffUri
                    },
                    {
                        type: 'postback',
                        label: '口座検索',
                        data: 'action=searchCoinAccounts'
                    }
                ]
            }
        }
    ]);
}
/**
 * 顔写真登録を開始する
 */
export async function startIndexingFace(replyToken: string) {
    await LINE.replyMessage(replyToken, { type: 'text', text: '顔写真を送信してください' });
}

/**
 * 友達決済承認確認
 */
export async function askConfirmationOfFriendPay(replyToken: string, token: string) {
    await LINE.replyMessage(replyToken, [
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
                        data: `action=confirmFriendPay&token=${token}`
                    },
                    {
                        type: 'postback',
                        label: 'No',
                        data: `action=rejectFriendPay&token=${token}`
                    }
                ]
            }
        }
    ]);
}

/**
 * おこづかい承認確認
 */
export async function askConfirmationOfTransferMoney(replyToken: string, user: User, transferMoneyToken: string) {
    const transferMoneyInfo = await user.verifyTransferMoneyToken(transferMoneyToken);
    await LINE.replyMessage(replyToken, [
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
                        data: `action=confirmTransferMoney&token=${transferMoneyToken}&price=10`
                    },
                    {
                        type: 'postback',
                        label: '100円あげる',
                        data: `action=confirmTransferMoney&token=${transferMoneyToken}&price=100`
                    },
                    {
                        type: 'postback',
                        label: '1000円あげる',
                        data: `action=confirmTransferMoney&token=${transferMoneyToken}&price=1000`
                    },
                    {
                        type: 'postback',
                        label: 'あげない',
                        data: `action=rejectTransferMoney&token=${transferMoneyToken}`
                    }
                ]
            }
        }
    ]);
}

/**
 * 誰からお金をもらうか選択する
 */
export async function selectWhomAskForMoney(replyToken: string, user: User) {
    const LINE_ID = process.env.LINE_ID;
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
    const contact = await personService.getContacts({ personId: 'me' });

    const token = await user.signTransferMoneyInfo({
        userId: user.userId,
        accountNumber: account.accountNumber,
        name: `${contact.familyName} ${contact.givenName}`
    });
    const friendMessage = `TransferMoneyToken.${token}`;
    const message = encodeURIComponent(`おこづかいちょーだい！
よければ下のリンクを押してそのままメッセージを送信してね
line://oaMessage/${LINE_ID}/?${friendMessage}`);
    await LINE.replyMessage(replyToken, [
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
export async function pushButtonsReserveNumOrTel(replyToken: string, userId: string, message: string) {
    debug(userId, message);
    const datas = message.split('-');
    const theater = datas[0];
    const reserveNumOrTel = datas[1];

    // キュー実行のボタン表示
    await LINE.replyMessage(replyToken, [
        {
            type: 'template',
            altText: 'aaa',
            template: {
                type: 'buttons',
                text: 'どちらで検索する？',
                actions: [
                    {
                        type: 'postback',
                        label: '予約番号',
                        data: `action=searchTransactionByReserveNum&theater=${theater}&reserveNum=${reserveNumOrTel}`
                    },
                    {
                        type: 'postback',
                        label: '電話番号',
                        data: `action=searchTransactionByTel&theater=${theater}&tel=${reserveNumOrTel}`
                    }
                ]
            }
        }
    ]);
}

/**
 * 予約のイベント日選択を求める
 */
export async function askReservationEventDate(replyToken: string, paymentNo: string) {
    await LINE.replyMessage(replyToken, [
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
                        data: `action=searchTransactionByPaymentNo&paymentNo=${paymentNo}`,
                        initial: moment().format('YYYY-MM-DD')
                    }
                ]
            }
        }
    ]);
}
/**
 * 日付選択を求める
 */
export async function askEventStartDate(replyToken: string) {
    await LINE.replyMessage(replyToken, [
        {
            type: 'text', // ①
            text: '上映日を選択してください',
            quickReply: { // ②
                items: [
                    {
                        type: 'action', // ③
                        // imageUrl: `https://${user.host}/img/labels/coin-64.png`,
                        action: {
                            type: 'postback',
                            label: '今日',
                            data: querystring.stringify({
                                action: 'searchEventsByDate',
                                date: moment().add(0, 'days').format('YYYY-MM-DD')
                            })
                        }
                    },
                    {
                        type: 'action', // ③
                        // imageUrl: `https://${user.host}/img/labels/friend-pay-64.png`,
                        action: {
                            type: 'postback',
                            label: '明日',
                            data: querystring.stringify({
                                action: 'searchEventsByDate',
                                date: moment().add(1, 'days').format('YYYY-MM-DD')
                            })
                        }
                    }
                    // {
                    //     type: 'datetimepicker',
                    //     label: '日付選択',
                    //     mode: 'date',
                    //     data: 'action=searchEventsByDate',
                    //     initial: moment().add(1, 'days').format('YYYY-MM-DD'),
                    //     // tslint:disable-next-line:no-magic-numbers
                    //     max: moment().add(2, 'days').format('YYYY-MM-DD'),
                    //     min: moment().add(1, 'days').format('YYYY-MM-DD')
                    // }
                ]
            }
        }
    ]);
}
/**
 * 日付選択を求める
 */
export async function askFromWhenAndToWhen(replyToken: string) {
    await LINE.replyMessage(replyToken, [
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
                        initial: moment().format('YYYY-MM-DD')
                    }
                ]
            }
        }
    ]);
}

export async function logout(replyToken: string, user: User) {
    const logoutUri = `https://${user.host}/logout?userId=${user.userId}`;
    const liffUri = `line://app/${process.env.LIFF_ID}?${querystring.stringify({ cb: logoutUri })}`;
    await LINE.replyMessage(replyToken, [
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
