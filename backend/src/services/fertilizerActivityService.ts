import {
  FertilizerRepository,
  IrrigationRepository,
  CropInputRepository,
  CropObservationRepository,
  HarvestRepository,
} from '../repositories/fertilizerActivityRepository';
import {
  FertilizerApplication,
  IrrigationRecord,
  CropInput,
  CropObservation,
  Harvest,
} from '../types';

export class FertilizerService {
  static async getFertilizerHistory(
    cropId: string,
    farmerId: string,
    token?: string
  ): Promise<{ records: FertilizerApplication[]; totalQuantity: number; totalCost: number }> {
    const records = await FertilizerRepository.findByCrop(cropId, farmerId, token);
    const totalQuantity = records.reduce((acc, r) => acc + (Number(r.quantity) || 0), 0);
    const totalCost = records.reduce((acc, r) => acc + (Number(r.cost) || 0), 0);

    return {
      records,
      totalQuantity,
      totalCost,
    };
  }

  // Critical requirement: Every fertilizer application creates a NEW independent historical record.
  static async addFertilizerRecord(
    cropId: string,
    farmerId: string,
    data: {
      fertilizerName: string;
      fertilizerType: string;
      applicationDate: string;
      quantity: number;
      unit: string;
      method: string;
      nValue?: number;
      pValue?: number;
      kValue?: number;
      cost?: number;
      supplier?: string;
      notes?: string;
    },
    token?: string
  ): Promise<FertilizerApplication> {
    return FertilizerRepository.create(
      {
        crop_id: cropId,
        farmer_id: farmerId,
        fertilizer_name: data.fertilizerName,
        fertilizer_type: data.fertilizerType,
        application_date: data.applicationDate,
        quantity: data.quantity,
        unit: data.unit,
        method: data.method,
        n_value: data.nValue,
        p_value: data.pValue,
        k_value: data.kValue,
        cost: data.cost || 0,
        supplier: data.supplier,
        notes: data.notes,
      },
      token
    );
  }

  // Modifies ONLY the selected historical application record.
  static async updateFertilizerRecord(
    id: string,
    farmerId: string,
    updates: Partial<FertilizerApplication>,
    token?: string
  ): Promise<FertilizerApplication> {
    return FertilizerRepository.update(id, farmerId, updates, token);
  }

  static async deleteFertilizerRecord(id: string, farmerId: string, token?: string): Promise<void> {
    return FertilizerRepository.delete(id, farmerId, token);
  }
}

export class IrrigationService {
  static async getIrrigationHistory(cropId: string, farmerId: string, token?: string): Promise<IrrigationRecord[]> {
    return IrrigationRepository.findByCrop(cropId, farmerId, token);
  }

  static async addIrrigationRecord(
    cropId: string,
    farmerId: string,
    data: Partial<IrrigationRecord>,
    token?: string
  ): Promise<IrrigationRecord> {
    return IrrigationRepository.create({ ...data, crop_id: cropId, farmer_id: farmerId }, token);
  }

  static async deleteIrrigationRecord(id: string, farmerId: string, token?: string): Promise<void> {
    return IrrigationRepository.delete(id, farmerId, token);
  }
}

export class CropInputService {
  static async getInputsHistory(cropId: string, farmerId: string, token?: string): Promise<CropInput[]> {
    return CropInputRepository.findByCrop(cropId, farmerId, token);
  }

  static async addCropInput(
    cropId: string,
    farmerId: string,
    data: Partial<CropInput>,
    token?: string
  ): Promise<CropInput> {
    return CropInputRepository.create({ ...data, crop_id: cropId, farmer_id: farmerId }, token);
  }
}

export class CropObservationService {
  static async getObservations(cropId: string, farmerId: string, token?: string): Promise<CropObservation[]> {
    return CropObservationRepository.findByCrop(cropId, farmerId, token);
  }

  static async addObservation(
    cropId: string,
    farmerId: string,
    data: Partial<CropObservation>,
    token?: string
  ): Promise<CropObservation> {
    return CropObservationRepository.create({ ...data, crop_id: cropId, farmer_id: farmerId }, token);
  }
}

export class HarvestService {
  static async getHarvestHistory(cropId: string, farmerId: string, token?: string): Promise<Harvest[]> {
    return HarvestRepository.findByCrop(cropId, farmerId, token);
  }
}
