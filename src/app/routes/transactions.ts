/**
 * 取引ルーター
 */
import * as cinerinoapi from '@cinerino/api-nodejs-client';
import * as express from 'express';

const transactionsRouter = express.Router();

/**
 * クレジットカード情報入力フォーム
 */
transactionsRouter.get(
    '/transactions/inputCreditCard',
    async (req, res, next) => {
        try {
            // フォーム
            res.render('transactions/inputCreditCard', {
                gmoShopId: req.query.gmoShopId
            });
        } catch (error) {
            next(error);
        }
    });

/**
 * 座席選択フォーム
 */
transactionsRouter.get(
    '/transactions/placeOrder/selectSeatOffers',
    async (req, res, next) => {
        try {
            const authClient = new cinerinoapi.auth.OAuth2({
                domain: <string>process.env.CINERINO_AUTHORIZE_SERVER_DOMAIN,
                clientId: <string>process.env.CINERINO_CLIENT_ID,
                clientSecret: <string>process.env.CINERINO_CLIENT_SECRET,
                redirectUri: '',
                logoutUri: ''
            });
            authClient.setCredentials({ access_token: req.query.accessToken });
            const eventService = new cinerinoapi.service.Event({
                endpoint: <string>process.env.CINERINO_ENDPOINT,
                auth: authClient
            });
            const eventOffers = await eventService.searchScreeningEventOffers({ eventId: req.query.eventId });
            const availableSeats = eventOffers[0].containsPlace.filter(
                (p) => Array.isArray(p.offers) && p.offers[0].availability === 'InStock'
            );
            const availableSeatNumbers = availableSeats.map((s) => s.branchCode);
            // フォーム
            res.render('transactions/placeOrder/selectSeatOffers', {
                eventId: req.query.eventId,
                availableSeatNumbers: availableSeatNumbers
            });
        } catch (error) {
            next(error);
        }
    });

/**
 * QRスキャン
 */
transactionsRouter.get(
    '/transactions/placeOrder/scanQRCode',
    async (req, res, next) => {
        try {
            // フォーム
            res.render('transactions/placeOrder/scanQRCode', {
                transactionId: req.query.transactionId
            });
        } catch (error) {
            next(error);
        }
    });

export default transactionsRouter;
