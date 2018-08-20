/**
 * LINE webhookコントローラー
 */
import * as createDebug from 'debug';
import * as querystring from 'querystring';

import * as LINE from '../../line';
import User from '../user';
import * as MessageController from './webhook/message';
import * as ImageMessageController from './webhook/message/image';
import * as PostbackController from './webhook/postback';

const debug = createDebug('cinerino-line-ticket:*');

/**
 * メッセージが送信されたことを示すEvent Objectです。
 */
// tslint:disable-next-line:max-func-body-length
export async function message(event: LINE.IWebhookEvent, user: User) {
    const userId = event.source.userId;

    try {
        if (event.message === undefined) {
            throw new Error('event.message not found.');
        }

        switch (event.message.type) {
            case LINE.MessageType.text:
                const messageText = <string>event.message.text;

                switch (true) {
                    // [購入番号]で検索
                    case /^\d{6}$/.test(messageText):
                        await MessageController.askReservationEventDate(userId, messageText);
                        break;

                    // ログアウト
                    case /^logout$/.test(messageText):
                        await MessageController.logout(user);
                        break;

                    case /^座席予約$/.test(messageText):
                        await MessageController.showSeatReservationMenu(user);
                        break;

                    case /^クレジットカード$/.test(messageText):
                        await MessageController.showCreditCardMenu(user);
                        break;

                    case /^コイン$/.test(messageText):
                        await MessageController.showCoinAccountMenu(user);
                        break;

                    // 顔写真登録
                    case /^顔写真登録$/.test(messageText):
                        await MessageController.startIndexingFace(userId);
                        break;

                    // 友達決済承認ワンタイムメッセージ
                    case /^FriendPayToken/.test(messageText):
                        const token = messageText.replace('FriendPayToken.', '');
                        await MessageController.askConfirmationOfFriendPay(user, token);
                        break;

                    // おこづかいをもらう
                    case /^おこづかい$/.test(messageText):
                        await MessageController.selectWhomAskForMoney(user);
                        break;

                    // おこづかい承認メッセージ
                    case /^TransferMoneyToken/.test(messageText):
                        const transferMoneyToken = messageText.replace('TransferMoneyToken.', '');
                        await MessageController.askConfirmationOfTransferMoney(user, transferMoneyToken);
                        break;

                    // メッセージで強制的にpostbackイベントを発動
                    case /^postback:/.test(messageText):
                        const postbackData = messageText.replace('postback:', '');
                        const postbackEvent: LINE.IWebhookEvent = {
                            type: 'postback',
                            timestamp: event.timestamp,
                            source: event.source,
                            message: event.message,
                            postback: { data: postbackData }
                        };
                        await postback(postbackEvent, user);
                        break;

                    default:
                        // 予約照会方法をアドバイス
                        await MessageController.pushHowToUse(userId);
                }

                break;

            case LINE.MessageType.image:
                await ImageMessageController.indexFace(user, event.message.id);

                break;

            default:
                throw new Error(`Unknown message type ${event.message.type}`);
        }
    } catch (error) {
        // エラーメッセージ表示
        await LINE.pushMessage(userId, error.toString());
    }
}

/**
 * イベントの送信元が、template messageに付加されたポストバックアクションを実行したことを示すevent objectです。
 */
// tslint:disable-next-line:cyclomatic-complexity max-func-body-length
export async function postback(event: LINE.IWebhookEvent, user: User) {
    const data = querystring.parse(event.postback.data);
    debug('data:', data);
    const userId = event.source.userId;

    try {
        switch (data.action) {
            // イベント検索
            case 'searchEventsByDate':
                const date = (data.date !== undefined) ? <string>data.date : <string>event.postback.params.date;
                await PostbackController.searchEventsByDate(user, date);
                break;

            case 'askScreeningEvent':
                await PostbackController.askScreeningEvent({
                    user: user,
                    screeningEventSeriesId: <string>data.screeningEventSeriesId,
                    date: <string>data.date
                });
                break;

            // 決済コードをたずねる
            case 'askPaymentCode':
                await PostbackController.askPaymentCode({
                    user: user,
                    transactionId: <string>data.transactionId
                });
                break;

            // 決済方法選択
            case 'selectPaymentMethodType':
                await PostbackController.selectPaymentMethodType({
                    user: user,
                    paymentMethodType: <PostbackController.PaymentMethodType>data.paymentMethod,
                    transactionId: <string>data.transactionId,
                    code: <string>data.code
                });
                break;

            // 注文確定
            case 'confirmOrder':
                await PostbackController.confirmOrder(user, <string>data.transactionId);
                break;

            // 友達決済承認確定
            case 'confirmFriendPay':
                await PostbackController.confirmFriendPay(user, <string>data.token);
                break;

            // おこづかい承認確定
            case 'confirmTransferMoney':
                await PostbackController.confirmTransferMoney(
                    user, <string>data.token, parseInt(<string>data.price, 10));
                break;

            // 友達決済承認確定
            // case 'continueTransactionAfterFriendPayConfirmation':
            //     await PostbackController.selectPaymentMethodType(
            //         user, 'FriendPay', <string>data.transactionId, parseInt(<string>data.price, 10));
            //     break;

            // クレジットカード検索
            case 'searchCreditCards':
                await PostbackController.searchCreditCards(user);
                break;

            // クレジットカード追加
            case 'addCreditCard':
                await PostbackController.addCreditCard(user, <string>data.token);
                break;

            // クレジットカード削除
            case 'deleteCreditCard':
                await PostbackController.deleteCreditCard(user, <string>data.cardSeq);
                break;

            // 口座開設
            case 'openAccount':
                await PostbackController.openAccount({
                    user: user,
                    name: <string>data.name,
                    accountType: <any>data.accountType
                });
                break;

            // 口座解約
            case 'closeAccount':
                await PostbackController.closeAccount({
                    user: user,
                    accountType: <any>data.accountType,
                    accountNumber: <string>data.accountNumber
                });
                break;

            // コイン口座検索
            case 'searchCoinAccounts':
                await PostbackController.searchCoinAccounts(user);
                break;

            case 'searchAccountMoneyTransferActions':
                await PostbackController.searchAccountMoneyTransferActions({
                    user: user,
                    accountType: <any>data.accountType,
                    accountNumber: <string>data.accountNumber
                });
                break;

            // 口座入金金額選択
            case 'selectDepositAmount':
                await PostbackController.selectDepositAmount({
                    user: user,
                    accountType: <any>data.accountType,
                    accountNumber: <string>data.accountNumber
                });
                break;

            // 口座入金金額選択
            case 'depositCoinByCreditCard':
                await PostbackController.depositCoinByCreditCard({
                    user: user,
                    amount: Number(<string>data.amount),
                    accountType: <any>data.accountType,
                    toAccountNumber: <string>data.toAccountNumber
                });
                break;

            case 'askEventStartDate':
                await MessageController.askEventStartDate(user.userId);
                break;

            case 'searchScreeningEventReservations':
                await PostbackController.searchScreeningEventReservations(user);
                break;

            // 座席選択
            case 'selectSeatOffers':
                const seatNumbers = (<string>data.seatNumbers).split(',');
                await PostbackController.selectSeatOffers({
                    user: user,
                    eventId: <string>data.eventId,
                    seatNumbers: seatNumbers
                });
                break;

            // 所有権コード発行
            case 'authorizeOwnershipInfo':
                await PostbackController.authorizeOwnershipInfo({
                    user: user,
                    goodType: <any>data.goodType,
                    identifier: <string>data.identifier
                });
                break;

            default:
        }
    } catch (error) {
        console.error(error);
        // エラーメッセージ表示
        await LINE.pushMessage(userId, error.toString());
    }
}

/**
 * イベント送信元に友だち追加（またはブロック解除）されたことを示すEvent Objectです。
 */
export async function follow(event: LINE.IWebhookEvent) {
    debug('event is', event);
}

/**
 * イベント送信元にブロックされたことを示すevent objectです。
 */
export async function unfollow(event: LINE.IWebhookEvent) {
    debug('event is', event);
}

/**
 * イベントの送信元グループまたはトークルームに参加したことを示すevent objectです。
 */
export async function join(event: LINE.IWebhookEvent) {
    debug('event is', event);
}

/**
 * イベントの送信元グループから退出させられたことを示すevent objectです。
 */
export async function leave(event: LINE.IWebhookEvent) {
    debug('event is', event);
}

/**
 * イベント送信元のユーザがLINE Beaconデバイスの受信圏内に出入りしたことなどを表すイベントです。
 */
export async function beacon(event: LINE.IWebhookEvent) {
    debug('event is', event);
}
