import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CalendarCheck, Kanban, UserSearch, BarChart3 } from "lucide-react";
import AcoesDoDia from "@/components/comercial/AcoesDoDia";
import PipelineKanban from "@/components/comercial/PipelineKanban";
import ProspeccaoTable from "@/components/comercial/ProspeccaoTable";
import RelatoriosView from "@/components/comercial/RelatoriosView";

export default function Comercial() {
  const [activeTab, setActiveTab] = useState("acoes");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Comercial</h1>
        <p className="text-muted-foreground text-sm">
          Gerencie negociações, prospecção e acompanhe o pipeline comercial.
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="bg-muted/50 p-1">
          <TabsTrigger value="acoes" className="gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            <CalendarCheck className="h-4 w-4" />
            Ações do Dia
          </TabsTrigger>
          <TabsTrigger value="pipeline" className="gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            <Kanban className="h-4 w-4" />
            Pipeline
          </TabsTrigger>
          <TabsTrigger value="prospeccao" className="gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            <UserSearch className="h-4 w-4" />
            Prospecção
          </TabsTrigger>
          <TabsTrigger value="relatorios" className="gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            <BarChart3 className="h-4 w-4" />
            Relatórios
          </TabsTrigger>
        </TabsList>

        <TabsContent value="acoes">
          <AcoesDoDia />
        </TabsContent>
        <TabsContent value="pipeline">
          <PipelineKanban />
        </TabsContent>
        <TabsContent value="prospeccao">
          <ProspeccaoTable />
        </TabsContent>
        <TabsContent value="relatorios">
          <RelatoriosView />
        </TabsContent>
      </Tabs>
    </div>
  );
}
