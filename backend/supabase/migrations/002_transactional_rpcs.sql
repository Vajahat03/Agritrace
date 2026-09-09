-- AgriTrace Transactional Database Functions & RPCs
-- Supabase Migration: 002_transactional_rpcs.sql

-- 1. Atomic Harvest + Produce Batch + Initial Traceability Event
CREATE OR REPLACE FUNCTION public.fn_create_harvest_and_batch(
    p_crop_id UUID,
    p_farmer_id UUID,
    p_harvest_date DATE,
    p_quantity NUMERIC,
    p_unit TEXT,
    p_quality_grade TEXT,
    p_notes TEXT,
    p_batch_code TEXT,
    p_location TEXT
)
RETURNS JSONB AS $$
DECLARE
    v_crop RECORD;
    v_harvest_id UUID;
    v_batch_id UUID;
    v_event_id UUID;
BEGIN
    -- 1. Fetch Crop details & verify farmer ownership
    SELECT * INTO v_crop FROM public.crops WHERE id = p_crop_id AND farmer_id = p_farmer_id;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Crop not found or unauthorized for farmer %', p_farmer_id;
    END IF;

    -- 2. Create Harvest Record
    INSERT INTO public.harvests (
        crop_id, farmer_id, harvest_date, quantity, unit, quality_grade, notes
    ) VALUES (
        p_crop_id, p_farmer_id, p_harvest_date, p_quantity, p_unit, p_quality_grade, p_notes
    ) RETURNING id INTO v_harvest_id;

    -- 3. Create Produce Batch Record
    INSERT INTO public.produce_batches (
        batch_code, farmer_id, farm_id, plot_id, crop_id, harvest_id,
        crop_type, variety, harvest_date, initial_quantity, current_quantity,
        unit, quality_grade, current_status, current_owner_id, current_location
    ) VALUES (
        p_batch_code, p_farmer_id, v_crop.farm_id, v_crop.plot_id, p_crop_id, v_harvest_id,
        v_crop.crop_type, v_crop.variety, p_harvest_date, p_quantity, p_quantity,
        p_unit, p_quality_grade, 'HARVESTED', p_farmer_id, p_location
    ) RETURNING id INTO v_batch_id;

    -- 4. Append Immutable Initial Traceability Event
    INSERT INTO public.traceability_events (
        batch_id, event_type, actor_id, actor_role, location, notes, metadata
    ) VALUES (
        v_batch_id, 'HARVESTED', p_farmer_id, 'FARMER', p_location,
        'Harvest completed and produce batch minted.',
        jsonb_build_object(
            'quantity', p_quantity,
            'unit', p_unit,
            'quality_grade', p_quality_grade,
            'harvest_id', v_harvest_id
        )
    ) RETURNING id INTO v_event_id;

    -- 5. Return created identifiers
    RETURN jsonb_build_object(
        'harvest_id', v_harvest_id,
        'batch_id', v_batch_id,
        'batch_code', p_batch_code,
        'event_id', v_event_id,
        'status', 'HARVESTED'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Atomic Vendor Procurement + Batch Stock Deduct + Inventory Creation + Traceability Event
CREATE OR REPLACE FUNCTION public.fn_vendor_procure_batch(
    p_vendor_id UUID,
    p_batch_id UUID,
    p_quantity NUMERIC,
    p_purchase_price NUMERIC,
    p_purchase_date DATE,
    p_transport_details TEXT,
    p_location TEXT,
    p_notes TEXT
)
RETURNS JSONB AS $$
DECLARE
    v_batch RECORD;
    v_procurement_id UUID;
    v_inventory_id UUID;
    v_event_id UUID;
BEGIN
    -- 1. Lock Batch record for update and verify quantity
    SELECT * INTO v_batch FROM public.produce_batches WHERE id = p_batch_id FOR UPDATE;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Produce batch not found: %', p_batch_id;
    END IF;

    IF v_batch.current_quantity < p_quantity THEN
        RAISE EXCEPTION 'Insufficient batch quantity. Available: %, Requested: %', v_batch.current_quantity, p_quantity;
    END IF;

    -- 2. Record Vendor Procurement
    INSERT INTO public.vendor_procurement (
        vendor_id, batch_id, farmer_id, quantity, unit, purchase_price,
        purchase_date, quality_grade, transport_details, notes
    ) VALUES (
        p_vendor_id, p_batch_id, v_batch.farmer_id, p_quantity, v_batch.unit,
        p_purchase_price, p_purchase_date, v_batch.quality_grade, p_transport_details, p_notes
    ) RETURNING id INTO v_procurement_id;

    -- 3. Deduct quantity from batch and update status
    UPDATE public.produce_batches
    SET current_quantity = current_quantity - p_quantity,
        current_owner_id = p_vendor_id,
        current_status = CASE WHEN (current_quantity - p_quantity) = 0 THEN 'SOLD'::batch_status ELSE 'RECEIVED'::batch_status END,
        current_location = p_location,
        updated_at = NOW()
    WHERE id = p_batch_id;

    -- 4. Create / Update Vendor Inventory
    INSERT INTO public.vendor_inventory (
        vendor_id, batch_id, product_name, crop_type, quantity, unit, location, status, notes
    ) VALUES (
        p_vendor_id, p_batch_id, v_batch.crop_type || ' (' || v_batch.variety || ')',
        v_batch.crop_type, p_quantity, v_batch.unit, p_location, 'IN_STOCK', p_notes
    ) RETURNING id INTO v_inventory_id;

    -- 5. Append Immutable Traceability Event
    INSERT INTO public.traceability_events (
        batch_id, event_type, actor_id, actor_role, location, notes, metadata
    ) VALUES (
        p_batch_id, 'RECEIVED', p_vendor_id, 'VENDOR', p_location,
        'Produce batch procured and transferred to vendor inventory.',
        jsonb_build_object(
            'procured_quantity', p_quantity,
            'unit', v_batch.unit,
            'purchase_price', p_purchase_price,
            'procurement_id', v_procurement_id,
            'transport_details', p_transport_details
        )
    ) RETURNING id INTO v_event_id;

    RETURN jsonb_build_object(
        'procurement_id', v_procurement_id,
        'inventory_id', v_inventory_id,
        'batch_id', p_batch_id,
        'remaining_batch_quantity', (v_batch.current_quantity - p_quantity),
        'event_id', v_event_id
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Atomic Order Checkout + Stock Deduction + Order Items + Cart Clear
CREATE OR REPLACE FUNCTION public.fn_process_checkout(
    p_customer_id UUID,
    p_order_code TEXT,
    p_vendor_id UUID,
    p_delivery_address TEXT,
    p_contact_phone TEXT,
    p_notes TEXT,
    p_delivery_fee NUMERIC
)
RETURNS JSONB AS $$
DECLARE
    v_cart RECORD;
    v_item RECORD;
    v_product RECORD;
    v_subtotal NUMERIC(10, 2) := 0;
    v_total NUMERIC(10, 2) := 0;
    v_order_id UUID;
    v_item_count INTEGER := 0;
BEGIN
    -- 1. Find Customer Cart
    SELECT * INTO v_cart FROM public.carts WHERE customer_id = p_customer_id;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Cart not found for customer %', p_customer_id;
    END IF;

    -- 2. Validate Cart has items and calculate subtotal
    FOR v_item IN 
        SELECT ci.*, p.name as product_name, p.available_quantity, p.price_per_unit, p.batch_id
        FROM public.cart_items ci
        JOIN public.products p ON p.id = ci.product_id
        WHERE ci.cart_id = v_cart.id
        FOR UPDATE OF p
    LOOP
        IF v_item.available_quantity < v_item.quantity THEN
            RAISE EXCEPTION 'Insufficient stock for product "%". Available: %, Requested: %',
                v_item.product_name, v_item.available_quantity, v_item.quantity;
        END IF;

        v_subtotal := v_subtotal + (v_item.unit_price_snapshot * v_item.quantity);
        v_item_count := v_item_count + 1;
    END LOOP;

    IF v_item_count = 0 THEN
        RAISE EXCEPTION 'Cart is empty. Cannot checkout.';
    END IF;

    v_total := v_subtotal + COALESCE(p_delivery_fee, 0);

    -- 3. Create Order
    INSERT INTO public.orders (
        order_code, customer_id, vendor_id, status, subtotal,
        delivery_fee, total_amount, delivery_address, contact_phone, notes
    ) VALUES (
        p_order_code, p_customer_id, p_vendor_id, 'PLACED', v_subtotal,
        COALESCE(p_delivery_fee, 0), v_total, p_delivery_address, p_contact_phone, p_notes
    ) RETURNING id INTO v_order_id;

    -- 4. Create Order Items & Decrement Product Quantities
    FOR v_item IN 
        SELECT ci.*, p.name as product_name, p.batch_id
        FROM public.cart_items ci
        JOIN public.products p ON p.id = ci.product_id
        WHERE ci.cart_id = v_cart.id
    LOOP
        INSERT INTO public.order_items (
            order_id, product_id, batch_id, product_name_snapshot,
            unit_price, quantity, subtotal
        ) VALUES (
            v_order_id, v_item.product_id, v_item.batch_id, v_item.product_name,
            v_item.unit_price_snapshot, v_item.quantity, (v_item.unit_price_snapshot * v_item.quantity)
        );

        -- Decrement Product Stock
        UPDATE public.products
        SET available_quantity = available_quantity - v_item.quantity,
            updated_at = NOW()
        WHERE id = v_item.product_id;

        -- If batch associated, append traceability sale event
        IF v_item.batch_id IS NOT NULL THEN
            INSERT INTO public.traceability_events (
                batch_id, event_type, actor_id, actor_role, location, notes, metadata
            ) VALUES (
                v_item.batch_id, 'SOLD', p_customer_id, 'CUSTOMER', p_delivery_address,
                'Produce purchased in order ' || p_order_code,
                jsonb_build_object(
                    'order_id', v_order_id,
                    'order_code', p_order_code,
                    'quantity', v_item.quantity
                )
            );
        END IF;
    END LOOP;

    -- 5. Clear Cart
    DELETE FROM public.cart_items WHERE cart_id = v_cart.id;

    RETURN jsonb_build_object(
        'order_id', v_order_id,
        'order_code', p_order_code,
        'subtotal', v_subtotal,
        'delivery_fee', p_delivery_fee,
        'total_amount', v_total,
        'status', 'PLACED'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Atomic Freshness Bag Re-Scan Record & Bag Status Update
CREATE OR REPLACE FUNCTION public.fn_rescan_freshness_bag(
    p_bag_id UUID,
    p_customer_id UUID,
    p_image_url TEXT,
    p_freshness_score NUMERIC,
    p_remaining_shelf_life_days INTEGER,
    p_predicted_use_by_date DATE,
    p_lower_interval_days INTEGER,
    p_upper_interval_days INTEGER,
    p_model_name TEXT,
    p_model_version TEXT,
    p_storage_recommendation TEXT,
    p_metadata JSONB
)
RETURNS JSONB AS $$
DECLARE
    v_scan_id UUID;
BEGIN
    -- 1. Insert New Scan in scan history
    INSERT INTO public.freshness_scans (
        bag_id, customer_id, image_url, scan_date, freshness_score,
        remaining_shelf_life_days, predicted_use_by_date,
        prediction_interval_lower_days, prediction_interval_upper_days,
        model_name, model_version, prediction_timestamp, metadata
    ) VALUES (
        p_bag_id, p_customer_id, p_image_url, NOW(), p_freshness_score,
        p_remaining_shelf_life_days, p_predicted_use_by_date,
        p_lower_interval_days, p_upper_interval_days,
        p_model_name, p_model_version, NOW(), COALESCE(p_metadata, '{}'::jsonb)
    ) RETURNING id INTO v_scan_id;

    -- 2. Update Bag latest scan reference and storage recommendation
    UPDATE public.freshness_bags
    SET latest_scan_id = v_scan_id,
        storage_recommendation = COALESCE(p_storage_recommendation, storage_recommendation),
        updated_at = NOW()
    WHERE id = p_bag_id AND customer_id = p_customer_id;

    RETURN jsonb_build_object(
        'bag_id', p_bag_id,
        'scan_id', v_scan_id,
        'freshness_score', p_freshness_score,
        'remaining_shelf_life_days', p_remaining_shelf_life_days,
        'predicted_use_by_date', p_predicted_use_by_date,
        'prediction_interval_lower_days', p_lower_interval_days,
        'prediction_interval_upper_days', p_upper_interval_days,
        'model_name', p_model_name,
        'model_version', p_model_version
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
