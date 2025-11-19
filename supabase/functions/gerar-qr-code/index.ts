import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { pedidoId, qrCodeImage } = await req.json();

    // Validação de entrada robusta
    if (!pedidoId || typeof pedidoId !== 'string') {
      return new Response(
        JSON.stringify({ error: 'pedidoId inválido ou ausente' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }
    
    if (!qrCodeImage || typeof qrCodeImage !== 'string') {
      return new Response(
        JSON.stringify({ error: 'qrCodeImage inválido ou ausente' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }
    
    // Validar formato UUID do pedidoId
    if (!pedidoId.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
      return new Response(
        JSON.stringify({ error: 'Formato de pedidoId inválido' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }
    
    // Validar formato base64 da imagem
    if (!qrCodeImage.match(/^data:image\/png;base64,/)) {
      return new Response(
        JSON.stringify({ error: 'Formato de imagem inválido' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    // Criar cliente Supabase
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Validação de segurança crítica: verificar se o pedido existe
    const { data: pedidoExists, error: checkError } = await supabase
      .from('pedidos')
      .select('id')
      .eq('id', pedidoId)
      .single();
    
    if (checkError || !pedidoExists) {
      console.error('Tentativa de gerar QR para pedido inexistente:', pedidoId);
      return new Response(
        JSON.stringify({ error: 'Pedido não encontrado' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 404 }
      );
    }

    console.log('Recebendo QR Code para pedido válido:', pedidoId);

    // Converter base64 para buffer
    const base64Data = qrCodeImage.replace(/^data:image\/\w+;base64,/, '');
    const buffer = Uint8Array.from(atob(base64Data), c => c.charCodeAt(0));

    // Nome do arquivo
    const fileName = `qrcode-${pedidoId}.png`;
    const filePath = `${pedidoId}/${fileName}`;

    console.log('Fazendo upload do QR Code:', filePath);

    // Upload para Supabase Storage
    const { error: uploadError } = await supabase.storage
      .from('qrcodes')
      .upload(filePath, buffer, {
        contentType: 'image/png',
        upsert: true,
      });

    if (uploadError) {
      console.error('Erro no upload:', uploadError);
      throw uploadError;
    }

    // Obter URL pública
    const { data: urlData } = supabase.storage
      .from('qrcodes')
      .getPublicUrl(filePath);

    const publicUrl = urlData.publicUrl;

    console.log('QR Code salvo com sucesso:', publicUrl);

    // Atualizar o pedido com a URL do QR Code
    const { error: updateError } = await supabase
      .from('pedidos')
      .update({ qr_code_link: publicUrl })
      .eq('id', pedidoId);

    if (updateError) {
      console.error('Erro ao atualizar pedido:', updateError);
      throw updateError;
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        qrCodeUrl: publicUrl,
        message: 'QR Code salvo com sucesso' 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
    console.error('Erro ao salvar QR Code:', errorMessage);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
