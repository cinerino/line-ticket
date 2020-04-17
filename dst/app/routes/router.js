"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * defaultルーター
 */
const express = require("express");
const setProject_1 = require("../middlewares/setProject");
const auth_1 = require("./auth");
const detail_1 = require("./projects/detail");
const router = express.Router();
// middleware that is specific to this router
// router.use((req, res, next) => {
//   debug('Time: ', Date.now())
//   next()
// })
router.use(auth_1.default);
// リクエストプロジェクト設定
router.use(setProject_1.default);
// 以下プロジェクト指定前提のルーター
router.use('/projects/:id', detail_1.default);
exports.default = router;
