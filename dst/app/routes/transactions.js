"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * 取引ルーター
 */
const cinerinoapi = require("@cinerino/api-nodejs-client");
const express = require("express");
const user_1 = require("../user");
const transactionsRouter = express.Router();
/**
 * クレジットカード情報入力フォーム
 */
transactionsRouter.get('/inputCreditCard', (req, res, next) => __awaiter(this, void 0, void 0, function* () {
    try {
        // フォーム
        res.render('transactions/inputCreditCard', {
            gmoShopId: req.query.gmoShopId
        });
    }
    catch (error) {
        next(error);
    }
}));
/**
 * クレジットカード情報入力フォーム
 */
transactionsRouter.get('/placeOrder/:transactionId/setCustomerContact', (req, res, next) => __awaiter(this, void 0, void 0, function* () {
    try {
        // フォーム
        res.render('transactions/placeOrder/setCustomerContact', {
            transactionId: req.params.transactionId
        });
    }
    catch (error) {
        next(error);
    }
}));
/**
 * 座席選択フォーム
 */
transactionsRouter.get('/placeOrder/selectSeatOffers', (req, res, next) => __awaiter(this, void 0, void 0, function* () {
    try {
        const user = new user_1.default({
            host: req.hostname,
            userId: req.query.userId,
            state: ''
        });
        const eventService = new cinerinoapi.service.Event({
            endpoint: process.env.CINERINO_ENDPOINT,
            auth: user.authClient
        });
        const eventOffers = yield eventService.searchScreeningEventOffers({ eventId: req.query.eventId });
        const availableSeats = eventOffers[0].containsPlace.filter((p) => Array.isArray(p.offers) && p.offers[0].availability === 'InStock');
        const availableSeatNumbers = availableSeats.map((s) => s.branchCode);
        // フォーム
        res.render('transactions/placeOrder/selectSeatOffers', {
            eventId: req.query.eventId,
            availableSeatNumbers: availableSeatNumbers
        });
    }
    catch (error) {
        next(error);
    }
}));
/**
 * QRスキャン
 */
transactionsRouter.get('/placeOrder/scanQRCode', (req, res, next) => __awaiter(this, void 0, void 0, function* () {
    try {
        // フォーム
        res.render('transactions/placeOrder/scanQRCode', {
            transactionId: req.query.transactionId
        });
    }
    catch (error) {
        next(error);
    }
}));
exports.default = transactionsRouter;
