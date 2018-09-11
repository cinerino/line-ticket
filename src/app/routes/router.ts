/**
 * defaultルーター
 */
import * as express from 'express';

import accountsRouter from './accounts';
import authRouter from './auth';
import liffRouter from './liff';
import ordersRouter from './orders';
import reservationsRouter from './reservations';
import transactionsRouter from './transactions';
import webhookRouter from './webhook';

const router = express.Router();

// middleware that is specific to this router
// router.use((req, res, next) => {
//   debug('Time: ', Date.now())
//   next()
// })

router.use(authRouter);
router.use('/accounts', accountsRouter);
router.use('/liff', liffRouter);
router.use('/orders', ordersRouter);
router.use('/reservations', reservationsRouter);
router.use('/transactions', transactionsRouter);
router.use('/webhook', webhookRouter);

export default router;
