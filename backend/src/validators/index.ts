import { z } from 'zod';

export const registerSchema = z.object({
  email: z.string().email(),
  fullName: z.string().min(2),
  role: z.enum(['CUSTOMER', 'FARMER', 'VENDOR', 'BUYER', 'TRANSPORTER', 'ADMIN']).default('CUSTOMER'),
  phone: z.string().optional(),
  languagePreference: z.enum(['en', 'hi', 'mr', 'ta', 'hinglish']).default('en'),
  address: z.string().optional(),
});

export const updateProfileSchema = z.object({
  fullName: z.string().min(2).optional(),
  phone: z.string().optional(),
  languagePreference: z.enum(['en', 'hi', 'mr', 'ta', 'hinglish']).optional(),
  address: z.string().optional(),
  avatarUrl: z.string().url().optional(),
});

export const farmSchema = z.object({
  name: z.string().min(2),
  locationName: z.string().min(2),
  address: z.string().optional(),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
  totalArea: z.number().positive(),
  areaUnit: z.string().default('acre'),
  soilInfo: z.string().optional(),
  notes: z.string().optional(),
});

export const plotSchema = z.object({
  farmId: z.string().uuid(),
  name: z.string().min(1),
  area: z.number().positive(),
  areaUnit: z.string().default('acre'),
  soilType: z.string().optional(),
  irrigationSource: z.string().optional(),
  notes: z.string().optional(),
});

export const cropSchema = z.object({
  farmId: z.string().uuid(),
  plotId: z.string().uuid(),
  cropType: z.string().min(2),
  variety: z.string().min(1),
  area: z.number().positive(),
  areaUnit: z.string().default('acre'),
  plantingDate: z.string(),
  expectedHarvestDate: z.string().optional(),
  status: z.enum(['PLANNING', 'GROWING', 'READY_FOR_HARVEST', 'HARVESTED', 'ARCHIVED']).default('GROWING'),
  notes: z.string().optional(),
  imageUrl: z.string().optional(),
});

export const fertilizerSchema = z.object({
  fertilizerName: z.string().min(2),
  fertilizerType: z.string().min(2),
  applicationDate: z.string(),
  quantity: z.number().positive(),
  unit: z.string().default('kg'),
  method: z.string().default('SOIL'),
  nValue: z.number().optional(),
  pValue: z.number().optional(),
  kValue: z.number().optional(),
  cost: z.number().min(0).optional().default(0),
  supplier: z.string().optional(),
  notes: z.string().optional(),
});

export const irrigationSchema = z.object({
  date: z.string(),
  method: z.string().default('DRIP'),
  durationMinutes: z.number().optional(),
  waterQuantity: z.number().optional(),
  unit: z.string().default('liters'),
  source: z.string().optional(),
  notes: z.string().optional(),
});

export const cropInputSchema = z.object({
  inputType: z.string().min(2),
  name: z.string().min(2),
  quantity: z.number().positive(),
  unit: z.string().default('kg'),
  applicationDate: z.string(),
  purpose: z.string().optional(),
  notes: z.string().optional(),
});

export const cropObservationSchema = z.object({
  observationType: z.string().min(2),
  description: z.string().min(2),
  severity: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']).default('LOW'),
  imageUrl: z.string().optional(),
});

export const harvestBatchSchema = z.object({
  harvestDate: z.string(),
  quantity: z.number().positive(),
  unit: z.string().default('kg'),
  qualityGrade: z.string().default('Grade A'),
  notes: z.string().optional(),
  location: z.string().optional(),
});

export const updateBatchStatusSchema = z.object({
  status: z.enum(['HARVESTED', 'STORED', 'LISTED', 'SOLD', 'IN_TRANSIT', 'RECEIVED', 'DELIVERED', 'PROCESSED', 'COMPLETED']),
  location: z.string().min(2),
  notes: z.string().optional(),
});

export const procurementSchema = z.object({
  batchId: z.string().uuid(),
  quantity: z.number().positive(),
  purchasePrice: z.number().positive(),
  purchaseDate: z.string(),
  transportDetails: z.string().optional(),
  location: z.string().optional(),
  notes: z.string().optional(),
});

export const inventoryAdjustSchema = z.object({
  adjustmentType: z.enum(['DAMAGE', 'DISCARD', 'SALE', 'CORRECTION']),
  quantityChange: z.number(),
  reason: z.string().min(2),
});

export const productSchema = z.object({
  batchId: z.string().uuid().optional(),
  name: z.string().min(2),
  cropType: z.string().min(2),
  variety: z.string().optional(),
  description: z.string().optional(),
  pricePerUnit: z.number().positive(),
  unit: z.string().default('kg'),
  availableQuantity: z.number().min(0),
  images: z.array(z.string()).default([]),
  qualityGrade: z.string().default('Grade A'),
  location: z.string().min(2),
  listingStatus: z.enum(['DRAFT', 'ACTIVE', 'PAUSED', 'SOLD_OUT']).default('ACTIVE'),
  minOrderQuantity: z.number().positive().default(1),
});

export const checkoutSchema = z.object({
  deliveryAddress: z.string().min(5),
  contactPhone: z.string().optional(),
  notes: z.string().optional(),
  deliveryFee: z.number().optional().default(50),
});

export const freshnessBagSchema = z.object({
  produceName: z.string().min(2),
  cropType: z.string().min(2),
  imageUrl: z.string(),
  freshnessScore: z.number().min(0).max(100),
  remainingShelfLifeDays: z.number().min(0),
  predictedUseByDate: z.string().optional(),
  predictionIntervalLowerDays: z.number().optional(),
  predictionIntervalUpperDays: z.number().optional(),
  storageRecommendation: z.string().optional(),
  modelName: z.string().optional(),
  modelVersion: z.string().optional(),
});

export const rescanSchema = z.object({
  imageUrl: z.string(),
  freshnessScore: z.number().min(0).max(100),
  remainingShelfLifeDays: z.number().min(0),
  predictedUseByDate: z.string().optional(),
  predictionIntervalLowerDays: z.number().optional(),
  predictionIntervalUpperDays: z.number().optional(),
  storageRecommendation: z.string().optional(),
});
