import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.75.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// URL base do app (será usada para redirect)
const getAppBaseUrl = () => {
  return 'https://pnqkollfbuqlrqvodrpt.lovableproject.com';
};

// Função para criar redirect URL
const createRedirectUrl = (sucesso: boolean, mensagem?: string) => {
  const baseUrl = getAppBaseUrl();
  if (sucesso) {
    return `${baseUrl}/scan-resultado?status=sucesso`;
  } else {
    const msg = encodeURIComponent(mensagem || 'Erro ao processar QR Code.');
    return `${baseUrl}/scan-resultado?status=erro&msg=${msg}`;
  }
};

// Headers para redirect
const redirectHeaders = (location: string) => ({
  'Location': location,
  'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
});

serve(async (req) => {
  const userAgent = req.headers.get('user-agent') || 'unknown';
  console.log('📲 Request recebido:', { method: req.method, url: req.url, userAgent });

  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const url = new URL(req.url);
    const qrRef = url.searchParams.get('ref');

    // Validação de entrada
    if (!qrRef || typeof qrRef !== 'string') {
      console.error('❌ QR ref inválido ou ausente');
      const redirectUrl = createRedirectUrl(false, 'QR Code inválido.');
      console.log('🔄 Redirect para:', redirectUrl);
      return new Response(null, { 
        status: 302, 
        headers: redirectHeaders(redirectUrl) 
      });
    }
    
    // Validar formato do qrRef
    if (!qrRef.match(/^PROD-[A-Z0-9]{8}$/)) {
      console.error('⚠️ Formato de QR inválido:', qrRef);
      const redirectUrl = createRedirectUrl(false, 'QR Code não reconhecido.');
      console.log('🔄 Redirect para:', redirectUrl);
      return new Response(null, { 
        status: 302, 
        headers: redirectHeaders(redirectUrl) 
      });
    }

    const clientIp = req.headers.get('x-forwarded-for') || 
                     req.headers.get('x-real-ip') || 
                     'unknown';

    console.log('📱 Processando QR scan:', { qrRef, clientIp });

    // 1. Buscar o pedido pelo QR Code
    const { data: pedido, error: pedidoError } = await supabase
      .from('pedidos')
      .select('id, status_geral, produto_modelo')
      .eq('qr_code_ref', qrRef)
      .single();

    if (pedidoError || !pedido) {
      console.error('❌ Pedido não encontrado:', qrRef);
      const redirectUrl = createRedirectUrl(false, 'Pedido não encontrado.');
      console.log('🔄 Redirect para:', redirectUrl);
      return new Response(null, { 
        status: 302, 
        headers: redirectHeaders(redirectUrl) 
      });
    }
    
    if (pedido.status_geral === 'cancelado') {
      console.error('⚠️ Pedido cancelado:', qrRef);
      const redirectUrl = createRedirectUrl(false, 'Pedido cancelado.');
      console.log('🔄 Redirect para:', redirectUrl);
      return new Response(null, { 
        status: 302, 
        headers: redirectHeaders(redirectUrl) 
      });
    }

    // 2. Verificar se é o primeiro scan
    const { data: escaneamentosAnteriores } = await supabase
      .from('escaneamentos_qr')
      .select('id')
      .eq('pedido_id', pedido.id)
      .limit(1);

    const isPrimeiroScan = !escaneamentosAnteriores || escaneamentosAnteriores.length === 0;

    // 3. Buscar as etapas da produção
    const { data: etapas, error: etapasError } = await supabase
      .from('etapas_producao')
      .select('id, tipo_etapa, status, ordem')
      .eq('pedido_id', pedido.id)
      .order('ordem', { ascending: true });

    if (etapasError || !etapas || etapas.length === 0) {
      console.error('❌ Erro ao buscar etapas:', etapasError);
      const redirectUrl = createRedirectUrl(false, 'Erro no sistema.');
      console.log('🔄 Redirect para:', redirectUrl);
      return new Response(null, { 
        status: 302, 
        headers: redirectHeaders(redirectUrl) 
      });
    }

    const primeiraEtapa = etapas[0];

    // 4. PRIMEIRO SCAN → INICIAR PRODUÇÃO
    if (isPrimeiroScan) {
      console.log('🚀 Primeiro scan - Iniciando produção');

      await supabase
        .from('pedidos')
        .update({ status_geral: 'em_producao' })
        .eq('id', pedido.id);

      await supabase
        .from('etapas_producao')
        .update({
          status: 'em_andamento',
          data_inicio: new Date().toISOString()
        })
        .eq('id', primeiraEtapa.id);

      await supabase
        .from('escaneamentos_qr')
        .insert({
          pedido_id: pedido.id,
          device_fingerprint: clientIp,
          etapa_atualizada: primeiraEtapa.tipo_etapa,
          fornecedor_nome: 'Sistema',
          user_agent: userAgent,
          ip_address: clientIp
        });

      console.log('✅ Produção iniciada');
      const redirectUrl = createRedirectUrl(true);
      console.log('🔄 Redirect para:', redirectUrl);
      return new Response(null, { 
        status: 302, 
        headers: redirectHeaders(redirectUrl) 
      });
    }

    // 5. SCANS SUBSEQUENTES → AVANÇAR ETAPA
    const etapaAtual = etapas.find(e => e.status === 'pendente' || e.status === 'em_andamento');

    if (!etapaAtual) {
      console.log('✅ Todas as etapas já concluídas');
      const redirectUrl = createRedirectUrl(true);
      console.log('🔄 Redirect para:', redirectUrl);
      return new Response(null, { 
        status: 302, 
        headers: redirectHeaders(redirectUrl) 
      });
    }

    // Concluir etapa atual
    await supabase
      .from('etapas_producao')
      .update({
        status: 'concluido',
        data_termino: new Date().toISOString()
      })
      .eq('id', etapaAtual.id);

    // Iniciar próxima etapa se existir
    const proximaEtapa = etapas.find(e => 
      e.ordem > etapaAtual.ordem && e.status === 'pendente'
    );

    if (proximaEtapa) {
      await supabase
        .from('etapas_producao')
        .update({
          status: 'em_andamento',
          data_inicio: new Date().toISOString()
        })
        .eq('id', proximaEtapa.id);
    }

    // Registrar escaneamento
    await supabase
      .from('escaneamentos_qr')
      .insert({
        pedido_id: pedido.id,
        device_fingerprint: clientIp,
        etapa_atualizada: etapaAtual.tipo_etapa,
        fornecedor_nome: 'Fornecedor',
        user_agent: userAgent,
        ip_address: clientIp
      });

    console.log('✅ Etapa avançada:', etapaAtual.tipo_etapa);
    const redirectUrl = createRedirectUrl(true);
    console.log('🔄 Redirect para:', redirectUrl);
    return new Response(null, { 
      status: 302, 
      headers: redirectHeaders(redirectUrl) 
    });

  } catch (error) {
    console.error('❌ Erro:', error);
    const redirectUrl = createRedirectUrl(false, 'Erro inesperado.');
    console.log('🔄 Redirect para:', redirectUrl);
    return new Response(null, { 
      status: 302, 
      headers: redirectHeaders(redirectUrl) 
    });
  }
});
