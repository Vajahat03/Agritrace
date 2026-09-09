import { FarmRepository, PlotRepository, CropRepository } from '../repositories/farmCropRepository';
import { Farm, Plot, Crop, CropStatus } from '../types';

export class FarmService {
  static async getFarmerFarms(farmerId: string, token?: string): Promise<Farm[]> {
    return FarmRepository.findByFarmer(farmerId, token);
  }

  static async getFarmDetails(farmId: string, farmerId?: string, token?: string): Promise<Farm | null> {
    return FarmRepository.findById(farmId, farmerId, token);
  }

  static async createFarm(farmerId: string, data: Partial<Farm>, token?: string): Promise<Farm> {
    const created = await FarmRepository.create({ ...data, farmer_id: farmerId }, token);
    try {
      await PlotRepository.create(
        {
          farm_id: created.id,
          name: 'Plot 1 (Main Plot)',
          area: created.total_area || 1,
          area_unit: created.area_unit || 'acre',
          soil_type: created.soil_info || 'Clay Loam',
        },
        token
      );
    } catch (e) {
      // Ignore plot auto-creation failure if plot already created
    }
    return created;
  }

  static async updateFarm(farmId: string, farmerId: string, data: Partial<Farm>, token?: string): Promise<Farm> {
    return FarmRepository.update(farmId, farmerId, data, token);
  }

  static async deleteFarm(farmId: string, farmerId: string, token?: string): Promise<void> {
    return FarmRepository.delete(farmId, farmerId, token);
  }
}

export class PlotService {
  static async getPlotsByFarm(farmId: string, token?: string): Promise<Plot[]> {
    return PlotRepository.findByFarm(farmId, token);
  }

  static async createPlot(data: Partial<Plot>, token?: string): Promise<Plot> {
    return PlotRepository.create(data, token);
  }

  static async updatePlot(plotId: string, data: Partial<Plot>, token?: string): Promise<Plot> {
    return PlotRepository.update(plotId, data, token);
  }

  static async deletePlot(plotId: string, token?: string): Promise<void> {
    return PlotRepository.delete(plotId, token);
  }
}

export class CropService {
  static async getFarmerCrops(farmerId: string, status?: CropStatus, token?: string): Promise<Crop[]> {
    return CropRepository.findByFarmer(farmerId, status, token);
  }

  static async getCropDetails(cropId: string, farmerId?: string, token?: string): Promise<Crop | null> {
    return CropRepository.findById(cropId, farmerId, token);
  }

  static async createCrop(farmerId: string, data: Partial<Crop>, token?: string): Promise<Crop> {
    let targetFarmId = data.farm_id;
    let targetPlotId = data.plot_id;

    // If farmId is missing, placeholder or invalid, resolve to farmer's real farm
    if (!targetFarmId || targetFarmId.startsWith('00000000') || targetFarmId.startsWith('farm-')) {
      const existingFarms = await FarmRepository.findByFarmer(farmerId, token);
      if (existingFarms.length > 0) {
        targetFarmId = existingFarms[0].id;
        const plots = await PlotRepository.findByFarm(targetFarmId, token);
        if (plots.length > 0) {
          targetPlotId = plots[0].id;
        } else {
          const newPlot = await PlotRepository.create(
            {
              farm_id: targetFarmId,
              name: 'Plot 1 (Main Plot)',
              area: existingFarms[0].total_area || 1,
              area_unit: existingFarms[0].area_unit || 'acre',
            },
            token
          );
          targetPlotId = newPlot.id;
        }
      } else {
        // Create primary farm and plot for farmer
        const newFarm = await FarmRepository.create(
          {
            farmer_id: farmerId,
            name: 'Primary Farm',
            location_name: 'Main Field',
            total_area: 5,
            area_unit: 'acre',
            soil_info: 'Fertile Soil',
          },
          token
        );
        targetFarmId = newFarm.id;
        const newPlot = await PlotRepository.create(
          {
            farm_id: newFarm.id,
            name: 'Plot 1 (Main Plot)',
            area: 5,
            area_unit: 'acre',
          },
          token
        );
        targetPlotId = newPlot.id;
      }
    } else if (!targetPlotId || targetPlotId.startsWith('00000000') || targetPlotId.startsWith('plot-')) {
      const plots = await PlotRepository.findByFarm(targetFarmId, token);
      if (plots.length > 0) {
        targetPlotId = plots[0].id;
      } else {
        const newPlot = await PlotRepository.create(
          {
            farm_id: targetFarmId,
            name: 'Plot 1 (Main Plot)',
            area: 1,
            area_unit: 'acre',
          },
          token
        );
        targetPlotId = newPlot.id;
      }
    }

    return CropRepository.create(
      {
        ...data,
        farmer_id: farmerId,
        farm_id: targetFarmId,
        plot_id: targetPlotId,
      },
      token
    );
  }

  static async updateCrop(cropId: string, farmerId: string, data: Partial<Crop>, token?: string): Promise<Crop> {
    return CropRepository.update(cropId, farmerId, data, token);
  }

  static async deleteCrop(cropId: string, farmerId: string, token?: string): Promise<void> {
    return CropRepository.delete(cropId, farmerId, token);
  }
}

