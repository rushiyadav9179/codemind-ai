import { Router } from 'express';
import { repositoryController } from '../../controllers/repository.controller';
import { analysisController } from '../../controllers/analysis.controller';
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

// Code Intelligence Engine (Phase 4)
router.post('/:id/analysis', analysisController.ingestAndAnalyze);
router.get('/:id/analysis/latest', analysisController.getLatestRun);
router.get('/:id/analysis/:analysisId', analysisController.getRunById);
router.get('/:id/analysis/:analysisId/files', analysisController.listFiles);
router.get('/:id/analysis/:analysisId/files/:fileId', analysisController.getFileDetail);
router.get('/:id/analysis/:analysisId/dependencies', analysisController.getDependencyGraph);

export default router;
