/**
 * 取引ルーター
 */
import * as cinerinoapi from '@cinerino/api-nodejs-client';
import * as express from 'express';

import User from '../user';

const transactionsRouter = express.Router();

/**
 * クレジットカード情報入力フォーム
 */
transactionsRouter.get(
    '/inputCreditCard',
    async (req, res, next) => {
        try {
            // フォーム
            res.render('transactions/inputCreditCard', {
                gmoShopId: req.query.gmoShopId
            });
        } catch (error) {
            next(error);
        }
    }
);

/**
 * 購入者情報入力フォーム
 */
transactionsRouter.get(
    '/placeOrder/:transactionId/setCustomerContact',
    async (req, res, next) => {
        try {
            // フォーム
            res.render('transactions/placeOrder/setCustomerContact', {
                transactionId: req.params.transactionId,
                values: (req.query.profile !== undefined) ? req.query.profile : {}
            });
        } catch (error) {
            next(error);
        }
    }
);

/**
 * クレジットカード入力フォーム
 */
transactionsRouter.get(
    '/placeOrder/:transactionId/inputCreditCard',
    async (req, res, next) => {
        try {
            // フォーム
            res.render('transactions/placeOrder/inputCreditCard', {
                amount: req.query.amount,
                gmoShopId: req.query.gmoShopId,
                transactionId: req.params.transactionId
            });
        } catch (error) {
            next(error);
        }
    }
);

/**
 * プリペイドカード入力フォーム
 */
transactionsRouter.get(
    '/placeOrder/:transactionId/inputPaymentCard',
    async (req, res, next) => {
        try {
            const user = new User({
                host: req.hostname,
                userId: req.query.userId,
                state: ''
            });
            const productService = new cinerinoapi.service.Product({
                endpoint: <string>process.env.CINERINO_ENDPOINT,
                auth: user.authClient,
                project: { id: req.project?.id }
            });

            const searchProductsResult = await productService.search({
                typeOf: { $eq: 'PaymentCard' }
            });

            // フォーム
            res.render('transactions/placeOrder/inputPaymentCard', {
                amount: req.query.amount,
                transactionId: req.params.transactionId,
                products: searchProductsResult.data
            });
        } catch (error) {
            next(error);
        }
    }
);

/**
 * 座席選択フォーム
 */
transactionsRouter.get(
    '/placeOrder/selectSeatOffers',
    async (req, res, next) => {
        try {
            const user = new User({
                host: req.hostname,
                userId: req.query.userId,
                state: ''
            });
            const eventService = new cinerinoapi.service.Event({
                endpoint: <string>process.env.CINERINO_ENDPOINT,
                auth: user.authClient,
                project: { id: req.project?.id }
            });

            const event = await eventService.findById<cinerinoapi.factory.chevre.eventType.ScreeningEvent>({ id: req.query.eventId });

            const reservedSeatsAvailable = event.offers?.itemOffered.serviceOutput?.reservedTicket?.ticketedSeat !== undefined;

            if (reservedSeatsAvailable) {
                const eventOffers = await eventService.searchOffers({ event: { id: req.query.eventId } });
                const availableSeats = eventOffers[0].containsPlace.filter(
                    (p) => Array.isArray(p.offers) && p.offers[0].availability === 'InStock'
                );
                const availableSeatNumbers = availableSeats.map((s) => s.branchCode);

                res.render('transactions/placeOrder/selectSeatOffers', {
                    eventId: req.query.eventId,
                    availableSeatNumbers: availableSeatNumbers
                });
            } else {
                res.render('transactions/placeOrder/selectNumSeats', {
                    eventId: req.query.eventId
                });
            }
        } catch (error) {
            next(error);
        }
    }
);

/**
 * QRスキャン
 */
transactionsRouter.get(
    '/placeOrder/scanQRCode',
    async (req, res, next) => {
        try {
            // フォーム
            res.render('transactions/placeOrder/scanQRCode', {
                transactionId: req.query.transactionId
            });
        } catch (error) {
            next(error);
        }
    }
);

export default transactionsRouter;
