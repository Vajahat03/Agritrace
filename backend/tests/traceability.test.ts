import { TraceabilityService } from '../src/services/traceability/traceabilityService';
import { BatchRepository, TraceabilityRepository } from '../src/repositories/batchTraceRepository';

jest.mock('../src/repositories/batchTraceRepository');

describe('Traceability Ledger and Verification Suite', () => {
  const mockBatchId = '33333333-3333-3333-3333-333333333333';

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('Traceability verifies complete lineage from Harvest to Distribution', async () => {
    const mockBatch = {
      id: mockBatchId,
      batch_code: 'TOM-2026-0001',
      crop_type: 'Tomato',
      variety: 'Roma',
      harvest_date: '2026-09-01',
      quality_grade: 'Grade A',
      initial_quantity: 500,
      current_quantity: 200,
      unit: 'kg',
      current_status: 'RECEIVED',
      farm: { name: 'Green Valley Farm', location_name: 'Nashik, Maharashtra' },
    };

    const mockTimeline = [
      {
        id: 'evt-1',
        batch_id: mockBatchId,
        event_type: 'HARVESTED',
        actor_id: 'farmer-1',
        actor_role: 'FARMER',
        location: 'Nashik, Maharashtra',
        notes: 'Harvest completed',
        created_at: '2026-09-01T08:00:00Z',
      },
      {
        id: 'evt-2',
        batch_id: mockBatchId,
        event_type: 'RECEIVED',
        actor_id: 'vendor-1',
        actor_role: 'VENDOR',
        location: 'Mumbai Central Hub',
        notes: 'Procured for retail',
        created_at: '2026-09-02T10:00:00Z',
      },
    ];

    (BatchRepository.findById as jest.Mock).mockResolvedValueOnce(mockBatch);
    (TraceabilityRepository.findByBatch as jest.Mock).mockResolvedValueOnce(mockTimeline);

    const result = await TraceabilityService.getBatchTraceability(mockBatchId);

    expect(result.verificationStatus.isVerified).toBe(true);
    expect(result.verificationStatus.statusText).toBe('Traceability verified');
    expect(result.timeline.length).toBe(2);
    expect(result.originInfo.cropType).toBe('Tomato');
  });
});
