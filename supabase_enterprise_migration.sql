-- 1. DRIVERS TABLE
CREATE TABLE IF NOT EXISTS public.drivers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name TEXT NOT NULL,
    phone TEXT,
    license_number TEXT,
    status TEXT DEFAULT 'available' CHECK (status IN ('available', 'on_trip', 'off_duty')),
    current_location TEXT,
    rating DECIMAL(2,1),
    avatar_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. DISPATCH ROUTES TABLE
CREATE TABLE IF NOT EXISTS public.dispatch_routes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    shipment_id UUID REFERENCES public.shipments(id) ON DELETE CASCADE,
    driver_id UUID REFERENCES public.drivers(id) ON DELETE SET NULL,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'completed', 'diverted')),
    stops JSONB DEFAULT '[]'::jsonb,
    current_stop_index INTEGER DEFAULT 0,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. NOTIFICATIONS TABLE (Already mentioned in previous prompts, but reinforced here)
CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    shipment_id UUID REFERENCES public.shipments(id) ON DELETE SET NULL,
    type TEXT CHECK (type IN ('delay', 'risk', 'delivery', 'system')),
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. ENABLE RLS
ALTER TABLE public.drivers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dispatch_routes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- 5. ACCESS POLICIES
CREATE POLICY "Users can manage their own drivers" ON public.drivers
    FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their own routes" ON public.dispatch_routes
    FOR ALL USING (EXISTS (
        SELECT 1 FROM public.shipments 
        WHERE shipments.id = dispatch_routes.shipment_id 
        AND shipments.user_id = auth.uid()
    ));

CREATE POLICY "Users can manage their own notifications" ON public.notifications
    FOR ALL USING (auth.uid() = user_id);

-- 6. RE-ENABLE REALTIME
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
ALTER PUBLICATION supabase_realtime ADD TABLE public.shipments;
ALTER PUBLICATION supabase_realtime ADD TABLE public.dispatch_routes;
