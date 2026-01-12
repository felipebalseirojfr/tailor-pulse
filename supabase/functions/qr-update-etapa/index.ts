import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.75.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Mapeamento de nomes de etapas para exibição
const ETAPAS_NOMES: Record<string, string> = {
  pilotagem: 'Pilotagem',
  liberacao_corte: 'Liberação de Corte',
  corte: 'Corte',
  lavanderia: 'Lavanderia',
  costura: 'Costura',
  caseado: 'Caseado',
  estamparia_bordado: 'Estamparia/Bordado',
  acabamento: 'Acabamento',
  entrega: 'Entrega'
};

// Função para gerar página HTML de resposta
function gerarHtmlResposta(tipo: 'sucesso' | 'erro' | 'aviso' | 'concluido', titulo: string, mensagem: string, detalhes?: { produto?: string; etapaConcluida?: string; proximaEtapa?: string }) {
  const cores = {
    sucesso: { bg: '#10b981', icon: '✓' },
    erro: { bg: '#ef4444', icon: '✕' },
    aviso: { bg: '#f59e0b', icon: '⚠' },
    concluido: { bg: '#3b82f6', icon: '🎉' }
  };

  const cor = cores[tipo];

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
      padding: 32px;
      max-width: 400px;
      width: 100%;
      text-align: center;
      box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
    }
    .icon {
      width: 80px;
      height: 80px;
      border-radius: 50%;
      background: ${cor.bg};
      color: white;
      font-size: 40px;
      display: flex;
      align-items: center;
      justify-content: center;
      margin: 0 auto 24px;
    }
    h1 {
      color: #1e293b;
      font-size: 24px;
      margin-bottom: 12px;
    }
    .mensagem {
      color: #64748b;
      font-size: 16px;
      margin-bottom: 24px;
      line-height: 1.5;
    }
    .detalhes {
      background: #f8fafc;
      border-radius: 12px;
      padding: 16px;
      text-align: left;
    }
    .detalhe-item {
      display: flex;
      justify-content: space-between;
      padding: 8px 0;
      border-bottom: 1px solid #e2e8f0;
    }
    .detalhe-item:last-child {
      border-bottom: none;
    }
    .detalhe-label {
      color: #64748b;
      font-size: 14px;
    }
    .detalhe-valor {
      color: #1e293b;
      font-weight: 600;
      font-size: 14px;
    }
    .proxima-etapa {
      background: ${cor.bg}15;
      border: 2px solid ${cor.bg};
      border-radius: 8px;
      padding: 12px;
      margin-top: 16px;
    }
    .proxima-etapa-label {
      color: #64748b;
      font-size: 12px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .proxima-etapa-valor {
      color: ${cor.bg};
      font-weight: 700;
      font-size: 18px;
      margin-top: 4px;
    }
    .timestamp {
      color: #94a3b8;
      font-size: 12px;
      margin-top: 24px;
    }
  </style>
</head>
<body>
  <div class="card">
    <div class="icon">${cor.icon}</div>
    <h1>${titulo}</h1>
    <p class="mensagem">${mensagem}</p>
    ${detalhes ? `
    <div class="detalhes">
      ${detalhes.produto ? `
      <div class="detalhe-item">
        <span class="detalhe-label">Produto</span>
        <span class="detalhe-valor">${detalhes.produto}</span>
      </div>
      ` : ''}
      ${detalhes.etapaConcluida ? `
      <div class="detalhe-item">
        <span class="detalhe-label">Etapa Concluída</span>
        <span class="detalhe-valor">${detalhes.etapaConcluida}</span>
      </div>
      ` : ''}
    </div>
    ${detalhes.proximaEtapa ? `
    <div class="proxima-etapa">
      <div class="proxima-etapa-label">Próxima Etapa</div>
      <div class="proxima-etapa-valor">${detalhes.proximaEtapa}</div>
    </div>
    ` : ''}
    ` : ''}
    <p class="timestamp">Registrado em ${new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })}</p>
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
    
    // Validação robusta de entrada
    if (!qrRef || typeof qrRef !== 'string') {
      console.error('❌ QR ref inválido ou ausente');
      return new Response(
        gerarHtmlResposta('erro', 'QR Code Inválido', 'O código QR não contém uma referência válida.'),
        { status: 400, headers: htmlHeaders }
      );
    }
    
    // Validar formato do qrRef (deve começar com PROD-)
    if (!qrRef.match(/^PROD-[A-Z0-9]{8}$/)) {
      console.error('⚠️ Formato de QR inválido:', qrRef);
      return new Response(
        gerarHtmlResposta('erro', 'Formato Inválido', 'Este QR Code não é reconhecido pelo sistema.'),
        { status: 400, headers: htmlHeaders }
      );
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
      console.error('❌ Tentativa de acesso com QR inválido:', qrRef);
      return new Response(
        gerarHtmlResposta('erro', 'Pedido Não Encontrado', 'Este QR Code não está associado a nenhum pedido ativo.'),
        { status: 410, headers: htmlHeaders }
      );
    }
    
    // Validação de segurança: verificar se pedido não está cancelado
    if (pedido.status_geral === 'cancelado') {
      console.error('⚠️ Tentativa de scan em pedido cancelado:', qrRef);
      return new Response(
        gerarHtmlResposta('aviso', 'Pedido Cancelado', 'Este pedido foi cancelado e não pode ser atualizado.', {
          produto: pedido.produto_modelo
        }),
        { status: 403, headers: htmlHeaders }
      );
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
      return new Response(
        gerarHtmlResposta('erro', 'Erro no Sistema', 'Não foi possível carregar as etapas de produção.'),
        { status: 500, headers: htmlHeaders }
      );
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
        return new Response(
          gerarHtmlResposta('erro', 'Erro ao Iniciar', 'Não foi possível iniciar a produção. Tente novamente.'),
          { status: 500, headers: htmlHeaders }
        );
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
        return new Response(
          gerarHtmlResposta('erro', 'Erro ao Iniciar Etapa', 'Não foi possível iniciar a primeira etapa.'),
          { status: 500, headers: htmlHeaders }
        );
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

      // Encontrar segunda etapa para mostrar como próxima
      const segundaEtapa = etapas.find(e => e.ordem > primeiraEtapa.ordem);

      return new Response(
        gerarHtmlResposta('sucesso', 'Produção Iniciada!', 'A produção foi iniciada com sucesso.', {
          produto: pedido.produto_modelo,
          etapaConcluida: ETAPAS_NOMES[primeiraEtapa.tipo_etapa] || primeiraEtapa.tipo_etapa,
          proximaEtapa: segundaEtapa ? (ETAPAS_NOMES[segundaEtapa.tipo_etapa] || segundaEtapa.tipo_etapa) : undefined
        }),
        { status: 200, headers: htmlHeaders }
      );
    }

    // 5. SE NÃO FOR O PRIMEIRO SCAN → SEGUIR FLUXO NORMAL

    // 5.1 Encontrar etapa atual (pendente ou em andamento)
    const etapaAtual = etapas.find(e => e.status === 'pendente' || e.status === 'em_andamento');

    if (!etapaAtual) {
      console.log('✅ Todas as etapas já foram concluídas');
      return new Response(
        gerarHtmlResposta('concluido', 'Produção Finalizada!', 'Todas as etapas deste pedido já foram concluídas.', {
          produto: pedido.produto_modelo
        }),
        { status: 200, headers: htmlHeaders }
      );
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
      return new Response(
        gerarHtmlResposta('erro', 'Erro ao Atualizar', 'Não foi possível concluir a etapa. Tente novamente.'),
        { status: 500, headers: htmlHeaders }
      );
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

    // Retornar página de sucesso
    if (proximaEtapa) {
      return new Response(
        gerarHtmlResposta('sucesso', 'Etapa Concluída!', 'A etapa foi finalizada com sucesso.', {
          produto: pedido.produto_modelo,
          etapaConcluida: ETAPAS_NOMES[etapaAtual.tipo_etapa] || etapaAtual.tipo_etapa,
          proximaEtapa: ETAPAS_NOMES[proximaEtapa.tipo_etapa] || proximaEtapa.tipo_etapa
        }),
        { status: 200, headers: htmlHeaders }
      );
    } else {
      return new Response(
        gerarHtmlResposta('concluido', 'Produção Finalizada!', 'Parabéns! Todas as etapas foram concluídas.', {
          produto: pedido.produto_modelo,
          etapaConcluida: ETAPAS_NOMES[etapaAtual.tipo_etapa] || etapaAtual.tipo_etapa
        }),
        { status: 200, headers: htmlHeaders }
      );
    }

  } catch (error) {
    console.error('❌ Erro no processamento:', error);
    return new Response(
      gerarHtmlResposta('erro', 'Erro Inesperado', 'Ocorreu um erro ao processar o QR Code. Tente novamente.'),
      { status: 500, headers: htmlHeaders }
    );
  }
});
