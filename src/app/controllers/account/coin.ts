/**
 * Coinコントローラー
 */
import * as cinerinoapi from '@cinerino/api-nodejs-client';
import { FlexMessage } from '@line/bot-sdk';
import * as moment from 'moment';

import LINE from '../../../lineClient';
import { default as User, ITransferMoneyInfo } from '../../user';

import {
    order2flexBubble
} from '../../contentsBuilder';

/**
 * コイン転送
 */
export async function processTransferCoin(params: {
    user: User;
    amount: number;
    fromLocation: {
        accountNumber: string;
    };
    transferMoneyInfo: ITransferMoneyInfo;
    profile: cinerinoapi.factory.transaction.placeOrder.ICustomerProfile;
    seller: cinerinoapi.factory.seller.IOrganization<any>;
}) {
    const moneyTransferService = new cinerinoapi.service.txn.MoneyTransfer({
        endpoint: <string>process.env.CINERINO_ENDPOINT,
        auth: params.user.authClient
    });

    // 通貨転送取引開始
    const moneyTransferTransaction =
        await moneyTransferService.start<cinerinoapi.factory.accountType.Coin, cinerinoapi.factory.pecorino.account.TypeOf.Account>({
            project: { typeOf: 'Project', id: params.seller.project.id },
            expires: moment()
                .add(1, 'minutes')
                .toDate(),
            agent: {
                typeOf: cinerinoapi.factory.personType.Person,
                id: <string>params.user.authClient.options.clientId
            },
            recipient: {
                typeOf: cinerinoapi.factory.personType.Person,
                id: params.transferMoneyInfo.userId,
                name: params.transferMoneyInfo.name,
                url: ''
            },
            seller: { typeOf: params.seller.typeOf, id: params.seller.id },
            object: {
                amount: params.amount,
                authorizeActions: [],
                description: 'Cinerino LINE Ticket Pocket Money',
                fromLocation: {
                    typeOf: cinerinoapi.factory.pecorino.account.TypeOf.Account,
                    accountType: cinerinoapi.factory.accountType.Coin,
                    accountNumber: params.fromLocation.accountNumber
                },
                toLocation: {
                    typeOf: cinerinoapi.factory.pecorino.account.TypeOf.Account,
                    accountType: cinerinoapi.factory.accountType.Coin,
                    accountNumber: params.transferMoneyInfo.accountNumber
                }
            }
        });
    await LINE.pushMessage(params.user.userId, { type: 'text', text: '残高の確認がとれました' });

    await moneyTransferService.setProfile({
        id: moneyTransferTransaction.id,
        agent: { ...{ ...params.profile, name: `${params.profile.givenName} ${params.profile.familyName}` } }
    });

    // 取引確定
    await moneyTransferService.confirm({
        id: moneyTransferTransaction.id
    });
    await LINE.pushMessage(params.user.userId, { type: 'text', text: '転送が完了しました' });

    // 振込先に通知
    await LINE.pushMessage(params.user.userId, {
        type: 'text',
        text: `${params.profile.familyName} ${params.profile.givenName}から${params.amount}円のおこづかいが振り込まれました`
    });
}

/**
 * コイン注文
 */
export async function processOrderCoin(params: {
    replyToken: string;
    user: User;
    amount: number;
    toLocation: {
        accountNumber: string;
    };
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

    await placeOrderService.setProfile({
        id: placeOrderTransaction.id,
        agent: {
            ...params.profile,
            ...{
                name: `${params.profile.givenName} ${params.profile.familyName}`
            }
        }
    });

    await offerService.authorizeMonetaryAmount({
        object: {
            typeOf: 'Offer',
            itemOffered: {
                typeOf: 'MonetaryAmount',
                value: Number(params.amount),
                currency: cinerinoapi.factory.accountType.Coin
            },
            priceCurrency: cinerinoapi.factory.priceCurrency.JPY,
            seller: { typeOf: params.seller.typeOf, name: params.seller.name },
            toLocation: {
                typeOf: cinerinoapi.factory.pecorino.account.TypeOf.Account,
                accountType: cinerinoapi.factory.accountType.Coin,
                accountNumber: params.toLocation.accountNumber
            }
        },
        purpose: { typeOf: placeOrderTransaction.typeOf, id: placeOrderTransaction.id },
        ...{
            recipient: {
                typeOf: cinerinoapi.factory.personType.Person,
                id: params.user.userId,
                name: `${params.profile.givenName} ${params.profile.familyName}`
            }
        }
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

    const { order } = await placeOrderService.confirm({
        id: placeOrderTransaction.id
    });
    await LINE.pushMessage(params.user.userId, { type: 'text', text: '入金処理が完了しました' });

    const flex: FlexMessage = {
        type: 'flex',
        altText: 'This is a Flex Message',
        contents: order2flexBubble({ order })
    };
    await LINE.pushMessage(params.user.userId, [flex]);
}
