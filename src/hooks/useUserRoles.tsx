import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export const useUserRoles = () => {
  const [roles, setRoles] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchUserRoles();
  }, []);

  const fetchUserRoles = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        setRoles([]);
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id);

      if (error) throw error;
      
      setRoles(data?.map((r) => r.role) || []);
    } catch (error) {
      console.error("Erro ao buscar roles:", error);
      setRoles([]);
    } finally {
      setLoading(false);
    }
  };

  const hasRole = (role: string) => roles.includes(role);
  
  const hasAnyRole = (checkRoles: string[]) => 
    checkRoles.some((role) => roles.includes(role));

  return { roles, loading, hasRole, hasAnyRole };
};
