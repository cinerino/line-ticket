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
 * ペイメントカードルーター
 */
const cinerinoapi = require("@cinerino/api-nodejs-client");
const express = require("express");
const user_1 = require("../user");
const paymentCardsRouter = express.Router();
/**
 * ペイメントカード注文
 */
paymentCardsRouter.get('/order', (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const user = new user_1.default({
            host: req.hostname,
            userId: req.query.userId,
            state: ''
        });
        const productService = new cinerinoapi.service.Product({
            endpoint: process.env.CINERINO_ENDPOINT,
            auth: user.authClient,
            project: { id: (_a = req.project) === null || _a === void 0 ? void 0 : _a.id }
        });
        const searchProductsResult = yield productService.search({
            typeOf: { $eq: 'PaymentCard' }
        });
        res.render('paymentCards/order', {
            products: searchProductsResult.data
        });
    }
    catch (error) {
        next(error);
    }
}));
/**
 * 入金注文
 */
paymentCardsRouter.get('/orderMonetaryAmount', (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    var _b;
    try {
        const user = new user_1.default({
            host: req.hostname,
            userId: req.query.userId,
            state: ''
        });
        const productService = new cinerinoapi.service.Product({
            endpoint: process.env.CINERINO_ENDPOINT,
            auth: user.authClient,
            project: { id: (_b = req.project) === null || _b === void 0 ? void 0 : _b.id }
        });
        const searchProductsResult = yield productService.search({
            typeOf: { $eq: 'PaymentCard' }
        });
        res.render('paymentCards/orderMonetaryAmount', {
            products: searchProductsResult.data
        });
    }
    catch (error) {
        next(error);
    }
}));
/**
 * 照会
 */
paymentCardsRouter.get('/check', (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    var _c;
    try {
        const user = new user_1.default({
            host: req.hostname,
            userId: req.query.userId,
            state: ''
        });
        const productService = new cinerinoapi.service.Product({
            endpoint: process.env.CINERINO_ENDPOINT,
            auth: user.authClient,
            project: { id: (_c = req.project) === null || _c === void 0 ? void 0 : _c.id }
        });
        const searchProductsResult = yield productService.search({
            typeOf: { $eq: 'PaymentCard' }
        });
        res.render('paymentCards/check', {
            products: searchProductsResult.data
        });
    }
    catch (error) {
        next(error);
    }
}));
exports.default = paymentCardsRouter;
