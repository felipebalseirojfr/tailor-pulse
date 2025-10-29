import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.75.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
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
    
    if (!qrRef) {
      console.error('❌ QR ref não fornecida');
      return new Response(null, { status: 400 });
    }

    // Obter IP do cliente
    const clientIp = req.headers.get('x-forwarded-for') || 
                     req.headers.get('x-real-ip') || 
                     'unknown';

    console.log('📱 Processando QR scan automático:', { qrRef, clientIp });

    // 1. Buscar o pedido pelo QR Code
    const { data: pedido, error: pedidoError } = await supabase
      .from('pedidos')
      .select('id, status_geral, produto_modelo')
      .eq('qr_code_ref', qrRef)
      .single();

    if (pedidoError || !pedido) {
      console.error('❌ Pedido não encontrado:', pedidoError);
      return new Response(null, { status: 410 }); // Gone
    }

    // 2. Buscar as etapas da produção
    const { data: etapas, error: etapasError } = await supabase
      .from('etapas_producao')
      .select('id, tipo_etapa, status, ordem')
      .eq('pedido_id', pedido.id)
      .order('ordem', { ascending: true });

    if (etapasError || !etapas || etapas.length === 0) {
      console.error('❌ Erro ao buscar etapas:', etapasError);
      return new Response(null, { status: 500 });
    }

    // 3. Encontrar primeira etapa pendente ou em andamento
    const proximaEtapa = etapas.find(e => e.status === 'pendente' || e.status === 'em_andamento');

    if (!proximaEtapa) {
      console.log('✅ Todas as etapas já foram concluídas');
      return new Response(null, { status: 204 }); // No Content
    }

    const etapaAnterior = proximaEtapa.tipo_etapa;

    // 4. Atualizar a etapa atual para concluída
    const { error: updateEtapaError } = await supabase
      .from('etapas_producao')
      .update({
        status: 'concluido',
        data_termino: new Date().toISOString()
      })
      .eq('id', proximaEtapa.id);

    if (updateEtapaError) {
      console.error('❌ Erro ao atualizar etapa:', updateEtapaError);
      return new Response(null, { status: 500 });
    }

    // 5. Iniciar automaticamente a próxima etapa se existir
    const proximaEtapaSeguinte = etapas.find(e => 
      e.ordem > proximaEtapa.ordem && e.status === 'pendente'
    );

    if (proximaEtapaSeguinte) {
      await supabase
        .from('etapas_producao')
        .update({
          status: 'em_andamento',
          data_inicio: new Date().toISOString()
        })
        .eq('id', proximaEtapaSeguinte.id);

      console.log('✅ Próxima etapa iniciada:', proximaEtapaSeguinte.tipo_etapa);
    }

    // 6. Registrar o escaneamento
    await supabase
      .from('escaneamentos_qr')
      .insert({
        pedido_id: pedido.id,
        device_fingerprint: clientIp,
        etapa_atualizada: proximaEtapa.tipo_etapa,
        fornecedor_nome: 'Fornecedor',
        user_agent: req.headers.get('user-agent') || 'unknown',
        ip_address: clientIp
      });

    console.log('✅ Etapa atualizada automaticamente:', {
      etapaAnterior,
      novaEtapa: proximaEtapaSeguinte?.tipo_etapa || 'Finalizado'
    });

    // Retornar 204 No Content (sem corpo de resposta)
    return new Response(null, { 
      status: 204,
      headers: corsHeaders
    });

  } catch (error) {
    console.error('❌ Erro no processamento:', error);
    return new Response(null, { 
      status: 500,
      headers: corsHeaders
    });
  }
});