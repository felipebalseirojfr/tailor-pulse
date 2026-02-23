import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import type { Negociacao, Lead, Interacao, StatusPipeline } from "@/types/comercial";

export function useNegociacoes() {
  return useQuery({
    queryKey: ["negociacoes"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("negociacoes" as any)
        .select("*, responsavel:profiles!responsavel_id(nome)")
        .order("data_proxima_acao", { ascending: true });
      if (error) throw error;
      return (data || []) as unknown as Negociacao[];
    },
  });
}

export function useLeads() {
  return useQuery({
    queryKey: ["leads"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("leads" as any)
        .select("*, responsavel:profiles!responsavel_id(nome)")
        .order("data_proxima_acao", { ascending: true });
      if (error) throw error;
      return (data || []) as unknown as Lead[];
    },
  });
}

export function useNegociacaoInteracoes(negociacaoId: string | null) {
  return useQuery({
    queryKey: ["negociacao_interacoes", negociacaoId],
    enabled: !!negociacaoId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("negociacao_interacoes" as any)
        .select("*, usuario:profiles!usuario_id(nome)")
        .eq("negociacao_id", negociacaoId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data || []) as unknown as Interacao[];
    },
  });
}

export function useProfiles() {
  return useQuery({
    queryKey: ["profiles-comercial"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, nome")
        .order("nome");
      if (error) throw error;
      return data || [];
    },
  });
}

export function useUpsertNegociacao() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (neg: Partial<Negociacao> & { id?: string }) => {
      const { responsavel, ...payload } = neg as any;
      if (neg.id) {
        const { error } = await supabase
          .from("negociacoes" as any)
          .update(payload)
          .eq("id", neg.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("negociacoes" as any)
          .insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["negociacoes"] });
      toast({ title: "Negociação salva com sucesso" });
    },
    onError: (e: any) => {
      toast({ title: "Erro ao salvar negociação", description: e.message, variant: "destructive" });
    },
  });
}

export function useUpsertLead() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (lead: Partial<Lead> & { id?: string }) => {
      const { responsavel, ...payload } = lead as any;
      if (lead.id) {
        const { error } = await supabase
          .from("leads" as any)
          .update(payload)
          .eq("id", lead.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("leads" as any)
          .insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["leads"] });
      toast({ title: "Lead salvo com sucesso" });
    },
    onError: (e: any) => {
      toast({ title: "Erro ao salvar lead", description: e.message, variant: "destructive" });
    },
  });
}

export function useAddInteracao() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (params: { negociacao_id?: string; lead_id?: string; tipo: string; resumo: string }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (params.negociacao_id) {
        const { error } = await supabase
          .from("negociacao_interacoes" as any)
          .insert({ negociacao_id: params.negociacao_id, tipo: params.tipo, resumo: params.resumo, usuario_id: user?.id });
        if (error) throw error;
        // Update data_ultima_interacao
        await supabase
          .from("negociacoes" as any)
          .update({ data_ultima_interacao: new Date().toISOString().split("T")[0] })
          .eq("id", params.negociacao_id);
      } else if (params.lead_id) {
        const { error } = await supabase
          .from("lead_interacoes" as any)
          .insert({ lead_id: params.lead_id, tipo: params.tipo, resumo: params.resumo, usuario_id: user?.id });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["negociacoes"] });
      queryClient.invalidateQueries({ queryKey: ["leads"] });
      queryClient.invalidateQueries({ queryKey: ["negociacao_interacoes"] });
      toast({ title: "Interação registrada" });
    },
    onError: (e: any) => {
      toast({ title: "Erro ao registrar interação", description: e.message, variant: "destructive" });
    },
  });
}

export function useQualifyLead() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (params: { lead: Lead; proxima_acao: string; data_proxima_acao: string }) => {
      const { lead, proxima_acao, data_proxima_acao } = params;
      // Create negociacao from lead
      const { error: negError } = await supabase
        .from("negociacoes" as any)
        .insert({
          marca_nome: lead.lead_nome,
          status_pipeline: 'lead_qualificado' as StatusPipeline,
          prioridade: 'media',
          proxima_acao,
          data_proxima_acao,
          responsavel_id: lead.responsavel_id,
          segmento: lead.segmento,
          origem: lead.origem,
          volume_estimado_mes: lead.volume_estimado,
          ticket_estimado_mes: lead.ticket_estimado,
          lead_origem_id: lead.id,
        });
      if (negError) throw negError;
      // Mark lead as qualified
      const { error: leadError } = await supabase
        .from("leads" as any)
        .update({ status_prospeccao: 'qualificado' })
        .eq("id", lead.id);
      if (leadError) throw leadError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["negociacoes"] });
      queryClient.invalidateQueries({ queryKey: ["leads"] });
      toast({ title: "Lead qualificado e movido para o Pipeline!" });
    },
    onError: (e: any) => {
      toast({ title: "Erro ao qualificar lead", description: e.message, variant: "destructive" });
    },
  });
}
