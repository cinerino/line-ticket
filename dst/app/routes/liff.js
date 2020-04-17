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
 * LIFFルーター
 */
const express = require("express");
const url_1 = require("url");
const user_1 = require("../user");
const liffRouter = express.Router();
/**
 * LIFFアプリケーション初期エンドポイント
 */
liffRouter.get('', (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        res.redirect(req.query.cb);
    }
    catch (error) {
        next(error);
    }
}));
/**
 * LIFF上でのサインイン
 */
liffRouter.get('/signIn', (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const user = new user_1.default({
            host: req.hostname,
            userId: req.query.userId,
            state: req.query.state
        });
        if (req.query.identity_provider === 'Google') {
            const signInUrl = new url_1.URL(user.generateAuthUrl());
            const googleSignInUrl = `${signInUrl.href}&identity_provider=Google`;
            res.redirect(googleSignInUrl);
        }
        else {
            res.redirect(user.generateAuthUrl());
        }
    }
    catch (error) {
        next(error);
    }
}));
/**
 * LIFF上でのサインアップ
 */
liffRouter.get('/signUp', (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const user = new user_1.default({
            host: req.hostname,
            userId: req.query.userId,
            state: req.query.state
        });
        const signInUrl = new url_1.URL(user.generateAuthUrl());
        const signUpUrl = new url_1.URL(signInUrl.href);
        signUpUrl.pathname = 'signup';
        const signUpUri = signUpUrl.href;
        res.redirect(signUpUri);
    }
    catch (error) {
        next(error);
    }
}));
exports.default = liffRouter;
