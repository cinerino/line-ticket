/**
 * LINE Webhookコントローラー
 */
import * as line from '@line/bot-sdk';
import * as createDebug from 'debug';
import * as querystring from 'qs';

import LINE from '../../lineClient';
import User from '../user';
import * as MessageController from './webhook/message';
import * as ImageMessageController from './webhook/message/image';
import * as PostbackController from './webhook/postback';

import * as authentication from '../middlewares/authentication';

const debug = createDebug('cinerino-line-ticket:controllers');

/**
 * メッセージが送信されたことを示すEvent Objectです
 */
// tslint:disable-next-line:max-func-body-length
export async function message(event: line.MessageEvent, user: User) {
    // const userId = <string>event.source.userId;
    try {
        switch (event.message.type) {
            case 'text':
                const messageText = event.message.text;
                switch (true) {
                    // [購入番号]で検索
                    case /^\d{6}$/.test(messageText):
                        await MessageController.askReservationEventDate(event.replyToken, messageText);
                        break;
                    // ログイン
                    case /^login$/.test(messageText):
                        await authentication.sendLoginButton(user);
                        break;
                    // ログアウト
                    case /^logout$/.test(messageText):
                        await MessageController.logout(event.replyToken, user);
                        break;
                    case /^座席予約$/.test(messageText):
                        await MessageController.showSeatReservationMenu(event.replyToken);
                        break;
                    case /^注文$/.test(messageText):
                        await MessageController.showOrderMenu({
                            replyToken: event.replyToken,
                            user: user
                        });
                        break;
                    case /^クレジットカード$/.test(messageText):
                        await MessageController.showCreditCardMenu({
                            replyToken: event.replyToken,
                            user: user
                        });
                        break;
                    case /^コイン$/.test(messageText):
                        await MessageController.showCoinAccountMenu(event.replyToken, user);
                        break;
                    case /^コード$/.test(messageText):
                        await MessageController.showCodeMenu(event.replyToken, user);
                        break;
                    // 顔写真登録
                    case /^顔写真登録$/.test(messageText):
                        await MessageController.startIndexingFace(event.replyToken);
                        break;
                    // 友達決済承認ワンタイムメッセージ
                    case /^FriendPayToken/.test(messageText):
                        const token = messageText.replace('FriendPayToken.', '');
                        await MessageController.askConfirmationOfFriendPay(event.replyToken, token);
                        break;
                    // おこづかいをもらう
                    case /^おこづかい$/.test(messageText):
                        await MessageController.selectWhomAskForMoney(event.replyToken, user);
                        break;
                    // おこづかい承認メッセージ
                    case /^TransferMoneyToken/.test(messageText):
                        const transferMoneyToken = messageText.replace('TransferMoneyToken.', '');
                        await MessageController.askConfirmationOfTransferMoney(event.replyToken, user, transferMoneyToken);
                        break;
                    // メッセージで強制的にpostbackイベントを発動
                    case /^postback:/.test(messageText):
                        const postbackData = messageText.replace('postback:', '');
                        const postbackEvent: line.PostbackEvent = {
                            type: 'postback',
                            timestamp: event.timestamp,
                            source: event.source,
                            postback: { data: postbackData },
                            replyToken: event.replyToken
                        };
                        await postback(postbackEvent, user);
                        break;
                    default:
                        // 予約照会方法をアドバイス
                        await MessageController.pushHowToUse({
                            replyToken: event.replyToken,
                            user: user
                        });
                }
                break;

            case 'image':
                await ImageMessageController.indexFace(user, event.message.id);
                break;

            default:
                throw new Error(`Unknown message type ${event.message.type}`);
        }
    } catch (error) {
        await LINE.pushMessage(user.userId, { type: 'text', text: JSON.stringify(error) });
    }
}

/**
 * イベントの送信元が、template messageに付加されたポストバックアクションを実行したことを示すevent objectです
 */
// tslint:disable-next-line:cyclomatic-complexity max-func-body-length
export async function postback(event: line.PostbackEvent, user: User) {
    const data = querystring.parse(event.postback.data);
    debug('data:', data);
    try {
        switch (data.action) {
            // イベント検索
            case 'searchEventsByDate':
                let date = '';
                if (event.postback.params !== undefined && event.postback.params.date !== undefined) {
                    date = event.postback.params.date;
                } else {
                    date = <string>data.date;
                }
                await PostbackController.searchEventsByDate({
                    replyToken: event.replyToken,
                    user: user,
                    date: date
                });
                break;
            case 'askScreeningEvent':
                await PostbackController.askScreeningEvent({
                    replyToken: event.replyToken,
                    user: user,
                    screeningEventSeriesId: <string>data.screeningEventSeriesId,
                    date: <string>data.date
                });
                break;
            // 決済コードをたずねる
            case 'askPaymentCode':
                await PostbackController.askPaymentCode({
                    replyToken: event.replyToken,
                    user: user,
                    transactionId: <string>data.transactionId
                });
                break;
            case 'selectCreditCard':
                await PostbackController.selectCreditCard({
                    replyToken: event.replyToken,
                    user: user,
                    transactionId: <string>data.transactionId
                });
                break;
            // 決済方法選択
            case 'selectPaymentMethodType':
                await PostbackController.selectPaymentMethodType({
                    replyToken: event.replyToken,
                    user: user,
                    paymentMethodType: <PostbackController.PaymentMethodType>data.paymentMethod,
                    transactionId: <string>data.transactionId,
                    code: data.code,
                    creditCard: data.creditCard
                });
                break;
            // 購入者情報決定
            case 'setCustomerContact':
                await PostbackController.setCustomerContact({
                    replyToken: event.replyToken,
                    user: user,
                    transactionId: <string>data.transactionId,
                    familyName: <string>data.familyName,
                    givenName: <string>data.givenName,
                    email: <string>data.email,
                    telephone: <string>data.telephone
                });
                break;
            // 注文確定
            case 'confirmOrder':
                await PostbackController.confirmOrder({
                    replyToken: event.replyToken,
                    user: user,
                    transactionId: <string>data.transactionId
                });
                break;
            // 注文確定
            case 'cancelOrder':
                await PostbackController.cancelOrder({
                    replyToken: event.replyToken,
                    user: user,
                    transactionId: <string>data.transactionId
                });
                break;
            // 友達決済承認確定
            case 'confirmFriendPay':
                await PostbackController.confirmFriendPay({
                    replyToken: event.replyToken,
                    user: user,
                    token: <string>data.token
                });
                break;
            // おこづかい承認確定
            case 'confirmTransferMoney':
                await PostbackController.confirmTransferMoney({
                    replyToken: event.replyToken,
                    user: user,
                    token: <string>data.token,
                    price: parseInt(<string>data.price, 10)
                });
                break;
            // 友達決済承認確定
            // case 'continueTransactionAfterFriendPayConfirmation':
            //     await PostbackController.selectPaymentMethodType(
            //         user, 'FriendPay', <string>data.transactionId, parseInt(<string>data.price, 10));
            //     break;
            // クレジットカード検索
            case 'searchCreditCards':
                await PostbackController.searchCreditCards({
                    replyToken: event.replyToken,
                    user: user
                });
                break;
            // クレジットカード追加
            case 'addCreditCard':
                await PostbackController.addCreditCard({
                    replyToken: event.replyToken,
                    user: user,
                    token: <string>data.token
                });
                break;
            // クレジットカード削除
            case 'deleteCreditCard':
                await PostbackController.deleteCreditCard({
                    replyToken: event.replyToken,
                    user: user,
                    cardSeq: <string>data.cardSeq
                });
                break;
            // 口座開設
            case 'openAccount':
                await PostbackController.openAccount({
                    replyToken: event.replyToken,
                    user: user,
                    name: data.name,
                    accountType: data.accountType
                });
                break;
            // 口座解約
            case 'closeAccount':
                await PostbackController.closeAccount({
                    replyToken: event.replyToken,
                    user: user,
                    accountType: data.accountType,
                    accountNumber: data.accountNumber
                });
                break;
            // コイン口座検索
            case 'searchCoinAccounts':
                await PostbackController.searchCoinAccounts({
                    replyToken: event.replyToken,
                    user: user
                });
                break;
            case 'searchAccountMoneyTransferActions':
                await PostbackController.searchAccountMoneyTransferActions({
                    replyToken: event.replyToken,
                    user: user,
                    accountType: data.accountType,
                    accountNumber: data.accountNumber
                });
                break;
            // 口座入金金額選択
            case 'selectDepositAmount':
                await PostbackController.selectDepositAmount({
                    replyToken: event.replyToken,
                    user: user,
                    accountType: data.accountType,
                    accountNumber: data.accountNumber
                });
                break;
            // 口座入金金額選択
            case 'depositCoinByCreditCard':
                await PostbackController.depositCoinByCreditCard({
                    replyToken: event.replyToken,
                    user: user,
                    amount: Number(data.amount),
                    accountType: data.accountType,
                    toAccountNumber: data.toAccountNumber
                });
                break;
            case 'askEventStartDate':
                await MessageController.askEventStartDate({
                    replyToken: event.replyToken,
                    user: user
                });
                break;
            case 'searchScreeningEventReservations':
                await PostbackController.searchScreeningEventReservations({
                    replyToken: event.replyToken,
                    user: user
                });
                break;
            // 座席選択
            case 'selectSeatOffers':
                const seatNumbers = (<string>data.seatNumbers).split(',');
                await PostbackController.selectSeatOffers({
                    replyToken: event.replyToken,
                    user: user,
                    eventId: <string>data.eventId,
                    seatNumbers: seatNumbers
                });
                break;
            // 所有権コード発行
            case 'authorizeOwnershipInfo':
                await PostbackController.authorizeOwnershipInfo({
                    replyToken: event.replyToken,
                    user: user,
                    goodType: data.goodType,
                    id: data.id
                });
                break;
            // 注文照会
            case 'findOrderByConfirmationNumber':
                await PostbackController.findOrderByConfirmationNumber({
                    replyToken: event.replyToken,
                    user: user,
                    confirmationNumber: Number(data.confirmationNumber),
                    telephone: data.telephone
                });
                break;
            // 注文検索
            case 'searchOrders':
                await PostbackController.searchOrders({
                    replyToken: event.replyToken,
                    user: user
                });
                break;
            // 座席予約コード読み込み
            case 'findScreeningEventReservationById':
                await PostbackController.findScreeningEventReservationById({
                    replyToken: event.replyToken,
                    user: user,
                    code: <string>data.code
                });
                break;
            default:
        }
    } catch (error) {
        await LINE.pushMessage(user.userId, { type: 'text', text: JSON.stringify(error) });
    }
}

/**
 * イベント送信元に友だち追加（またはブロック解除）されたことを示すEvent Objectです
 */
export async function follow(event: line.FollowEvent) {
    debug('event is', event);
}

/**
 * イベント送信元にブロックされたことを示すevent objectです
 */
export async function unfollow(event: line.UnfollowEvent) {
    debug('event is', event);
}

/**
 * イベントの送信元グループまたはトークルームに参加したことを示すevent objectです
 */
export async function join(event: line.JoinEvent) {
    debug('event is', event);
}

/**
 * イベントの送信元グループから退出させられたことを示すevent objectです
 */
export async function leave(event: line.LeaveEvent) {
    debug('event is', event);
}

/**
 * イベント送信元のユーザがLINE Beaconデバイスの受信圏内に出入りしたことなどを表すイベントです
 */
export async function beacon(event: line.BeaconEvent) {
    debug('event is', event);
}
