import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.75.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// HTML simples para popup de sucesso
const successHtml = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Sucesso</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: linear-gradient(135deg, #10b981 0%, #059669 100%);
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 20px;
    }
    .popup {
      background: white;
      border-radius: 20px;
      padding: 40px 30px;
      text-align: center;
      box-shadow: 0 20px 60px rgba(0,0,0,0.3);
      max-width: 320px;
      width: 100%;
    }
    .icon {
      width: 80px;
      height: 80px;
      background: #10b981;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      margin: 0 auto 20px;
    }
    .icon svg {
      width: 45px;
      height: 45px;
      fill: white;
    }
    h1 {
      color: #1f2937;
      font-size: 24px;
      margin-bottom: 10px;
    }
    p {
      color: #6b7280;
      font-size: 16px;
      line-height: 1.5;
    }
    .close-text {
      margin-top: 25px;
      font-size: 13px;
      color: #9ca3af;
    }
  </style>
</head>
<body>
  <div class="popup">
    <div class="icon">
      <svg viewBox="0 0 24 24"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>
    </div>
    <h1>Sucesso!</h1>
    <p>Etapa atualizada com sucesso.</p>
    <p class="close-text">Você pode fechar esta página.</p>
  </div>
</body>
</html>`;

// HTML simples para popup de erro
const errorHtml = (mensagem: string) => `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Erro</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 20px;
    }
    .popup {
      background: white;
      border-radius: 20px;
      padding: 40px 30px;
      text-align: center;
      box-shadow: 0 20px 60px rgba(0,0,0,0.3);
      max-width: 320px;
      width: 100%;
    }
    .icon {
      width: 80px;
      height: 80px;
      background: #ef4444;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      margin: 0 auto 20px;
    }
    .icon svg {
      width: 45px;
      height: 45px;
      fill: white;
    }
    h1 {
      color: #1f2937;
      font-size: 24px;
      margin-bottom: 10px;
    }
    p {
      color: #6b7280;
      font-size: 16px;
      line-height: 1.5;
    }
    .close-text {
      margin-top: 25px;
      font-size: 13px;
      color: #9ca3af;
    }
  </style>
</head>
<body>
  <div class="popup">
    <div class="icon">
      <svg viewBox="0 0 24 24"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>
    </div>
    <h1>Erro</h1>
    <p>${mensagem}</p>
    <p class="close-text">Você pode fechar esta página.</p>
  </div>
</body>
</html>`;

// Headers para resposta HTML
const htmlHeaders = {
  'Content-Type': 'text/html; charset=utf-8',
  'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
};

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
      return new Response(errorHtml('QR Code inválido.'), { 
        status: 400, 
        headers: htmlHeaders 
      });
    }
    
    // Validar formato do qrRef
    if (!qrRef.match(/^PROD-[A-Z0-9]{8}$/)) {
      console.error('⚠️ Formato de QR inválido:', qrRef);
      return new Response(errorHtml('QR Code não reconhecido.'), { 
        status: 400, 
        headers: htmlHeaders 
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
      return new Response(errorHtml('Pedido não encontrado.'), { 
        status: 404, 
        headers: htmlHeaders 
      });
    }
    
    if (pedido.status_geral === 'cancelado') {
      console.error('⚠️ Pedido cancelado:', qrRef);
      return new Response(errorHtml('Pedido cancelado.'), { 
        status: 400, 
        headers: htmlHeaders 
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
      return new Response(errorHtml('Erro no sistema.'), { 
        status: 500, 
        headers: htmlHeaders 
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
      return new Response(successHtml, { 
        status: 200, 
        headers: htmlHeaders 
      });
    }

    // 5. SCANS SUBSEQUENTES → AVANÇAR ETAPA
    const etapaAtual = etapas.find(e => e.status === 'pendente' || e.status === 'em_andamento');

    if (!etapaAtual) {
      console.log('✅ Todas as etapas já concluídas');
      return new Response(successHtml, { 
        status: 200, 
        headers: htmlHeaders 
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
    return new Response(successHtml, { 
      status: 200, 
      headers: htmlHeaders 
    });

  } catch (error) {
    console.error('❌ Erro:', error);
    return new Response(errorHtml('Erro inesperado.'), { 
      status: 500, 
      headers: htmlHeaders 
    });
  }
});
