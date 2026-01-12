import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.75.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Função para gerar página HTML simples de agradecimento
function gerarHtmlAgradecimento(sucesso: boolean, mensagem?: string) {
  const cor = sucesso ? '#10b981' : '#ef4444';
  const icone = sucesso ? '✓' : '✕';
  const titulo = sucesso ? 'Obrigado!' : 'Erro';
  const texto = sucesso 
    ? 'Etapa atualizada com sucesso.' 
    : (mensagem || 'Ocorreu um erro ao processar.');

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${titulo}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%);
      padding: 20px;
    }
    .card {
      background: white;
      border-radius: 16px;
      padding: 48px 32px;
      max-width: 360px;
      width: 100%;
      text-align: center;
      box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
    }
    .icon {
      width: 100px;
      height: 100px;
      border-radius: 50%;
      background: ${cor};
      color: white;
      font-size: 50px;
      display: flex;
      align-items: center;
      justify-content: center;
      margin: 0 auto 24px;
    }
    h1 {
      color: #1e293b;
      font-size: 32px;
      margin-bottom: 12px;
    }
    .mensagem {
      color: #64748b;
      font-size: 18px;
      line-height: 1.5;
    }
  </style>
</head>
<body>
  <div class="card">
    <div class="icon">${icone}</div>
    <h1>${titulo}</h1>
    <p class="mensagem">${texto}</p>
  </div>
</body>
</html>`;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const htmlHeaders = {
    ...corsHeaders,
    'Content-Type': 'text/html; charset=utf-8'
  };

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const url = new URL(req.url);
    const qrRef = url.searchParams.get('ref');
    
    // Validação de entrada
    if (!qrRef || typeof qrRef !== 'string') {
      console.error('❌ QR ref inválido ou ausente');
      return new Response(
        gerarHtmlAgradecimento(false, 'QR Code inválido.'),
        { status: 400, headers: htmlHeaders }
      );
    }
    
    // Validar formato do qrRef
    if (!qrRef.match(/^PROD-[A-Z0-9]{8}$/)) {
      console.error('⚠️ Formato de QR inválido:', qrRef);
      return new Response(
        gerarHtmlAgradecimento(false, 'QR Code não reconhecido.'),
        { status: 400, headers: htmlHeaders }
      );
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
      return new Response(
        gerarHtmlAgradecimento(false, 'Pedido não encontrado.'),
        { status: 410, headers: htmlHeaders }
      );
    }
    
    if (pedido.status_geral === 'cancelado') {
      console.error('⚠️ Pedido cancelado:', qrRef);
      return new Response(
        gerarHtmlAgradecimento(false, 'Pedido cancelado.'),
        { status: 403, headers: htmlHeaders }
      );
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
      return new Response(
        gerarHtmlAgradecimento(false, 'Erro no sistema.'),
        { status: 500, headers: htmlHeaders }
      );
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
          user_agent: req.headers.get('user-agent') || 'unknown',
          ip_address: clientIp
        });

      console.log('✅ Produção iniciada');

      return new Response(
        gerarHtmlAgradecimento(true),
        { status: 200, headers: htmlHeaders }
      );
    }

    // 5. SCANS SUBSEQUENTES → AVANÇAR ETAPA

    const etapaAtual = etapas.find(e => e.status === 'pendente' || e.status === 'em_andamento');

    if (!etapaAtual) {
      console.log('✅ Todas as etapas já concluídas');
      return new Response(
        gerarHtmlAgradecimento(true),
        { status: 200, headers: htmlHeaders }
      );
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
        user_agent: req.headers.get('user-agent') || 'unknown',
        ip_address: clientIp
      });

    console.log('✅ Etapa avançada:', etapaAtual.tipo_etapa);

    return new Response(
      gerarHtmlAgradecimento(true),
      { status: 200, headers: htmlHeaders }
    );

  } catch (error) {
    console.error('❌ Erro:', error);
    return new Response(
      gerarHtmlAgradecimento(false, 'Erro inesperado.'),
      { status: 500, headers: htmlHeaders }
    );
  }
});
