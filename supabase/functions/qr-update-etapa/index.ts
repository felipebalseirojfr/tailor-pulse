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

    // 2. Verificar se é o primeiro scan (checando escaneamentos anteriores)
    const { data: escaneamentosAnteriores, error: scanError } = await supabase
      .from('escaneamentos_qr')
      .select('id')
      .eq('pedido_id', pedido.id)
      .limit(1);

    const isPrimeiroScan = !scanError && (!escaneamentosAnteriores || escaneamentosAnteriores.length === 0);

    console.log('🔍 Status do scan:', { 
      isPrimeiroScan, 
      statusAtual: pedido.status_geral 
    });

    // 3. Buscar as etapas da produção
    const { data: etapas, error: etapasError } = await supabase
      .from('etapas_producao')
      .select('id, tipo_etapa, status, ordem')
      .eq('pedido_id', pedido.id)
      .order('ordem', { ascending: true });

    if (etapasError || !etapas || etapas.length === 0) {
      console.error('❌ Erro ao buscar etapas:', etapasError);
      return new Response(null, { status: 500 });
    }

    const primeiraEtapa = etapas[0];

    // 4. SE FOR O PRIMEIRO SCAN → INICIAR PRODUÇÃO
    if (isPrimeiroScan) {
      console.log('🚀 PRIMEIRO SCAN DETECTADO - Iniciando produção');

      // 4.1 Atualizar status do pedido para "em_producao"
      const { error: updatePedidoError } = await supabase
        .from('pedidos')
        .update({
          status_geral: 'em_producao'
        })
        .eq('id', pedido.id);

      if (updatePedidoError) {
        console.error('❌ Erro ao iniciar produção:', updatePedidoError);
        return new Response(null, { status: 500 });
      }

      // 4.2 Iniciar a primeira etapa
      const { error: iniciarEtapaError } = await supabase
        .from('etapas_producao')
        .update({
          status: 'em_andamento',
          data_inicio: new Date().toISOString()
        })
        .eq('id', primeiraEtapa.id);

      if (iniciarEtapaError) {
        console.error('❌ Erro ao iniciar primeira etapa:', iniciarEtapaError);
        return new Response(null, { status: 500 });
      }

      // 4.3 Registrar o escaneamento inicial
      await supabase
        .from('escaneamentos_qr')
        .insert({
          pedido_id: pedido.id,
          device_fingerprint: clientIp,
          etapa_atualizada: primeiraEtapa.tipo_etapa,
          fornecedor_nome: 'Sistema',
          user_agent: req.headers.get('user-agent') || 'unknown',
          ip_address: clientIp
        });

      console.log('✅ PRODUÇÃO INICIADA:', {
        pedidoId: pedido.id,
        primeiraEtapa: primeiraEtapa.tipo_etapa,
        status: 'em_producao'
      });

      return new Response(null, { 
        status: 204,
        headers: corsHeaders
      });
    }

    // 5. SE NÃO FOR O PRIMEIRO SCAN → SEGUIR FLUXO NORMAL

    // 5.1 Encontrar etapa atual (pendente ou em andamento)
    const etapaAtual = etapas.find(e => e.status === 'pendente' || e.status === 'em_andamento');

    if (!etapaAtual) {
      console.log('✅ Todas as etapas já foram concluídas');
      return new Response(null, { status: 204 }); // No Content
    }

    // 5.2 Concluir etapa atual
    const { error: updateEtapaError } = await supabase
      .from('etapas_producao')
      .update({
        status: 'concluido',
        data_termino: new Date().toISOString()
      })
      .eq('id', etapaAtual.id);

    if (updateEtapaError) {
      console.error('❌ Erro ao concluir etapa:', updateEtapaError);
      return new Response(null, { status: 500 });
    }

    // 5.3 Iniciar próxima etapa se existir
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

      console.log('✅ Próxima etapa iniciada:', proximaEtapa.tipo_etapa);
    }

    // 5.4 Registrar o escaneamento
    await supabase
      .from('escaneamentos_qr')
      .insert({
        pedido_id: pedido.id,
        device_fingerprint: clientIp,
        etapa_atualizada: etapaAtual.tipo_etapa,
        fornecedor_nome: 'Fornecedor',
        user_agent: req.headers.get('user-agent') || 'unknown',
        ip_address: clientIp
      });

    console.log('✅ Etapa avançada:', {
      etapaConcluida: etapaAtual.tipo_etapa,
      proximaEtapa: proximaEtapa?.tipo_etapa || 'Finalizado'
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