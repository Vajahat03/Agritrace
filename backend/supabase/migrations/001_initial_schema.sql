-- AgriTrace Initial PostgreSQL Schema & RLS Policies
-- Supabase Migration: 001_initial_schema.sql

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Custom ENUM Types
DO $$ BEGIN
    CREATE TYPE user_role AS ENUM ('CUSTOMER', 'FARMER', 'VENDOR', 'BUYER', 'TRANSPORTER', 'ADMIN');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE crop_status AS ENUM ('PLANNING', 'GROWING', 'READY_FOR_HARVEST', 'HARVESTED', 'ARCHIVED');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE batch_status AS ENUM ('HARVESTED', 'STORED', 'LISTED', 'SOLD', 'IN_TRANSIT', 'RECEIVED', 'DELIVERED', 'PROCESSED', 'COMPLETED');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE order_status AS ENUM ('PLACED', 'CONFIRMED', 'PROCESSING', 'READY', 'SHIPPED', 'IN_TRANSIT', 'DELIVERED', 'CANCELLED');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE bag_status AS ENUM ('ACTIVE', 'CONSUMED', 'DISCARDED');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE listing_status AS ENUM ('DRAFT', 'ACTIVE', 'PAUSED', 'SOLD_OUT');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 1. Users Profile Table (Extends auth.users)
CREATE TABLE IF NOT EXISTS public.users (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT UNIQUE NOT NULL,
    full_name TEXT NOT NULL,
    phone TEXT,
    role user_role NOT NULL DEFAULT 'CUSTOMER',
    language_preference TEXT NOT NULL DEFAULT 'en',
    avatar_url TEXT,
    address TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Farms Table
CREATE TABLE IF NOT EXISTS public.farms (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    farmer_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    location_name TEXT NOT NULL,
    address TEXT,
    latitude DOUBLE PRECISION,
    longitude DOUBLE PRECISION,
    total_area NUMERIC(10, 2) NOT NULL,
    area_unit TEXT NOT NULL DEFAULT 'acre',
    soil_info TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_farms_farmer ON public.farms(farmer_id);

-- 3. Plots Table
CREATE TABLE IF NOT EXISTS public.plots (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    farm_id UUID NOT NULL REFERENCES public.farms(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    area NUMERIC(10, 2) NOT NULL,
    area_unit TEXT NOT NULL DEFAULT 'acre',
    soil_type TEXT,
    irrigation_source TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_plots_farm ON public.plots(farm_id);

-- 4. Crops Table (Multiple crops supported simultaneously per plot/farm)
CREATE TABLE IF NOT EXISTS public.crops (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    farmer_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    farm_id UUID NOT NULL REFERENCES public.farms(id) ON DELETE CASCADE,
    plot_id UUID NOT NULL REFERENCES public.plots(id) ON DELETE CASCADE,
    crop_type TEXT NOT NULL,
    variety TEXT NOT NULL,
    area NUMERIC(10, 2) NOT NULL,
    area_unit TEXT NOT NULL DEFAULT 'acre',
    planting_date DATE NOT NULL,
    expected_harvest_date DATE,
    status crop_status NOT NULL DEFAULT 'GROWING',
    notes TEXT,
    image_url TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_crops_farmer ON public.crops(farmer_id);
CREATE INDEX IF NOT EXISTS idx_crops_plot ON public.crops(plot_id);
CREATE INDEX IF NOT EXISTS idx_crops_status ON public.crops(status);

-- 5. Fertilizer Applications (Independent historical entries; editing modifies only selected record)
CREATE TABLE IF NOT EXISTS public.fertilizer_applications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    crop_id UUID NOT NULL REFERENCES public.crops(id) ON DELETE CASCADE,
    farmer_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    fertilizer_name TEXT NOT NULL,
    fertilizer_type TEXT NOT NULL, -- Urea, NPK, Organic, Compost, etc.
    application_date DATE NOT NULL,
    quantity NUMERIC(10, 2) NOT NULL,
    unit TEXT NOT NULL DEFAULT 'kg',
    method TEXT NOT NULL DEFAULT 'SOIL', -- SOIL, FOLIAR, DRIP, BROADCAST
    n_value NUMERIC(5, 2),
    p_value NUMERIC(5, 2),
    k_value NUMERIC(5, 2),
    cost NUMERIC(10, 2) DEFAULT 0,
    supplier TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_fertilizer_crop ON public.fertilizer_applications(crop_id);
CREATE INDEX IF NOT EXISTS idx_fertilizer_date ON public.fertilizer_applications(application_date);

-- 6. Irrigation Records
CREATE TABLE IF NOT EXISTS public.irrigation_records (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    crop_id UUID NOT NULL REFERENCES public.crops(id) ON DELETE CASCADE,
    farmer_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    method TEXT NOT NULL DEFAULT 'DRIP', -- DRIP, SPRINKLER, FLOOD, MANUAL
    duration_minutes INTEGER,
    water_quantity NUMERIC(10, 2),
    unit TEXT DEFAULT 'liters',
    source TEXT, -- BOREWELL, CANAL, RAINWATER, RIVER
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_irrigation_crop ON public.irrigation_records(crop_id);

-- 7. Crop Inputs (Pesticides, bio-stimulants, micronutrients)
CREATE TABLE IF NOT EXISTS public.crop_inputs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    crop_id UUID NOT NULL REFERENCES public.crops(id) ON DELETE CASCADE,
    farmer_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    input_type TEXT NOT NULL, -- PESTICIDE, FUNGICIDE, HERBICIDE, GROWTH_REGULATOR
    name TEXT NOT NULL,
    quantity NUMERIC(10, 2) NOT NULL,
    unit TEXT NOT NULL,
    application_date DATE NOT NULL,
    purpose TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_crop_inputs_crop ON public.crop_inputs(crop_id);

-- 8. Crop Observations (Field inspections, pest/disease alerts)
CREATE TABLE IF NOT EXISTS public.crop_observations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    crop_id UUID NOT NULL REFERENCES public.crops(id) ON DELETE CASCADE,
    farmer_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    observation_type TEXT NOT NULL, -- PEST, DISEASE, NUTRIENT_DEFICIENCY, GENERAL
    description TEXT NOT NULL,
    severity TEXT DEFAULT 'LOW', -- LOW, MEDIUM, HIGH, CRITICAL
    image_url TEXT,
    recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_observations_crop ON public.crop_observations(crop_id);

-- 9. Harvests Table
CREATE TABLE IF NOT EXISTS public.harvests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    crop_id UUID NOT NULL REFERENCES public.crops(id) ON DELETE CASCADE,
    farmer_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    harvest_date DATE NOT NULL,
    quantity NUMERIC(10, 2) NOT NULL,
    unit TEXT NOT NULL DEFAULT 'kg',
    quality_grade TEXT DEFAULT 'Grade A',
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_harvests_crop ON public.harvests(crop_id);

-- 10. Produce Batches Table
CREATE TABLE IF NOT EXISTS public.produce_batches (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    batch_code TEXT UNIQUE NOT NULL, -- e.g. TOM-2026-0001
    farmer_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    farm_id UUID NOT NULL REFERENCES public.farms(id) ON DELETE CASCADE,
    plot_id UUID NOT NULL REFERENCES public.plots(id) ON DELETE CASCADE,
    crop_id UUID NOT NULL REFERENCES public.crops(id) ON DELETE CASCADE,
    harvest_id UUID NOT NULL REFERENCES public.harvests(id) ON DELETE CASCADE,
    crop_type TEXT NOT NULL,
    variety TEXT NOT NULL,
    harvest_date DATE NOT NULL,
    initial_quantity NUMERIC(10, 2) NOT NULL,
    current_quantity NUMERIC(10, 2) NOT NULL,
    unit TEXT NOT NULL DEFAULT 'kg',
    quality_grade TEXT DEFAULT 'Grade A',
    current_status batch_status NOT NULL DEFAULT 'HARVESTED',
    current_owner_id UUID NOT NULL REFERENCES public.users(id),
    current_location TEXT,
    qr_code_url TEXT,
    blockchain_hash TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_batches_code ON public.produce_batches(batch_code);
CREATE INDEX IF NOT EXISTS idx_batches_farmer ON public.produce_batches(farmer_id);
CREATE INDEX IF NOT EXISTS idx_batches_owner ON public.produce_batches(current_owner_id);

-- 11. Traceability Events Table (Strictly append-only immutable ledger)
CREATE TABLE IF NOT EXISTS public.traceability_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    batch_id UUID NOT NULL REFERENCES public.produce_batches(id) ON DELETE CASCADE,
    event_type TEXT NOT NULL, -- HARVESTED, STORED, LISTED, SOLD, IN_TRANSIT, RECEIVED, DELIVERED, PROCESSED, INSPECTED
    actor_id UUID NOT NULL REFERENCES public.users(id),
    actor_role user_role NOT NULL,
    location TEXT NOT NULL,
    notes TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_trace_batch ON public.traceability_events(batch_id);
CREATE INDEX IF NOT EXISTS idx_trace_created ON public.traceability_events(created_at);

-- Trigger to block UPDATE or DELETE on traceability_events to guarantee immutability
CREATE OR REPLACE FUNCTION fn_prevent_traceability_mutation()
RETURNS TRIGGER AS $$
BEGIN
    RAISE EXCEPTION 'Traceability events are immutable and cannot be updated or deleted.';
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_prevent_traceability_update ON public.traceability_events;
CREATE TRIGGER trg_prevent_traceability_update
BEFORE UPDATE OR DELETE ON public.traceability_events
FOR EACH ROW EXECUTE FUNCTION fn_prevent_traceability_mutation();

-- 12. Vendor Procurement Table
CREATE TABLE IF NOT EXISTS public.vendor_procurement (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    vendor_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    batch_id UUID NOT NULL REFERENCES public.produce_batches(id) ON DELETE CASCADE,
    farmer_id UUID NOT NULL REFERENCES public.users(id),
    quantity NUMERIC(10, 2) NOT NULL,
    unit TEXT NOT NULL DEFAULT 'kg',
    purchase_price NUMERIC(10, 2) NOT NULL,
    purchase_date DATE NOT NULL,
    quality_grade TEXT DEFAULT 'Grade A',
    transport_details TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_procurement_vendor ON public.vendor_procurement(vendor_id);

-- 13. Vendor Inventory Table
CREATE TABLE IF NOT EXISTS public.vendor_inventory (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    vendor_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    batch_id UUID NOT NULL REFERENCES public.produce_batches(id) ON DELETE CASCADE,
    product_name TEXT NOT NULL,
    crop_type TEXT NOT NULL,
    quantity NUMERIC(10, 2) NOT NULL,
    unit TEXT NOT NULL DEFAULT 'kg',
    location TEXT,
    status TEXT NOT NULL DEFAULT 'IN_STOCK', -- IN_STOCK, LOW_STOCK, EXHAUSTED, DAMAGED
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_inventory_vendor ON public.vendor_inventory(vendor_id);

-- 14. Inventory Adjustments Table
CREATE TABLE IF NOT EXISTS public.inventory_adjustments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    inventory_id UUID NOT NULL REFERENCES public.vendor_inventory(id) ON DELETE CASCADE,
    vendor_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    adjustment_type TEXT NOT NULL, -- DAMAGE, DISCARD, SALE, CORRECTION
    quantity_change NUMERIC(10, 2) NOT NULL,
    reason TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 15. Products & Marketplace Listings
CREATE TABLE IF NOT EXISTS public.products (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    vendor_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    batch_id UUID REFERENCES public.produce_batches(id),
    name TEXT NOT NULL,
    crop_type TEXT NOT NULL,
    variety TEXT,
    description TEXT,
    price_per_unit NUMERIC(10, 2) NOT NULL,
    unit TEXT NOT NULL DEFAULT 'kg',
    available_quantity NUMERIC(10, 2) NOT NULL,
    images TEXT[] DEFAULT ARRAY[]::TEXT[],
    quality_grade TEXT DEFAULT 'Grade A',
    location TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_products_vendor ON public.products(vendor_id);
CREATE INDEX IF NOT EXISTS idx_products_crop ON public.products(crop_type);

CREATE TABLE IF NOT EXISTS public.marketplace_listings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
    vendor_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    listing_status listing_status NOT NULL DEFAULT 'ACTIVE',
    min_order_quantity NUMERIC(10, 2) DEFAULT 1,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_listings_status ON public.marketplace_listings(listing_status);

-- 16. Carts and Cart Items
CREATE TABLE IF NOT EXISTS public.carts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    customer_id UUID UNIQUE NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.cart_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    cart_id UUID NOT NULL REFERENCES public.carts(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
    quantity NUMERIC(10, 2) NOT NULL,
    unit_price_snapshot NUMERIC(10, 2) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(cart_id, product_id)
);
CREATE INDEX IF NOT EXISTS idx_cart_items_cart ON public.cart_items(cart_id);

-- 17. Orders and Order Items (Preserving historical prices and batch references)
CREATE TABLE IF NOT EXISTS public.orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_code TEXT UNIQUE NOT NULL, -- e.g. ORD-2026-0001
    customer_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    vendor_id UUID NOT NULL REFERENCES public.users(id),
    status order_status NOT NULL DEFAULT 'PLACED',
    subtotal NUMERIC(10, 2) NOT NULL,
    delivery_fee NUMERIC(10, 2) NOT NULL DEFAULT 0,
    total_amount NUMERIC(10, 2) NOT NULL,
    delivery_address TEXT NOT NULL,
    contact_phone TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_orders_customer ON public.orders(customer_id);
CREATE INDEX IF NOT EXISTS idx_orders_vendor ON public.orders(vendor_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON public.orders(status);

CREATE TABLE IF NOT EXISTS public.order_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES public.products(id),
    batch_id UUID REFERENCES public.produce_batches(id),
    product_name_snapshot TEXT NOT NULL,
    unit_price NUMERIC(10, 2) NOT NULL,
    quantity NUMERIC(10, 2) NOT NULL,
    subtotal NUMERIC(10, 2) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_order_items_order ON public.order_items(order_id);

-- 18. Customer Favorites
CREATE TABLE IF NOT EXISTS public.favorites (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    customer_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(customer_id, product_id)
);

-- 19. Freshness Bag & Calibrated Uncertainty Freshness Scans (Multi-scan lifecycle)
CREATE TABLE IF NOT EXISTS public.freshness_bags (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    customer_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    produce_name TEXT NOT NULL,
    crop_type TEXT NOT NULL,
    current_status bag_status NOT NULL DEFAULT 'ACTIVE',
    storage_recommendation TEXT,
    latest_scan_id UUID,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_bag_customer ON public.freshness_bags(customer_id);

CREATE TABLE IF NOT EXISTS public.freshness_scans (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    bag_id UUID NOT NULL REFERENCES public.freshness_bags(id) ON DELETE CASCADE,
    customer_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    image_url TEXT NOT NULL,
    scan_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    freshness_score NUMERIC(5, 2) NOT NULL, -- e.g. 92.5 %
    remaining_shelf_life_days INTEGER NOT NULL, -- Point estimate
    predicted_use_by_date DATE NOT NULL,
    prediction_interval_lower_days INTEGER NOT NULL, -- Calibrated uncertainty lower bound
    prediction_interval_upper_days INTEGER NOT NULL, -- Calibrated uncertainty upper bound
    model_name TEXT NOT NULL DEFAULT 'agritrace-multimodal-shelf-v1',
    model_version TEXT NOT NULL DEFAULT '1.0.0',
    prediction_timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_scans_bag ON public.freshness_scans(bag_id);

-- Add foreign key back to freshness_bags for latest_scan_id
ALTER TABLE public.freshness_bags
ADD CONSTRAINT fk_bag_latest_scan
FOREIGN KEY (latest_scan_id)
REFERENCES public.freshness_scans(id)
ON DELETE SET NULL;

-- 20. Weather Observations & Cache
CREATE TABLE IF NOT EXISTS public.weather_observations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    farm_id UUID REFERENCES public.farms(id) ON DELETE SET NULL,
    location_key TEXT NOT NULL,
    latitude DOUBLE PRECISION NOT NULL,
    longitude DOUBLE PRECISION NOT NULL,
    observation_time TIMESTAMPTZ NOT NULL,
    temperature NUMERIC(5, 2) NOT NULL,
    humidity NUMERIC(5, 2) NOT NULL,
    rainfall_mm NUMERIC(6, 2) DEFAULT 0,
    wind_speed_kmh NUMERIC(5, 2) DEFAULT 0,
    weather_condition TEXT NOT NULL,
    raw_data JSONB DEFAULT '{}'::jsonb,
    is_forecast BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_weather_location ON public.weather_observations(location_key, observation_time);

CREATE TABLE IF NOT EXISTS public.weather_cache (
    location_key TEXT PRIMARY KEY,
    latitude DOUBLE PRECISION NOT NULL,
    longitude DOUBLE PRECISION NOT NULL,
    current_data JSONB NOT NULL,
    forecast_data JSONB NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 21. Notifications Table
CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    type TEXT NOT NULL, -- WEATHER_ALERT, HARVEST_REMINDER, ORDER_UPDATE, FRESHNESS_ALERT, INVENTORY_ALERT
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    severity TEXT NOT NULL DEFAULT 'INFO', -- INFO, SUCCESS, WARNING, CRITICAL
    read BOOLEAN NOT NULL DEFAULT FALSE,
    scheduled_for TIMESTAMPTZ DEFAULT NOW(),
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON public.notifications(user_id, read);

-- 22. AI Predictions & Provenance Ledger (For Price & Vision Intelligence)
CREATE TABLE IF NOT EXISTS public.ai_predictions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    task_type TEXT NOT NULL, -- PRICE_PREDICTION, FRESHNESS, VISION, RAG, AGENT
    model_name TEXT NOT NULL,
    model_version TEXT NOT NULL,
    input_reference TEXT NOT NULL,
    prediction JSONB NOT NULL,
    uncertainty JSONB NOT NULL, -- Prediction intervals / variance
    dataset_source TEXT, -- e.g. AGMARKNET / OGD
    dataset_version TEXT,
    weather_data_source TEXT,
    feature_version TEXT,
    prediction_timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_ai_task ON public.ai_predictions(task_type, created_at);

-- 23. Audit Logs Table
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
    role user_role,
    action TEXT NOT NULL,
    resource_type TEXT NOT NULL,
    resource_id TEXT,
    ip_address TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_audit_user ON public.audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_created ON public.audit_logs(created_at);

-- ==========================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ==========================================

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.farms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.plots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crops ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fertilizer_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.irrigation_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crop_inputs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crop_observations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.harvests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.produce_batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.traceability_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vendor_procurement ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vendor_inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.marketplace_listings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.carts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cart_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.favorites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.freshness_bags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.freshness_scans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Users: Users can read and update their own profile
CREATE POLICY "Users can view own profile" ON public.users FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON public.users FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Public profiles can be viewed for vendor/farmer display" ON public.users FOR SELECT USING (role IN ('FARMER', 'VENDOR'));

-- Farms: Farmers can manage their own farms
CREATE POLICY "Farmers can manage own farms" ON public.farms FOR ALL USING (auth.uid() = farmer_id);

-- Plots: Farmers can manage plots belonging to their farms
CREATE POLICY "Farmers can manage own plots" ON public.plots FOR ALL USING (
    EXISTS (SELECT 1 FROM public.farms WHERE farms.id = plots.farm_id AND farms.farmer_id = auth.uid())
);

-- Crops: Farmers can manage their own crops
CREATE POLICY "Farmers can manage own crops" ON public.crops FOR ALL USING (auth.uid() = farmer_id);

-- Fertilizer Applications: Farmers manage their own fertilizer records
CREATE POLICY "Farmers can manage own fertilizer logs" ON public.fertilizer_applications FOR ALL USING (auth.uid() = farmer_id);

-- Irrigation, Inputs, Observations, Harvests: Farmers manage their own logs
CREATE POLICY "Farmers can manage own irrigation" ON public.irrigation_records FOR ALL USING (auth.uid() = farmer_id);
CREATE POLICY "Farmers can manage own crop inputs" ON public.crop_inputs FOR ALL USING (auth.uid() = farmer_id);
CREATE POLICY "Farmers can manage own crop observations" ON public.crop_observations FOR ALL USING (auth.uid() = farmer_id);
CREATE POLICY "Farmers can manage own harvests" ON public.harvests FOR ALL USING (auth.uid() = farmer_id);

-- Produce Batches: Farmers can manage their created batches; everyone can view for traceability
CREATE POLICY "Farmers can manage own batches" ON public.produce_batches FOR ALL USING (auth.uid() = farmer_id OR auth.uid() = current_owner_id);
CREATE POLICY "Anyone can view batches for public traceability" ON public.produce_batches FOR SELECT USING (true);

-- Traceability Events: Public read access for batch lineage verification; authenticated users can append events
CREATE POLICY "Public read for traceability events" ON public.traceability_events FOR SELECT USING (true);
CREATE POLICY "Authenticated users can insert traceability events" ON public.traceability_events FOR INSERT WITH CHECK (auth.uid() = actor_id);

-- Vendor Procurement: Vendors can view and manage their own procurements
CREATE POLICY "Vendors can manage own procurement" ON public.vendor_procurement FOR ALL USING (auth.uid() = vendor_id);

-- Vendor Inventory: Vendors can manage their own inventory
CREATE POLICY "Vendors can manage own inventory" ON public.vendor_inventory FOR ALL USING (auth.uid() = vendor_id);

-- Products & Listings: Public can view active listings; vendors manage their own products
CREATE POLICY "Public can view products" ON public.products FOR SELECT USING (true);
CREATE POLICY "Vendors manage own products" ON public.products FOR ALL USING (auth.uid() = vendor_id);
CREATE POLICY "Public can view active marketplace listings" ON public.marketplace_listings FOR SELECT USING (listing_status = 'ACTIVE');
CREATE POLICY "Vendors manage own listings" ON public.marketplace_listings FOR ALL USING (auth.uid() = vendor_id);

-- Carts & Cart Items: Customers manage their own carts
CREATE POLICY "Customers manage own cart" ON public.carts FOR ALL USING (auth.uid() = customer_id);
CREATE POLICY "Customers manage own cart items" ON public.cart_items FOR ALL USING (
    EXISTS (SELECT 1 FROM public.carts WHERE carts.id = cart_items.cart_id AND carts.customer_id = auth.uid())
);

-- Orders: Customers view own orders; Vendors view orders assigned to them
CREATE POLICY "Customers view own orders" ON public.orders FOR SELECT USING (auth.uid() = customer_id);
CREATE POLICY "Vendors view assigned orders" ON public.orders FOR SELECT USING (auth.uid() = vendor_id);
CREATE POLICY "Vendors can update assigned order status" ON public.orders FOR UPDATE USING (auth.uid() = vendor_id);
CREATE POLICY "Customers create orders" ON public.orders FOR INSERT WITH CHECK (auth.uid() = customer_id);

CREATE POLICY "Order items viewable by customer and vendor" ON public.order_items FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.orders WHERE orders.id = order_items.order_id AND (orders.customer_id = auth.uid() OR orders.vendor_id = auth.uid()))
);

-- Favorites: Customers manage own favorites
CREATE POLICY "Customers manage own favorites" ON public.favorites FOR ALL USING (auth.uid() = customer_id);

-- Freshness Bag & Scans: Customers manage their own freshness bags and scans
CREATE POLICY "Customers manage own freshness bags" ON public.freshness_bags FOR ALL USING (auth.uid() = customer_id);
CREATE POLICY "Customers manage own freshness scans" ON public.freshness_scans FOR ALL USING (auth.uid() = customer_id);

-- Notifications: Users manage own notifications
CREATE POLICY "Users view own notifications" ON public.notifications FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users update own notifications" ON public.notifications FOR UPDATE USING (auth.uid() = user_id);
