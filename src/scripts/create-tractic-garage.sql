
-- SQL Migration to create a garage for olivier@andre.org.uk and associate all data

-- First, get the user ID
DO $$
DECLARE
    user_id UUID;
    garage_id UUID;
BEGIN
    -- Get user ID for the email
    SELECT id INTO user_id FROM auth.users WHERE email = 'olivier@andre.org.uk';
    
    IF user_id IS NULL THEN
        RAISE EXCEPTION 'User with email olivier@andre.org.uk not found';
    END IF;

    -- Insert the new garage
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
    ) RETURNING id INTO garage_id;

    -- Add the user as an owner of the garage
    INSERT INTO public.garage_members (
        user_id,
        garage_id,
        role
    ) VALUES (
        user_id,
        garage_id,
        'owner'
    );

    -- Set user role to administrator if not already set
    INSERT INTO public.user_roles (user_id, role)
    VALUES (user_id, 'administrator')
    ON CONFLICT (user_id, role) DO NOTHING;

    -- Update all existing clients to be associated with this garage
    UPDATE public.clients
    SET garage_id = garage_id
    WHERE garage_id IS NULL;

    -- Update all existing vehicles to be associated with this garage
    UPDATE public.vehicles
    SET garage_id = garage_id
    WHERE garage_id IS NULL;

    -- Update all existing appointments to be associated with this garage
    UPDATE public.appointments
    SET garage_id = garage_id
    WHERE garage_id IS NULL;

    -- Update all existing job tickets to be associated with this garage
    UPDATE public.job_tickets
    SET garage_id = garage_id
    WHERE garage_id IS NULL;

    RAISE NOTICE 'Successfully created garage "Tractic" with ID % for user %', garage_id, user_id;
END $$;
