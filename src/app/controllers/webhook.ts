/**
 * LINE Webhookコントローラー
 */
import * as line from '@line/bot-sdk';
import * as createDebug from 'debug';
import { Request } from 'express';
import * as qs from 'qs';

import LINE from '../../lineClient';
import { MessageWebhookController } from './webhook/message';
import { ImageMessageWebhookController } from './webhook/message/image';
import { PostbackWebhookController } from './webhook/postback';

import * as authentication from '../middlewares/authentication';

const debug = createDebug('cinerino-line-ticket:controllers');

/**
 * ウェブフックコントローラ
 */
export class WebhookController {
    private readonly req: Request;

    constructor(req: Request) {
        this.req = req;
    }

    /**
     * メッセージが送信されたことを示すEvent Objectです
     */
    // tslint:disable-next-line:max-func-body-length
    public async message(event: line.MessageEvent) {
        const user = this.req.user;
        // const userId = <string>event.source.userId;

        try {
            switch (event.message.type) {
                case 'text':
                    const messageController = new MessageWebhookController(this.req);
                    const messageText = event.message.text;
                    switch (true) {
                        // [購入番号]で検索
                        case /^\d{6}$/.test(messageText):
                            await messageController.askReservationEventDate({
                                replyToken: event.replyToken,
                                paymentNo: messageText
                            });
                            break;
                        // ログイン
                        case /^login$/.test(messageText):
                            await authentication.sendLoginButton(this.req);
                            break;
                        // ログアウト
                        case /^logout$/.test(messageText):
                            await messageController.logout({
                                replyToken: event.replyToken
                            });
                            break;
                        // プロフィール管理
                        case /^プロフィール/.test(messageText):
                            await messageController.showProfileMenu({
                                replyToken: event.replyToken
                            });
                            break;
                        // 予約
                        case /予約/.test(messageText):
                            await messageController.showSeatReservationMenu({
                                replyToken: event.replyToken
                            });
                            break;
                        case /^注文$/.test(messageText):
                            await messageController.showOrderMenu({
                                replyToken: event.replyToken
                            });
                            break;
                        case /^クレジットカード$/.test(messageText):
                            await messageController.showCreditCardMenu({
                                replyToken: event.replyToken
                            });
                            break;
                        case /^プリペイド/.test(messageText):
                            await messageController.showCoinAccountMenu({
                                replyToken: event.replyToken
                            });
                            break;
                        case /^コード$/.test(messageText):
                            await messageController.showCodeMenu({
                                replyToken: event.replyToken
                            });
                            break;
                        // 顔写真登録
                        case /^顔写真登録$/.test(messageText):
                            await messageController.startIndexingFace({
                                replyToken: event.replyToken
                            });
                            break;
                        // 友達決済承認ワンタイムメッセージ
                        case /^FriendPayToken/.test(messageText):
                            const token = messageText.replace('FriendPayToken.', '');
                            await messageController.askConfirmationOfFriendPay({
                                replyToken: event.replyToken,
                                token: token
                            });
                            break;
                        // おこづかいをもらう
                        case /^おこづかい$/.test(messageText):
                            await messageController.selectWhomAskForMoney({
                                replyToken: event.replyToken
                            });
                            break;
                        // おこづかい承認メッセージ
                        case /^TransferMoneyToken/.test(messageText):
                            const transferMoneyToken = messageText.replace('TransferMoneyToken.', '');
                            await messageController.askConfirmationOfTransferMoney({
                                replyToken: event.replyToken,
                                transferMoneyToken: transferMoneyToken
                            });
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
                            await this.postback(postbackEvent);
                            break;
                        default:
                            // 予約照会方法をアドバイス
                            await messageController.pushHowToUse({
                                replyToken: event.replyToken
                            });
                    }
                    break;

                case 'image':
                    const imageController = new ImageMessageWebhookController(this.req);
                    await imageController.indexFace(event.message.id);
                    break;

                default:
                    throw new Error(`Unknown message type ${event.message.type}`);
            }
        } catch (error) {
            const text: string = `${error.name} ${error.message}`;
            // let text: string = `${error.name} ${error.message}`;
            try {
                // text = JSON.stringify(error);
            } catch (error) {
                // no op
            }
            await LINE.pushMessage(user.userId, { type: 'text', text: text });
        }
    }

    /**
     * イベントの送信元が、template messageに付加されたポストバックアクションを実行したことを示すevent objectです
     */
    // tslint:disable-next-line:cyclomatic-complexity max-func-body-length
    public async postback(event: line.PostbackEvent) {
        const data = qs.parse(event.postback.data, {
            arrayLimit: 1000,
            depth: 5,
            parseArrays: true,
            plainObjects: true,
            allowDots: false
        });
        debug('data:', data);
        try {
            const postbackController = new PostbackWebhookController(this.req);

            switch (data.action) {
                // イベント検索
                case 'searchEventsByDate':
                    let date = '';
                    if (event.postback.params !== undefined && event.postback.params.date !== undefined) {
                        date = event.postback.params.date;
                    } else {
                        date = <string>data.date;
                    }
                    await postbackController.searchEventsByDate({
                        replyToken: event.replyToken,
                        date: date
                    });
                    break;
                case 'askScreeningEvent':
                    await postbackController.askScreeningEvent({
                        replyToken: event.replyToken,
                        screeningEventSeriesId: <string>data.screeningEventSeriesId,
                        date: <string>data.date
                    });
                    break;
                // 決済コードをたずねる
                case 'askPaymentCode':
                    await postbackController.askPaymentCode({
                        replyToken: event.replyToken,
                        transactionId: <string>data.transactionId
                    });
                    break;
                case 'orderPaymentCard':
                    await postbackController.orderPaymentCard({
                        replyToken: event.replyToken,
                        itemOffered: data.itemOffered,
                        profile: data.profile
                    });
                    break;
                case 'checkPaymentCard':
                    await postbackController.checkPaymentCard({
                        replyToken: event.replyToken,
                        paymentCard: data.paymentCard
                    });
                    break;
                case 'selectCreditCard':
                    await postbackController.selectCreditCard({
                        replyToken: event.replyToken,
                        amount: Number(data.amount),
                        transactionId: <string>data.transactionId
                    });
                    break;
                case 'selectPaymentCard':
                    await postbackController.selectPaymentCard({
                        replyToken: event.replyToken,
                        amount: Number(data.amount),
                        transactionId: <string>data.transactionId
                    });
                    break;
                // 決済方法選択
                case 'selectPaymentMethodType':
                    await postbackController.selectPaymentMethodType({
                        replyToken: event.replyToken,
                        amount: Number(data.amount),
                        paymentMethodType: data.paymentMethod,
                        transactionId: <string>data.transactionId,
                        code: data.code,
                        creditCard: data.creditCard,
                        paymentCard: data.paymentCard
                    });
                    break;
                // 購入者情報決定
                case 'setProfile':
                    await postbackController.setProfile({
                        replyToken: event.replyToken,
                        transactionId: <string>data.transactionId,
                        familyName: <string>data.familyName,
                        givenName: <string>data.givenName,
                        email: <string>data.email,
                        telephone: <string>data.telephone
                    });
                    break;
                // 注文確定
                case 'confirmOrder':
                    await postbackController.confirmOrder({
                        replyToken: event.replyToken,
                        transactionId: <string>data.transactionId
                    });
                    break;
                // 注文確定
                case 'cancelOrder':
                    await postbackController.cancelOrder({
                        replyToken: event.replyToken,
                        transactionId: <string>data.transactionId
                    });
                    break;
                // 友達決済承認確定
                case 'confirmFriendPay':
                    await postbackController.confirmFriendPay({
                        replyToken: event.replyToken,
                        token: <string>data.token
                    });
                    break;
                // おこづかい承認確定
                case 'confirmTransferMoney':
                    await postbackController.confirmTransferMoney({
                        replyToken: event.replyToken,
                        token: <string>data.token,
                        price: parseInt(<string>data.price, 10)
                    });
                    break;
                // 友達決済承認確定
                // case 'continueTransactionAfterFriendPayConfirmation':
                //     await postbackController.selectPaymentMethodType(
                //         user, 'FriendPay', <string>data.transactionId, parseInt(<string>data.price, 10));
                //     break;
                // クレジットカード検索
                case 'searchCreditCards':
                    await postbackController.searchCreditCards({
                        replyToken: event.replyToken
                    });
                    break;
                // クレジットカード追加
                case 'addCreditCard':
                    await postbackController.addCreditCard({
                        replyToken: event.replyToken,
                        token: <string>data.token
                    });
                    break;
                // クレジットカード削除
                case 'deleteCreditCard':
                    await postbackController.deleteCreditCard({
                        replyToken: event.replyToken,
                        cardSeq: <string>data.cardSeq
                    });
                    break;
                // 口座開設
                case 'openAccount':
                    await postbackController.openAccount({
                        replyToken: event.replyToken,
                        name: data.name,
                        accountType: data.accountType
                    });
                    break;
                // 口座解約
                case 'closeAccount':
                    await postbackController.closeAccount({
                        replyToken: event.replyToken,
                        accountType: data.accountType,
                        accountNumber: data.accountNumber
                    });
                    break;
                // プリペイドカード検索
                case 'searchCoinAccounts':
                    await postbackController.searchCoinAccounts({
                        replyToken: event.replyToken
                    });
                    break;
                case 'searchAccountMoneyTransferActions':
                    await postbackController.searchAccountMoneyTransferActions({
                        replyToken: event.replyToken,
                        accountType: data.accountType,
                        accountNumber: data.accountNumber
                    });
                    break;
                // 口座入金金額選択
                case 'selectDepositAmount':
                    await postbackController.selectDepositAmount({
                        replyToken: event.replyToken,
                        paymentCard: data.paymentCard
                    });
                    break;
                // 口座入金金額選択
                case 'depositCoinByCreditCard':
                    await postbackController.depositCoinByCreditCard({
                        replyToken: event.replyToken,
                        amount: Number(data.amount),
                        paymentCard: data.paymentCard
                    });
                    break;
                case 'askEventStartDate':
                    await postbackController.askEventStartDate({
                        replyToken: event.replyToken
                    });
                    break;
                case 'searchScreeningEventReservations':
                    await postbackController.searchScreeningEventReservations({
                        replyToken: event.replyToken
                    });
                    break;

                // 座席選択 or 座席数選択
                case 'selectSeatOffers':
                    const seatNumbers = (typeof data.seatNumbers === 'string') ? (<string>data.seatNumbers).split(',') : undefined;
                    const numSeats = (typeof data.numSeats === 'string') ? Number(<string>data.numSeats) : undefined;

                    await postbackController.selectSeatOffers({
                        replyToken: event.replyToken,
                        eventId: <string>data.eventId,
                        seatNumbers: seatNumbers,
                        numSeats: numSeats,
                        offerId: data.offerId
                    });

                    break;

                // 所有権コード発行
                case 'authorizeOwnershipInfo':
                    await postbackController.authorizeOwnershipInfo({
                        replyToken: event.replyToken,
                        goodType: data.goodType,
                        id: data.id
                    });
                    break;
                // 注文照会
                case 'findOrderByConfirmationNumber':
                    await postbackController.findOrderByConfirmationNumber({
                        replyToken: event.replyToken,
                        confirmationNumber: Number(data.confirmationNumber),
                        telephone: data.telephone
                    });
                    break;
                // 注文に対して発券
                case 'authorizeOwnershipInfosByOrder':
                    await postbackController.authorizeOwnershipInfosByOrder({
                        replyToken: event.replyToken,
                        orderNumber: data.orderNumber,
                        telephone: data.telephone
                    });
                    break;
                // 注文検索
                case 'searchOrders':
                    await postbackController.searchOrders({
                        replyToken: event.replyToken
                    });
                    break;
                // 予約コード読み込み
                case 'findScreeningEventReservationById':
                    await postbackController.findScreeningEventReservationById({
                        replyToken: event.replyToken,
                        code: <string>data.code
                    });
                    break;
                // プロフィール検索
                case 'getProfile':
                    await postbackController.getProfile({
                        replyToken: event.replyToken
                    });
                    break;
                // プロフィール更新
                case 'updateProfile':
                    await postbackController.updateProfile({
                        replyToken: event.replyToken,
                        profile: data.profile
                    });
                    break;
                default:
            }
        } catch (error) {
            const text: string = `${error.name} ${error.message}`;
            // let text: string = `${error.name} ${error.message}`;
            try {
                // text = JSON.stringify(error);
            } catch (error) {
                // no op
            }
            await LINE.pushMessage(this.req.user.userId, { type: 'text', text: text });
        }
    }

    /**
     * イベント送信元に友だち追加（またはブロック解除）されたことを示すEvent Objectです
     */
    public async follow(event: line.FollowEvent) {
        debug('project:', this.req.project?.id);
        debug('event is', event);
    }

    /**
     * イベント送信元にブロックされたことを示すevent objectです
     */
    public async unfollow(event: line.UnfollowEvent) {
        debug('project:', this.req.project?.id);
        debug('event is', event);
    }

    /**
     * イベントの送信元グループまたはトークルームに参加したことを示すevent objectです
     */
    public async join(event: line.JoinEvent) {
        debug('project:', this.req.project?.id);
        debug('event is', event);
    }

    /**
     * イベントの送信元グループから退出させられたことを示すevent objectです
     */
    public async leave(event: line.LeaveEvent) {
        debug('project:', this.req.project?.id);
        debug('event is', event);
    }

    /**
     * イベント送信元のユーザがLINE Beaconデバイスの受信圏内に出入りしたことなどを表すイベントです
     */
    public async beacon(event: line.BeaconEvent) {
        debug('project:', this.req.project?.id);
        debug('event is', event);
    }
}
