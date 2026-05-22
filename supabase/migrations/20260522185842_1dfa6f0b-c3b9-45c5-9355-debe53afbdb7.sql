
-- 1) fechamentos: restrict SELECT to admin/commercial/backoffice_fiscal/pcp_closer
DROP POLICY IF EXISTS "Authenticated can view fechamentos" ON public.fechamentos;
CREATE POLICY "Authorized roles can view fechamentos"
  ON public.fechamentos FOR SELECT
  TO authenticated
  USING (has_any_role(auth.uid(), ARRAY['admin'::app_role,'commercial'::app_role,'backoffice_fiscal'::app_role,'pcp_closer'::app_role]));

-- 2) nf-files bucket -> private, role-restricted access
UPDATE storage.buckets SET public = false WHERE id = 'nf-files';

DROP POLICY IF EXISTS "Public read nf-files" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated upload nf-files" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated update nf-files" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated delete nf-files" ON storage.objects;

CREATE POLICY "Authorized roles read nf-files"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'nf-files' AND has_any_role(auth.uid(), ARRAY['admin'::app_role,'commercial'::app_role,'backoffice_fiscal'::app_role,'pcp_closer'::app_role]));

CREATE POLICY "Authorized roles upload nf-files"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'nf-files' AND has_any_role(auth.uid(), ARRAY['admin'::app_role,'commercial'::app_role,'backoffice_fiscal'::app_role,'pcp_closer'::app_role]));

CREATE POLICY "Authorized roles update nf-files"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'nf-files' AND has_any_role(auth.uid(), ARRAY['admin'::app_role,'commercial'::app_role,'backoffice_fiscal'::app_role,'pcp_closer'::app_role]));

CREATE POLICY "Admin delete nf-files"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'nf-files' AND has_role(auth.uid(), 'admin'::app_role));

-- 3) qrcodes bucket: restrict INSERT/UPDATE/DELETE to authenticated (edge function uses service role and bypasses RLS)
DROP POLICY IF EXISTS "Allow public uploads to qrcodes" ON storage.objects;
DROP POLICY IF EXISTS "Allow public insert qrcodes" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can upload qrcodes" ON storage.objects;

DO $$
DECLARE p record;
BEGIN
  FOR p IN
    SELECT policyname FROM pg_policies
    WHERE schemaname='storage' AND tablename='objects'
      AND qual ILIKE '%qrcodes%' AND cmd='INSERT'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON storage.objects', p.policyname);
  END LOOP;
  FOR p IN
    SELECT policyname FROM pg_policies
    WHERE schemaname='storage' AND tablename='objects'
      AND with_check ILIKE '%qrcodes%' AND cmd='INSERT'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON storage.objects', p.policyname);
  END LOOP;
END $$;

CREATE POLICY "Authenticated upload qrcodes"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'qrcodes');

-- 4) terceiros: restrict to admin/commercial/production
DROP POLICY IF EXISTS "Usuários autenticados podem ver terceiros" ON public.terceiros;
DROP POLICY IF EXISTS "Usuários autenticados podem criar terceiros" ON public.terceiros;
DROP POLICY IF EXISTS "Usuários autenticados podem atualizar terceiros" ON public.terceiros;
DROP POLICY IF EXISTS "Usuários autenticados podem deletar terceiros" ON public.terceiros;

CREATE POLICY "Authorized roles view terceiros"
  ON public.terceiros FOR SELECT TO authenticated
  USING (has_any_role(auth.uid(), ARRAY['admin'::app_role,'commercial'::app_role,'production'::app_role,'viewer'::app_role]));

CREATE POLICY "Admin/commercial insert terceiros"
  ON public.terceiros FOR INSERT TO authenticated
  WITH CHECK (has_any_role(auth.uid(), ARRAY['admin'::app_role,'commercial'::app_role]));

CREATE POLICY "Admin/commercial update terceiros"
  ON public.terceiros FOR UPDATE TO authenticated
  USING (has_any_role(auth.uid(), ARRAY['admin'::app_role,'commercial'::app_role]));

CREATE POLICY "Admin delete terceiros"
  ON public.terceiros FOR DELETE TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

-- 5) Revoke EXECUTE on internal trigger/utility SECURITY DEFINER functions
REVOKE EXECUTE ON FUNCTION public.gerar_codigo_pedido() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.sync_fechamento_acabamento() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_user_role() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.atualizar_status_cliente() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.update_updated_at_column() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.trigger_fn_gerar_codigo_op() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.atualizar_progresso_pedido() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.gerar_qr_code_ref() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.gerar_codigo_op() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.atualizar_totais_pedido() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.gerar_codigo_op_aleatorio() FROM PUBLIC, anon, authenticated;
