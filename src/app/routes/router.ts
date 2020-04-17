/**
 * defaultルーター
 */
import * as express from 'express';

import setProject from '../middlewares/setProject';

import authRouter from './auth';
import projectDetailRouter from './projects/detail';

const router = express.Router();

// middleware that is specific to this router
// router.use((req, res, next) => {
//   debug('Time: ', Date.now())
//   next()
// })

router.use(authRouter);

// リクエストプロジェクト設定
router.use(setProject);

// 以下プロジェクト指定前提のルーター
router.use('/projects/:id', projectDetailRouter);

export default router;
