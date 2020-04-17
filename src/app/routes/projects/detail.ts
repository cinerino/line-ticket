/**
 * プロジェクト詳細ルーター
 */
import * as express from 'express';

import accountsRouter from '../accounts';
import liffRouter from '../liff';
import ordersRouter from '../orders';
import peopleRouter from '../people';
import reservationsRouter from '../reservations';
import transactionsRouter from '../transactions';
import webhookRouter from '../webhook';

const projectDetailRouter = express.Router();

projectDetailRouter.use((req, _, next) => {
    // プロジェクト未指定は拒否
    if (typeof req.project?.id !== 'string') {
        next(new Error('プロジェクトが指定されていません'));

        return;
    }

    next();
});

projectDetailRouter.use('/accounts', accountsRouter);
projectDetailRouter.use('/liff', liffRouter);
projectDetailRouter.use('/orders', ordersRouter);
projectDetailRouter.use('/people', peopleRouter);
projectDetailRouter.use('/reservations', reservationsRouter);
projectDetailRouter.use('/transactions', transactionsRouter);
projectDetailRouter.use('/webhook', webhookRouter);

export default projectDetailRouter;
