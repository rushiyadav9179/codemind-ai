import { Router } from 'express';
import healthRouter from './v1/health.router';
import authRouter from './v1/auth.router';
import repositoryRouter from './v1/repository.router';

const v1Router = Router();
v1Router.use('/health', healthRouter);
v1Router.use('/auth', authRouter);
v1Router.use('/repositories', repositoryRouter);

export default v1Router;
