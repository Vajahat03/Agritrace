import { Response } from 'express';
import { AuthRequest } from '../types';
import { FarmService, PlotService, CropService } from '../services/farmCropService';
import {
  FertilizerService,
  IrrigationService,
  CropInputService,
  CropObservationService,
  HarvestService,
} from '../services/fertilizerActivityService';
import { BatchService } from '../services/batchService';
import { WeatherService } from '../services/weather/weatherService';
import { NotificationService } from '../services/notifications/notificationService';
import { FarmerDirectoryRepository } from '../repositories/farmerDirectoryRepository';

export class FarmerController {
  // Dashboard Aggregation
  static async getDashboard(req: AuthRequest, res: Response): Promise<void> {
    try {
      const farmerId = req.user!.id;
      const token = req.token;

      const [farms, crops, batches, notifications] = await Promise.all([
        FarmService.getFarmerFarms(farmerId, token),
        CropService.getFarmerCrops(farmerId, undefined, token),
        BatchService.getFarmerBatches(farmerId, token),
        NotificationService.getUserNotifications(farmerId, true, token),
      ]);

      const activeCrops = crops.filter((c) => c.status === 'GROWING');
      const harvestReadyCrops = crops.filter((c) => c.status === 'READY_FOR_HARVEST');

      let weather = null;
      if (farms.length > 0 && farms[0].latitude && farms[0].longitude) {
        weather = await WeatherService.getWeather(farms[0].latitude, farms[0].longitude, farms[0].id);
      } else {
        weather = await WeatherService.getWeather(19.076, 72.877);
      }

      res.status(200).json({
        success: true,
        data: {
          metrics: {
            totalFarms: farms.length,
            totalActiveCrops: activeCrops.length,
            harvestReadyCrops: harvestReadyCrops.length,
            activeBatches: batches.length,
            unreadAlerts: notifications.length,
          },
          farms: farms.slice(0, 5),
          activeCrops: activeCrops.slice(0, 6),
          recentBatches: batches.slice(0, 5),
          weather,
          notifications: notifications.slice(0, 5),
        },
      });
    } catch (error: any) {
      res.status(500).json({ success: false, error: { code: 'DASHBOARD_ERROR', message: error.message } });
    }
  }

  // Farms
  static async getFarms(req: AuthRequest, res: Response): Promise<void> {
    try {
      const farms = await FarmService.getFarmerFarms(req.user!.id, req.token);
      res.status(200).json({ success: true, data: farms });
    } catch (error: any) {
      res.status(500).json({ success: false, error: { code: 'FARMS_FETCH_ERROR', message: error.message } });
    }
  }

  static async createFarm(req: AuthRequest, res: Response): Promise<void> {
    try {
      const farm = await FarmService.createFarm(
        req.user!.id,
        {
          name: req.body.name,
          location_name: req.body.location_name || req.body.locationName || req.body.location || '',
          address: req.body.address,
          latitude: req.body.latitude,
          longitude: req.body.longitude,
          total_area: Number(req.body.total_area || req.body.totalArea || req.body.area || 1),
          area_unit: req.body.area_unit || req.body.areaUnit || 'acre',
          soil_info: req.body.soil_info || req.body.soilInfo || req.body.soil_type || req.body.soilType,
          notes: req.body.notes,
        },
        req.token
      );
      res.status(201).json({ success: true, data: farm });
    } catch (error: any) {
      res.status(500).json({ success: false, error: { code: 'FARM_CREATE_ERROR', message: error.message } });
    }
  }

  static async getFarm(req: AuthRequest, res: Response): Promise<void> {
    try {
      const farmId = req.params.farmId as string;
      const farm = await FarmService.getFarmDetails(farmId, req.user!.id, req.token);
      if (!farm) {
        res.status(404).json({ success: false, error: { code: 'FARM_NOT_FOUND', message: 'Farm not found' } });
        return;
      }
      const plots = await PlotService.getPlotsByFarm(farm.id, req.token);
      res.status(200).json({ success: true, data: { ...farm, plots } });
    } catch (error: any) {
      res.status(500).json({ success: false, error: { code: 'FARM_FETCH_ERROR', message: error.message } });
    }
  }

  // Plots
  static async getPlots(req: AuthRequest, res: Response): Promise<void> {
    try {
      const farmId = (req.query.farmId || req.query.farm_id) as string;
      if (!farmId) {
        res.status(400).json({ success: false, error: { code: 'MISSING_FARM_ID', message: 'farmId query is required' } });
        return;
      }
      const plots = await PlotService.getPlotsByFarm(farmId, req.token);
      res.status(200).json({ success: true, data: plots });
    } catch (error: any) {
      res.status(500).json({ success: false, error: { code: 'PLOTS_FETCH_ERROR', message: error.message } });
    }
  }

  static async createPlot(req: AuthRequest, res: Response): Promise<void> {
    try {
      const plot = await PlotService.createPlot(
        {
          farm_id: req.body.farm_id || req.body.farmId,
          name: req.body.name,
          area: Number(req.body.area || 1),
          area_unit: req.body.area_unit || req.body.areaUnit || 'acre',
          soil_type: req.body.soil_type || req.body.soilType,
          irrigation_source: req.body.irrigation_source || req.body.irrigationSource,
          notes: req.body.notes,
        },
        req.token
      );
      res.status(201).json({ success: true, data: plot });
    } catch (error: any) {
      res.status(500).json({ success: false, error: { code: 'PLOT_CREATE_ERROR', message: error.message } });
    }
  }

  // Crops (Multiple simultaneous crops supported)
  static async getCrops(req: AuthRequest, res: Response): Promise<void> {
    try {
      const status = req.query.status as any;
      const crops = await CropService.getFarmerCrops(req.user!.id, status, req.token);
      res.status(200).json({ success: true, data: crops });
    } catch (error: any) {
      res.status(500).json({ success: false, error: { code: 'CROPS_FETCH_ERROR', message: error.message } });
    }
  }

  static async createCrop(req: AuthRequest, res: Response): Promise<void> {
    try {
      const crop = await CropService.createCrop(
        req.user!.id,
        {
          farm_id: req.body.farm_id || req.body.farmId,
          plot_id: req.body.plot_id || req.body.plotId,
          crop_type: req.body.crop_type || req.body.cropType,
          variety: req.body.variety,
          area: Number(req.body.area || 1),
          area_unit: req.body.area_unit || req.body.areaUnit || 'acre',
          planting_date: req.body.planting_date || req.body.plantingDate || new Date().toISOString().split('T')[0],
          expected_harvest_date: req.body.expected_harvest_date || req.body.expectedHarvestDate,
          status: req.body.status || 'GROWING',
          notes: req.body.notes,
          image_url: req.body.image_url || req.body.imageUrl,
        },
        req.token
      );
      res.status(201).json({ success: true, data: crop });
    } catch (error: any) {
      res.status(500).json({ success: false, error: { code: 'CROP_CREATE_ERROR', message: error.message } });
    }
  }

  static async getCropDetails(req: AuthRequest, res: Response): Promise<void> {
    try {
      const cropId = req.params.cropId as string;
      const crop = await CropService.getCropDetails(cropId, req.user!.id, req.token);
      if (!crop) {
        res.status(404).json({ success: false, error: { code: 'CROP_NOT_FOUND', message: 'Crop not found' } });
        return;
      }

      const [fertilizers, irrigation, inputs, observations, harvests] = await Promise.all([
        FertilizerService.getFertilizerHistory(crop.id, req.user!.id, req.token),
        IrrigationService.getIrrigationHistory(crop.id, req.user!.id, req.token),
        CropInputService.getInputsHistory(crop.id, req.user!.id, req.token),
        CropObservationService.getObservations(crop.id, req.user!.id, req.token),
        HarvestService.getHarvestHistory(crop.id, req.user!.id, req.token),
      ]);

      res.status(200).json({
        success: true,
        data: {
          ...crop,
          fertilizerHistory: fertilizers,
          irrigationHistory: irrigation,
          inputsHistory: inputs,
          observations,
          harvests,
        },
      });
    } catch (error: any) {
      res.status(500).json({ success: false, error: { code: 'CROP_DETAILS_ERROR', message: error.message } });
    }
  }

  static async updateCrop(req: AuthRequest, res: Response): Promise<void> {
    try {
      const cropId = req.params.cropId as string;
      const updated = await CropService.updateCrop(cropId, req.user!.id, req.body, req.token);
      res.status(200).json({ success: true, data: updated });
    } catch (error: any) {
      res.status(500).json({ success: false, error: { code: 'CROP_UPDATE_ERROR', message: error.message } });
    }
  }

  // Fertilizer (Historical log management)
  static async getCropFertilizers(req: AuthRequest, res: Response): Promise<void> {
    try {
      const cropId = req.params.cropId as string;
      const result = await FertilizerService.getFertilizerHistory(cropId, req.user!.id, req.token);
      res.status(200).json({ success: true, data: result });
    } catch (error: any) {
      res.status(500).json({ success: false, error: { code: 'FERTILIZER_FETCH_ERROR', message: error.message } });
    }
  }

  static async addFertilizer(req: AuthRequest, res: Response): Promise<void> {
    try {
      const cropId = req.params.cropId as string;
      const record = await FertilizerService.addFertilizerRecord(
        cropId,
        req.user!.id,
        req.body,
        req.token
      );
      res.status(201).json({ success: true, data: record });
    } catch (error: any) {
      res.status(500).json({ success: false, error: { code: 'FERTILIZER_ADD_ERROR', message: error.message } });
    }
  }

  static async updateFertilizer(req: AuthRequest, res: Response): Promise<void> {
    try {
      const fertilizerId = req.params.fertilizerId as string;
      const updated = await FertilizerService.updateFertilizerRecord(
        fertilizerId,
        req.user!.id,
        req.body,
        req.token
      );
      res.status(200).json({ success: true, data: updated });
    } catch (error: any) {
      res.status(500).json({ success: false, error: { code: 'FERTILIZER_UPDATE_ERROR', message: error.message } });
    }
  }

  static async deleteFertilizer(req: AuthRequest, res: Response): Promise<void> {
    try {
      const fertilizerId = req.params.fertilizerId as string;
      await FertilizerService.deleteFertilizerRecord(fertilizerId, req.user!.id, req.token);
      res.status(200).json({ success: true, message: 'Fertilizer record deleted' });
    } catch (error: any) {
      res.status(500).json({ success: false, error: { code: 'FERTILIZER_DELETE_ERROR', message: error.message } });
    }
  }

  // Irrigation & Inputs
  static async addIrrigation(req: AuthRequest, res: Response): Promise<void> {
    try {
      const cropId = req.params.cropId as string;
      const record = await IrrigationService.addIrrigationRecord(
        cropId,
        req.user!.id,
        {
          date: req.body.date,
          method: req.body.method,
          duration_minutes: req.body.durationMinutes,
          water_quantity: req.body.waterQuantity,
          unit: req.body.unit || 'liters',
          source: req.body.source,
          notes: req.body.notes,
        },
        req.token
      );
      res.status(201).json({ success: true, data: record });
    } catch (error: any) {
      res.status(500).json({ success: false, error: { code: 'IRRIGATION_ADD_ERROR', message: error.message } });
    }
  }

  static async addInput(req: AuthRequest, res: Response): Promise<void> {
    try {
      const cropId = req.params.cropId as string;
      const record = await CropInputService.addCropInput(
        cropId,
        req.user!.id,
        {
          input_type: req.body.inputType,
          name: req.body.name,
          quantity: req.body.quantity,
          unit: req.body.unit || 'kg',
          application_date: req.body.applicationDate,
          purpose: req.body.purpose,
          notes: req.body.notes,
        },
        req.token
      );
      res.status(201).json({ success: true, data: record });
    } catch (error: any) {
      res.status(500).json({ success: false, error: { code: 'INPUT_ADD_ERROR', message: error.message } });
    }
  }

  static async addObservation(req: AuthRequest, res: Response): Promise<void> {
    try {
      const cropId = req.params.cropId as string;
      const record = await CropObservationService.addObservation(
        cropId,
        req.user!.id,
        {
          observation_type: req.body.observationType,
          description: req.body.description,
          severity: req.body.severity || 'LOW',
          image_url: req.body.imageUrl,
        },
        req.token
      );
      res.status(201).json({ success: true, data: record });
    } catch (error: any) {
      res.status(500).json({ success: false, error: { code: 'OBSERVATION_ADD_ERROR', message: error.message } });
    }
  }

  // Harvest & Produce Batches
  static async logHarvestAndMintBatch(req: AuthRequest, res: Response): Promise<void> {
    try {
      const cropId = req.params.cropId as string;
      const batch = await BatchService.createHarvestAndBatch(
        req.user!.id,
        {
          cropId,
          harvestDate: req.body.harvestDate,
          quantity: req.body.quantity,
          unit: req.body.unit || 'kg',
          qualityGrade: req.body.qualityGrade || 'Grade A',
          notes: req.body.notes,
          location: req.body.location,
        },
        req.token
      );
      res.status(201).json({ success: true, data: batch });
    } catch (error: any) {
      res.status(500).json({ success: false, error: { code: 'HARVEST_BATCH_ERROR', message: error.message } });
    }
  }

  static async getBatches(req: AuthRequest, res: Response): Promise<void> {
    try {
      const batches = await BatchService.getFarmerBatches(req.user!.id, req.token);
      res.status(200).json({ success: true, data: batches });
    } catch (error: any) {
      res.status(500).json({ success: false, error: { code: 'BATCHES_FETCH_ERROR', message: error.message } });
    }
  }

  static async updateBatchStatus(req: AuthRequest, res: Response): Promise<void> {
    try {
      const batchId = req.params.batchId as string;
      const batch = await BatchService.updateStatus(
        batchId,
        req.body.status,
        req.user!.id,
        req.user!.role,
        req.body.location,
        req.body.notes,
        req.token
      );
      res.status(200).json({ success: true, data: batch });
    } catch (error: any) {
      res.status(500).json({ success: false, error: { code: 'BATCH_UPDATE_ERROR', message: error.message } });
    }
  }

  // Public Farmers Directory (for Vendors and Customers)
  static async listPublicFarmers(_req: AuthRequest, res: Response): Promise<void> {
    try {
      const farmers = await FarmerDirectoryRepository.listPublicFarmers();
      res.status(200).json({ success: true, data: farmers });
    } catch (error: any) {
      res.status(500).json({ success: false, error: { code: 'FARMER_DIRECTORY_ERROR', message: error.message } });
    }
  }

  static async getPublicFarmer(req: AuthRequest, res: Response): Promise<void> {
    try {
      const farmer = await FarmerDirectoryRepository.getPublicFarmer(req.params.farmerId as string);
      if (!farmer) {
        res.status(404).json({ success: false, error: { code: 'FARMER_NOT_FOUND', message: 'Public farmer profile not found' } });
        return;
      }
      res.status(200).json({ success: true, data: farmer });
    } catch (error: any) {
      res.status(500).json({ success: false, error: { code: 'FARMER_DIRECTORY_ERROR', message: error.message } });
    }
  }
}
