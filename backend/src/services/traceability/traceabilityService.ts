import QRCode from 'qrcode';
import { BatchRepository, TraceabilityRepository } from '../../repositories/batchTraceRepository';
import { ProduceBatch, TraceabilityEvent } from '../../types';

export class TraceabilityService {
  static async getBatchTraceability(batchIdOrCode: string): Promise<{
    batch: ProduceBatch;
    timeline: TraceabilityEvent[];
    originInfo: {
      farmName?: string;
      location?: string;
      cropType: string;
      variety: string;
      harvestDate: string;
      qualityGrade: string;
    };
    verificationStatus: {
      isVerified: boolean;
      statusText: string;
      stagesCompleted: string[];
    };
  }> {
    // Lookup by ID or code
    let batch = await BatchRepository.findById(batchIdOrCode);
    if (!batch) {
      batch = await BatchRepository.findByCode(batchIdOrCode);
    }
    if (!batch) {
      throw new Error(`Batch with identifier "${batchIdOrCode}" was not found.`);
    }

    const timeline = await TraceabilityRepository.findByBatch(batch.id);

    const stagesCompleted = Array.from(new Set(timeline.map((e) => e.event_type)));
    const hasHarvest = stagesCompleted.includes('HARVESTED');
    const isVerified = hasHarvest && timeline.length >= 1;

    return {
      batch,
      timeline,
      originInfo: {
        farmName: (batch as any).farm?.name || 'Registered AgriTrace Partner Farm',
        location: (batch as any).farm?.location_name || batch.current_location || 'Maharashtra, India',
        cropType: batch.crop_type,
        variety: batch.variety,
        harvestDate: batch.harvest_date,
        qualityGrade: batch.quality_grade,
      },
      verificationStatus: {
        isVerified,
        statusText: isVerified ? 'Traceability verified' : 'Traceability in progress',
        stagesCompleted,
      },
    };
  }

  static async generateQRCodeDataUrl(batchIdOrCode: string, baseUrl?: string): Promise<string> {
    const domain = baseUrl || 'http://localhost:3000';
    const traceUrl = `${domain}/trace/batch/${batchIdOrCode}`;

    return QRCode.toDataURL(traceUrl, {
      errorCorrectionLevel: 'H',
      margin: 2,
      width: 300,
      color: {
        dark: '#1B4332',
        light: '#FFFFFF',
      },
    });
  }
}
