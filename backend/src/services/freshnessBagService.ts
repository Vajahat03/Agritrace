import { FreshnessRepository } from '../repositories/freshnessRepository';
import { FreshnessBagItem, FreshnessScan, BagStatus } from '../types';

export class FreshnessBagService {
  static async getCustomerBag(
    customerId: string,
    status?: BagStatus,
    token?: string
  ): Promise<FreshnessBagItem[]> {
    return FreshnessRepository.findByCustomer(customerId, status, token);
  }

  static async getBagItemDetails(
    bagId: string,
    customerId: string,
    token?: string
  ): Promise<FreshnessBagItem | null> {
    return FreshnessRepository.findById(bagId, customerId, token);
  }

  // Create Produce Freshness Bag item with initial scan
  static async addProduceToBag(
    customerId: string,
    data: {
      produceName: string;
      cropType: string;
      imageUrl: string;
      freshnessScore: number;
      remainingShelfLifeDays: number;
      predictedUseByDate?: string;
      predictionIntervalLowerDays?: number;
      predictionIntervalUpperDays?: number;
      storageRecommendation?: string;
      modelName?: string;
      modelVersion?: string;
      metadata?: Record<string, any>;
    },
    token?: string
  ): Promise<FreshnessBagItem> {
    // Calculate predicted use by date if not provided
    const predictedDate =
      data.predictedUseByDate ||
      new Date(Date.now() + data.remainingShelfLifeDays * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    // Default uncertainty intervals if not explicitly provided
    const lowerDays = data.predictionIntervalLowerDays ?? Math.max(1, data.remainingShelfLifeDays - 1);
    const upperDays = data.predictionIntervalUpperDays ?? data.remainingShelfLifeDays + 2;

    return FreshnessRepository.createBagWithInitialScan(
      {
        customerId,
        produceName: data.produceName,
        cropType: data.cropType,
        storageRecommendation: data.storageRecommendation || 'Store in a cool, ventilated container away from direct sunlight.',
        imageUrl: data.imageUrl,
        freshnessScore: data.freshnessScore,
        remainingShelfLifeDays: data.remainingShelfLifeDays,
        predictedUseByDate: predictedDate,
        predictionIntervalLowerDays: lowerDays,
        predictionIntervalUpperDays: upperDays,
        modelName: data.modelName,
        modelVersion: data.modelVersion,
        metadata: data.metadata,
      },
      token
    );
  }

  // Record a Re-Scan (Appends to historical scans, updates latest assessment)
  static async rescanProduce(
    bagId: string,
    customerId: string,
    data: {
      imageUrl: string;
      freshnessScore: number;
      remainingShelfLifeDays: number;
      predictedUseByDate?: string;
      predictionIntervalLowerDays?: number;
      predictionIntervalUpperDays?: number;
      storageRecommendation?: string;
      modelName?: string;
      modelVersion?: string;
      metadata?: Record<string, any>;
    },
    token?: string
  ): Promise<FreshnessScan> {
    const predictedDate =
      data.predictedUseByDate ||
      new Date(Date.now() + data.remainingShelfLifeDays * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    const lowerDays = data.predictionIntervalLowerDays ?? Math.max(1, data.remainingShelfLifeDays - 1);
    const upperDays = data.predictionIntervalUpperDays ?? data.remainingShelfLifeDays + 2;

    return FreshnessRepository.recordReScan(
      bagId,
      customerId,
      {
        imageUrl: data.imageUrl,
        freshnessScore: data.freshnessScore,
        remainingShelfLifeDays: data.remainingShelfLifeDays,
        predictedUseByDate: predictedDate,
        predictionIntervalLowerDays: lowerDays,
        predictionIntervalUpperDays: upperDays,
        storageRecommendation: data.storageRecommendation,
        modelName: data.modelName,
        modelVersion: data.modelVersion,
        metadata: data.metadata,
      },
      token
    );
  }

  static async markItemStatus(
    bagId: string,
    customerId: string,
    status: BagStatus,
    token?: string
  ): Promise<FreshnessBagItem> {
    return FreshnessRepository.updateStatus(bagId, customerId, status, token);
  }
}
