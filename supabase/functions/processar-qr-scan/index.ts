import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.75.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ScanRequest {
  qr_ref: string;
  device_fingerprint: string;
  fornecedor_nome?: string;
  user_agent?: string;
  ip_address?: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { qr_ref, device_fingerprint, fornecedor_nome, user_agent, ip_address }: ScanRequest = await req.json();

    console.log('📱 Processando escaneamento:', { qr_ref, device_fingerprint, fornecedor_nome });

    // 1. Buscar o pedido pelo QR Code
    const { data: pedido, error: pedidoError } = await supabase
      .from('pedidos')
      .select('id, status_geral, produto_modelo')
      .eq('qr_code_ref', qr_ref)
      .single();

    if (pedidoError || !pedido) {
      console.error('❌ Pedido não encontrado:', pedidoError);
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: '❌ QR Code inválido ou produção não encontrada.' 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 404 }
      );
    }

    // 2. Buscar as etapas da produção
    const { data: etapas, error: etapasError } = await supabase
      .from('etapas_producao')
      .select('id, tipo_etapa, status, ordem')
      .eq('pedido_id', pedido.id)
      .order('ordem', { ascending: true });

    if (etapasError || !etapas || etapas.length === 0) {
      console.error('❌ Erro ao buscar etapas:', etapasError);
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: '❌ Erro ao buscar etapas da produção.' 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
    }

    // 3. Encontrar primeira etapa pendente ou em andamento (cada etapa pode ser escaneada apenas uma vez)
    const proximaEtapa = etapas.find(e => e.status === 'pendente' || e.status === 'em_andamento');

    if (!proximaEtapa) {
      console.log('✅ Todas as etapas já foram concluídas');
      return new Response(
        JSON.stringify({
          success: false,
          completed: true,
          message: '✅ Esta produção já foi concluída! Todas as etapas foram finalizadas.',
          produto: pedido.produto_modelo
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    }

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
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: '❌ Erro ao atualizar etapa da produção.' 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
    }

    // 5. Iniciar automaticamente a próxima etapa se existir
    const proximaEtapaSeguinte = etapas.find(e => 
      e.ordem > proximaEtapa.ordem && e.status === 'pendente'
    );

    if (proximaEtapaSeguinte) {
      const { error: iniciarProximaError } = await supabase
        .from('etapas_producao')
        .update({
          status: 'em_andamento',
          data_inicio: new Date().toISOString()
        })
        .eq('id', proximaEtapaSeguinte.id);

      if (iniciarProximaError) {
        console.error('⚠️ Erro ao iniciar próxima etapa:', iniciarProximaError);
      } else {
        console.log('✅ Próxima etapa iniciada automaticamente:', proximaEtapaSeguinte.tipo_etapa);
      }
    }

    // 6. Registrar o escaneamento
    const { error: escaneamentoError } = await supabase
      .from('escaneamentos_qr')
      .insert({
        pedido_id: pedido.id,
        device_fingerprint,
        etapa_atualizada: proximaEtapa.tipo_etapa,
        fornecedor_nome,
        user_agent,
        ip_address
      });

    if (escaneamentoError) {
      console.error('❌ Erro ao registrar escaneamento:', escaneamentoError);
    }

    // 7. Formatar resposta
    const etapaNomeFormatado = proximaEtapa.tipo_etapa.replace(/_/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase());

    console.log('✅ Etapa atualizada com sucesso:', proximaEtapa.tipo_etapa);

    return new Response(
      JSON.stringify({
        success: true,
        message: `✅ Etapa "${etapaNomeFormatado}" finalizada com sucesso!`,
        etapa_concluida: proximaEtapa.tipo_etapa,
        produto: pedido.produto_modelo,
        proxima_etapa: proximaEtapaSeguinte ? proximaEtapaSeguinte.tipo_etapa : null,
        pedido_completo: !proximaEtapaSeguinte,
        qr_ref
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );

  } catch (error) {
    console.error('❌ Erro no processamento:', error);
    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
    return new Response(
      JSON.stringify({ 
        success: false, 
        message: '❌ Erro ao processar escaneamento.', 
        error: errorMessage 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
