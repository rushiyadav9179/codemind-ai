import { Router } from 'express';
import healthRouter from './v1/health.router';
import authRouter from './v1/auth.router';

const v1Router = Router();
v1Router.use('/health', healthRouter);
v1Router.use('/auth', authRouter);

export default v1Router;
