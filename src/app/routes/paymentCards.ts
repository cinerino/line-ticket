/**
 * 決済カードルーター
 */
import * as cinerinoapi from '@cinerino/api-nodejs-client';
import * as express from 'express';

import User from '../user';

const paymentCardsRouter = express.Router();

/**
 * 決済カード注文
 */
paymentCardsRouter.get(
    '/order',
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

            res.render('paymentCards/order', {
                products: searchProductsResult.data
            });
        } catch (error) {
            next(error);
        }
    }
);

/**
 * 入金注文
 */
paymentCardsRouter.get(
    '/orderMonetaryAmount',
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

            res.render('paymentCards/orderMonetaryAmount', {
                products: searchProductsResult.data
            });
        } catch (error) {
            next(error);
        }
    }
);

/**
 * 照会
 */
paymentCardsRouter.get(
    '/check',
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

            res.render('paymentCards/check', {
                products: searchProductsResult.data
            });
        } catch (error) {
            next(error);
        }
    }
);

export default paymentCardsRouter;
