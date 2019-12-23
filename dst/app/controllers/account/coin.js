"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * Coinコントローラー
 */
const cinerinoapi = require("@cinerino/api-nodejs-client");
const moment = require("moment");
const lineClient_1 = require("../../../lineClient");
const contentsBuilder_1 = require("../../contentsBuilder");
/**
 * コイン転送
 */
function processTransferCoin(params) {
    return __awaiter(this, void 0, void 0, function* () {
        const moneyTransferService = new cinerinoapi.service.txn.MoneyTransfer({
            endpoint: process.env.CINERINO_ENDPOINT,
            auth: params.user.authClient
        });
        // 通貨転送取引開始
        const moneyTransferTransaction = yield moneyTransferService.start({
            project: { typeOf: 'Project', id: params.seller.project.id },
            expires: moment()
                .add(1, 'minutes')
                .toDate(),
            agent: {
                typeOf: cinerinoapi.factory.personType.Person,
                id: params.user.authClient.options.clientId
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
        yield lineClient_1.default.pushMessage(params.user.userId, { type: 'text', text: '残高の確認がとれました' });
        yield moneyTransferService.setProfile({
            id: moneyTransferTransaction.id,
            agent: Object.assign(Object.assign({}, params.profile), { name: `${params.profile.givenName} ${params.profile.familyName}` })
        });
        // 取引確定
        yield moneyTransferService.confirm({
            id: moneyTransferTransaction.id
        });
        yield lineClient_1.default.pushMessage(params.user.userId, { type: 'text', text: '転送が完了しました' });
        // 振込先に通知
        yield lineClient_1.default.pushMessage(params.user.userId, {
            type: 'text',
            text: `${params.profile.familyName} ${params.profile.givenName}から${params.amount}円のおこづかいが振り込まれました`
        });
    });
}
exports.processTransferCoin = processTransferCoin;
/**
 * コイン注文
 */
function processOrderCoin(params) {
    return __awaiter(this, void 0, void 0, function* () {
        const placeOrderService = new cinerinoapi.service.txn.PlaceOrder({
            endpoint: process.env.CINERINO_ENDPOINT,
            auth: params.user.authClient
        });
        const offerService = new cinerinoapi.service.Offer({
            endpoint: process.env.CINERINO_ENDPOINT,
            auth: params.user.authClient
        });
        const paymentService = new cinerinoapi.service.Payment({
            endpoint: process.env.CINERINO_ENDPOINT,
            auth: params.user.authClient
        });
        // 入金取引開始
        const placeOrderTransaction = yield placeOrderService.start({
            agent: {
                identifier: [{ name: 'lineUserId', value: params.user.userId }]
            },
            seller: { typeOf: params.seller.typeOf, id: params.seller.id },
            expires: moment()
                .add(1, 'minutes')
                .toDate()
        });
        yield placeOrderService.setProfile({
            id: placeOrderTransaction.id,
            agent: Object.assign(Object.assign({}, params.profile), { name: `${params.profile.givenName} ${params.profile.familyName}` })
        });
        yield offerService.authorizeMonetaryAmount({
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
            purpose: { typeOf: placeOrderTransaction.typeOf, id: placeOrderTransaction.id }
        });
        yield paymentService.authorizeCreditCard({
            object: {
                typeOf: cinerinoapi.factory.paymentMethodType.CreditCard,
                amount: Number(params.amount),
                method: '1',
                creditCard: params.creditCard
            },
            purpose: { typeOf: placeOrderTransaction.typeOf, id: placeOrderTransaction.id }
        });
        const { order } = yield placeOrderService.confirm({
            id: placeOrderTransaction.id
        });
        yield lineClient_1.default.pushMessage(params.user.userId, { type: 'text', text: '入金処理が完了しました' });
        const flex = {
            type: 'flex',
            altText: 'This is a Flex Message',
            contents: contentsBuilder_1.order2flexBubble({ order })
        };
        yield lineClient_1.default.pushMessage(params.user.userId, [flex]);
    });
}
exports.processOrderCoin = processOrderCoin;
