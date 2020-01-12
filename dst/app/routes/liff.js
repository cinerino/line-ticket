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
        res.redirect(user.generateAuthUrl());
    }
    catch (error) {
        next(error);
    }
}));
exports.default = liffRouter;
