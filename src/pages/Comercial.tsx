import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { CalendarCheck, Kanban, MoreHorizontal, UserSearch, BarChart3 } from "lucide-react";
import HojeView from "@/components/comercial/HojeView";
import PipelineKanban from "@/components/comercial/PipelineKanban";
import ProspeccaoTable from "@/components/comercial/ProspeccaoTable";
import RelatoriosView from "@/components/comercial/RelatoriosView";

type View = "hoje" | "pipeline" | "prospeccao" | "relatorios";

export default function Comercial() {
  const [activeView, setActiveView] = useState<View>("hoje");

  const isSecondary = activeView === "prospeccao" || activeView === "relatorios";

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Comercial</h1>
        <p className="text-muted-foreground text-sm">
          Gerencie negociações e acompanhe o pipeline comercial.
        </p>
      </div>

      {/* Navigation */}
      <div className="flex items-center gap-1 border-b border-border pb-px">
        <button
          onClick={() => setActiveView("hoje")}
          className={`flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-t-md transition-colors ${
            activeView === "hoje"
              ? "text-primary border-b-2 border-primary bg-primary/5"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <CalendarCheck className="h-4 w-4" />
          Hoje
        </button>
        <button
          onClick={() => setActiveView("pipeline")}
          className={`flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-t-md transition-colors ${
            activeView === "pipeline"
              ? "text-primary border-b-2 border-primary bg-primary/5"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <Kanban className="h-4 w-4" />
          Pipeline
        </button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              className={`flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-t-md transition-colors ${
                isSecondary
                  ? "text-primary border-b-2 border-primary bg-primary/5"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <MoreHorizontal className="h-4 w-4" />
              Mais
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            <DropdownMenuItem onClick={() => setActiveView("prospeccao")} className="gap-2">
              <UserSearch className="h-4 w-4" />
              Prospecção
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setActiveView("relatorios")} className="gap-2">
              <BarChart3 className="h-4 w-4" />
              Relatórios
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Content */}
      {activeView === "hoje" && <HojeView />}
      {activeView === "pipeline" && <PipelineKanban />}
      {activeView === "prospeccao" && <ProspeccaoTable />}
      {activeView === "relatorios" && <RelatoriosView />}
    </div>
  );
}
