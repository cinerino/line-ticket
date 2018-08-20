/**
 * defaultルーター
 */
import * as express from 'express';

import accountsRouter from './accounts';
import authRouter from './auth';
import liffRouter from './liff';
import transactionsRouter from './transactions';

const router = express.Router();

// middleware that is specific to this router
// router.use((req, res, next) => {
//   debug('Time: ', Date.now())
//   next()
// })

router.use(authRouter);
router.use('/accounts', accountsRouter);
router.use('/liff', liffRouter);
router.use('/transactions', transactionsRouter);

export default router;
