
-- SQL Migration to create a garage for olivier@andre.org.uk and associate all data

DO $$
DECLARE
    v_user_id UUID;
    v_garage_id UUID;
BEGIN
    -- Get user ID for the email
    SELECT id INTO v_user_id FROM auth.users WHERE email = 'olivier@andre.org.uk';
    
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'User with email olivier@andre.org.uk not found';
    END IF;

    -- Check if the garage already exists
    SELECT id INTO v_garage_id FROM public.garages WHERE slug = 'tractic';
    
    -- If garage doesn't exist, create it
    IF v_garage_id IS NULL THEN
        INSERT INTO public.garages (
            name, 
            slug, 
            settings
        ) VALUES (
            'Tractic', 
            'tractic',
            jsonb_build_object(
                'workingHours', jsonb_build_object(
                    'monday', jsonb_build_object('open', '09:00', 'close', '17:00'),
                    'tuesday', jsonb_build_object('open', '09:00', 'close', '17:00'),
                    'wednesday', jsonb_build_object('open', '09:00', 'close', '17:00'),
                    'thursday', jsonb_build_object('open', '09:00', 'close', '17:00'),
                    'friday', jsonb_build_object('open', '09:00', 'close', '17:00'),
                    'saturday', jsonb_build_object('open', '10:00', 'close', '15:00'),
                    'sunday', jsonb_build_object('open', '', 'close', '')
                ),
                'serviceTypes', jsonb_build_array('Oil Change', 'Tire Rotation', 'Brake Service'),
                'currency', 'USD'
            )
        ) RETURNING id INTO v_garage_id;
        
        RAISE NOTICE 'Created new garage "Tractic" with ID %', v_garage_id;
    ELSE
        RAISE NOTICE 'Using existing garage "Tractic" with ID %', v_garage_id;
    END IF;

    -- Check if the user is already an owner of the garage
    IF NOT EXISTS (
        SELECT 1 FROM public.garage_members 
        WHERE user_id = v_user_id AND garage_id = v_garage_id AND role = 'owner'
    ) THEN
        -- Add the user as an owner of the garage
        INSERT INTO public.garage_members (
            user_id,
            garage_id,
            role
        ) VALUES (
            v_user_id,
            v_garage_id,
            'owner'
        );
        RAISE NOTICE 'Added user % as owner of garage %', v_user_id, v_garage_id;
    ELSE
        RAISE NOTICE 'User % is already an owner of garage %', v_user_id, v_garage_id;
    END IF;

    -- Set user role to administrator if not already set
    INSERT INTO public.user_roles (user_id, role)
    VALUES (v_user_id, 'administrator')
    ON CONFLICT (user_id, role) DO NOTHING;

    -- Update all existing clients to be associated with this garage
    UPDATE public.clients
    SET garage_id = v_garage_id
    WHERE garage_id IS NULL;

    -- Update all existing vehicles to be associated with this garage
    UPDATE public.vehicles
    SET garage_id = v_garage_id
    WHERE garage_id IS NULL;

    -- Update all existing appointments to be associated with this garage
    UPDATE public.appointments
    SET garage_id = v_garage_id
    WHERE garage_id IS NULL;

    -- Update all existing job tickets to be associated with this garage
    UPDATE public.job_tickets
    SET garage_id = v_garage_id
    WHERE garage_id IS NULL;

    RAISE NOTICE 'Successfully associated all data with garage "Tractic" (ID %) for user %', v_garage_id, v_user_id;
END $$;
