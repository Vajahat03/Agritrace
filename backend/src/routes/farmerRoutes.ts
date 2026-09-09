import { Router } from 'express';
import { FarmerController } from '../controllers/farmerController';
import { authMiddleware } from '../middleware/authMiddleware';
import { requireRole } from '../middleware/roleMiddleware';
import { validate } from '../middleware/validateMiddleware';
import { auditLog } from '../middleware/auditMiddleware';
import {
  farmSchema,
  plotSchema,
  cropSchema,
  fertilizerSchema,
  irrigationSchema,
  cropInputSchema,
  cropObservationSchema,
  harvestBatchSchema,
  updateBatchStatusSchema,
} from '../validators';

const router = Router();

// Protect all farmer routes with Authentication and Role Check
router.use(authMiddleware);
router.use(requireRole('FARMER', 'ADMIN'));

// Dashboard
router.get('/dashboard', FarmerController.getDashboard);

// Farms CRUD
router.get('/farms', FarmerController.getFarms);
router.post('/farms', validate(farmSchema), auditLog('CREATE_FARM', 'farm'), FarmerController.createFarm);
router.get('/farms/:farmId', FarmerController.getFarm);

// Plots CRUD
router.get('/plots', FarmerController.getPlots);
router.post('/plots', validate(plotSchema), auditLog('CREATE_PLOT', 'plot'), FarmerController.createPlot);

// Crops CRUD (Multiple crops supported)
router.get('/crops', FarmerController.getCrops);
router.post('/crops', validate(cropSchema), auditLog('CREATE_CROP', 'crop'), FarmerController.createCrop);
router.get('/crops/:cropId', FarmerController.getCropDetails);
router.patch('/crops/:cropId', auditLog('UPDATE_CROP', 'crop'), FarmerController.updateCrop);

// Fertilizer History Sub-routes (Strict historical logs)
router.get('/crops/:cropId/fertilizers', FarmerController.getCropFertilizers);
router.post(
  '/crops/:cropId/fertilizers',
  validate(fertilizerSchema),
  auditLog('CREATE_FERTILIZER_APPLICATION', 'fertilizer_application'),
  FarmerController.addFertilizer
);
router.patch(
  '/crops/:cropId/fertilizers/:fertilizerId',
  auditLog('UPDATE_FERTILIZER_APPLICATION', 'fertilizer_application'),
  FarmerController.updateFertilizer
);
router.delete(
  '/crops/:cropId/fertilizers/:fertilizerId',
  auditLog('DELETE_FERTILIZER_APPLICATION', 'fertilizer_application'),
  FarmerController.deleteFertilizer
);

// Irrigation & Inputs Sub-routes
router.post(
  '/crops/:cropId/irrigation',
  validate(irrigationSchema),
  auditLog('CREATE_IRRIGATION_RECORD', 'irrigation_record'),
  FarmerController.addIrrigation
);
router.post(
  '/crops/:cropId/inputs',
  validate(cropInputSchema),
  auditLog('CREATE_CROP_INPUT', 'crop_input'),
  FarmerController.addInput
);
router.post(
  '/crops/:cropId/observations',
  validate(cropObservationSchema),
  auditLog('CREATE_CROP_OBSERVATION', 'crop_observation'),
  FarmerController.addObservation
);

// Harvest & Produce Batches
router.post(
  '/crops/:cropId/harvests',
  validate(harvestBatchSchema),
  auditLog('CREATE_HARVEST_AND_BATCH', 'produce_batch'),
  FarmerController.logHarvestAndMintBatch
);
router.get('/batches', FarmerController.getBatches);
router.patch(
  '/batches/:batchId/status',
  validate(updateBatchStatusSchema),
  auditLog('UPDATE_BATCH_STATUS', 'produce_batch'),
  FarmerController.updateBatchStatus
);

export default router;
