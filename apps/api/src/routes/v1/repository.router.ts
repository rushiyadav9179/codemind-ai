import { Router } from 'express';
import { repositoryController } from '../../controllers/repository.controller';
import { analysisController } from '../../controllers/analysis.controller';
import { searchController } from '../../controllers/search.controller';
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

// Semantic Search Engine (Phase 5)
router.post('/:id/search/index', searchController.indexRepository);
router.get('/:id/search/status', searchController.getIndexStatus);
router.get('/:id/search/query', searchController.search);

export default router;
