import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Layout from "./components/Layout";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import Pedidos from "./pages/Pedidos";
import NovoPedido from "./pages/NovoPedido";
import EditarPedido from "./pages/EditarPedido";
import DetalhesPedido from "./pages/DetalhesPedido";
import Clientes from "./pages/Clientes";
import Calendario from "./pages/Calendario";
import ScanQR from "./pages/ScanQR";
import Fechamentos from "./pages/Fechamentos";
import DetalhesFechamento from "./pages/DetalhesFechamento";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/auth" element={<Auth />} />
          <Route path="/scan/:qrRef" element={<ScanQR />} />
          <Route path="/" element={<Layout><Dashboard /></Layout>} />
          <Route path="/pedidos" element={<Layout><Pedidos /></Layout>} />
          <Route path="/pedidos/novo" element={<Layout><NovoPedido /></Layout>} />
          <Route path="/pedidos/:id" element={<Layout><DetalhesPedido /></Layout>} />
          <Route path="/pedidos/:id/editar" element={<Layout><EditarPedido /></Layout>} />
          <Route path="/clientes" element={<Layout><Clientes /></Layout>} />
          <Route path="/calendario" element={<Layout><Calendario /></Layout>} />
          <Route path="/pcp/fechamentos" element={<Layout><Fechamentos /></Layout>} />
          <Route path="/pcp/fechamentos/:id" element={<Layout><DetalhesFechamento /></Layout>} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
