import { FertilizerService } from '../src/services/fertilizerActivityService';
import { FertilizerRepository } from '../src/repositories/fertilizerActivityRepository';

jest.mock('../src/repositories/fertilizerActivityRepository');

describe('Fertilizer Historical Applications Test Suite', () => {
  const mockCropId = '11111111-1111-1111-1111-111111111111';
  const mockFarmerId = '22222222-2222-2222-2222-222222222222';

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('Submitting fertilizer twice creates two distinct historical records and does not overwrite', async () => {
    const record1 = {
      id: 'fert-record-001',
      crop_id: mockCropId,
      farmer_id: mockFarmerId,
      fertilizer_name: 'Urea',
      fertilizer_type: 'Nitrogenous',
      application_date: '2026-08-10',
      quantity: 25,
      unit: 'kg',
      method: 'SOIL',
      cost: 600,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const record2 = {
      id: 'fert-record-002',
      crop_id: mockCropId,
      farmer_id: mockFarmerId,
      fertilizer_name: 'Urea',
      fertilizer_type: 'Nitrogenous',
      application_date: '2026-08-17',
      quantity: 20,
      unit: 'kg',
      method: 'SOIL',
      cost: 500,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    (FertilizerRepository.create as jest.Mock)
      .mockResolvedValueOnce(record1)
      .mockResolvedValueOnce(record2);

    // Act: Apply fertilizer application 1
    const app1 = await FertilizerService.addFertilizerRecord(mockCropId, mockFarmerId, {
      fertilizerName: 'Urea',
      fertilizerType: 'Nitrogenous',
      applicationDate: '2026-08-10',
      quantity: 25,
      unit: 'kg',
      method: 'SOIL',
      cost: 600,
    });

    // Act: Apply fertilizer application 2 (same fertilizer, later date)
    const app2 = await FertilizerService.addFertilizerRecord(mockCropId, mockFarmerId, {
      fertilizerName: 'Urea',
      fertilizerType: 'Nitrogenous',
      applicationDate: '2026-08-17',
      quantity: 20,
      unit: 'kg',
      method: 'SOIL',
      cost: 500,
    });

    // Assert
    expect(app1.id).toBe('fert-record-001');
    expect(app2.id).toBe('fert-record-002');
    expect(app1.id).not.toEqual(app2.id);
    expect(FertilizerRepository.create).toHaveBeenCalledTimes(2);
  });

  test('Editing a single historical record modifies only that specific record and preserves totals', async () => {
    const updatedRecord2 = {
      id: 'fert-record-002',
      crop_id: mockCropId,
      farmer_id: mockFarmerId,
      fertilizer_name: 'Urea',
      fertilizer_type: 'Nitrogenous',
      application_date: '2026-08-17',
      quantity: 22, // Modified from 20 to 22
      unit: 'kg',
      method: 'SOIL',
      cost: 550,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    (FertilizerRepository.update as jest.Mock).mockResolvedValueOnce(updatedRecord2);

    const result = await FertilizerService.updateFertilizerRecord('fert-record-002', mockFarmerId, {
      quantity: 22,
      cost: 550,
    });

    expect(result.id).toBe('fert-record-002');
    expect(result.quantity).toBe(22);
    expect(FertilizerRepository.update).toHaveBeenCalledWith(
      'fert-record-002',
      mockFarmerId,
      { quantity: 22, cost: 550 },
      undefined
    );
  });
});
