import { Router } from 'express';
import { repositoryController } from '../../controllers/repository.controller';
import { requireAuth } from '../../middleware/auth';

const router = Router();

router.use((_req, res, next) => {
  res.set('Cache-Control', 'no-store');
  next();
});

router.use(requireAuth);

router.post('/', repositoryController.create);
router.get('/', repositoryController.list);
router.get('/:id', repositoryController.getById);
router.patch('/:id', repositoryController.update);
router.delete('/:id', repositoryController.delete);

export default router;
