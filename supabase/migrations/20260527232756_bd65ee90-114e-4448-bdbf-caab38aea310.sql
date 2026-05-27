
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'corte' AND enumtypid = 'app_role'::regtype) THEN
    ALTER TYPE app_role ADD VALUE 'corte';
  END IF;
END$$;
