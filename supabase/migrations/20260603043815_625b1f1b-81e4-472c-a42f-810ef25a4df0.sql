-- Create referencias_fotos_piloto
CREATE TABLE public.referencias_fotos_piloto (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  referencia_id uuid NOT NULL REFERENCES public.referencias(id) ON DELETE CASCADE,
  lado text NOT NULL CHECK (lado IN ('frente','costas')),
  foto_url text NOT NULL,
  tamanho_bytes integer NULL,
  uploaded_by uuid NULL REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (referencia_id, lado)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.referencias_fotos_piloto TO authenticated;
GRANT ALL ON public.referencias_fotos_piloto TO service_role;

ALTER TABLE public.referencias_fotos_piloto ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin full access referencias_fotos_piloto"
ON public.referencias_fotos_piloto FOR ALL TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Viewer read referencias_fotos_piloto"
ON public.referencias_fotos_piloto FOR SELECT TO authenticated
USING (has_role(auth.uid(), 'viewer'::app_role));

CREATE TRIGGER trg_rfp_updated_at
BEFORE UPDATE ON public.referencias_fotos_piloto
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();