import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AppErrorBoundary } from "@/components/AppErrorBoundary";
import { GlobalErrorReporter } from "@/components/GlobalErrorReporter";
import Layout from "./components/Layout";
import Auth from "./pages/Auth";
import Home from "./pages/Home";
import ComercialHub from "./pages/ComercialHub";
import Dashboard from "./pages/Dashboard";
import Pedidos from "./pages/Pedidos";
import NovoPedido from "./pages/NovoPedido";
import EditarPedido from "./pages/EditarPedido";
import DetalhesPedido from "./pages/DetalhesPedido";
import Clientes from "./pages/Clientes";
import ReferenciaDetalhe from "./pages/ReferenciaDetalhe";
import Calendario from "./pages/Calendario";
import ScanQR from "./pages/ScanQR";
import Fechamentos from "./pages/Fechamentos";
import DetalhesFechamento from "./pages/DetalhesFechamento";
import Usuarios from "./pages/Usuarios";
import CarteiraPedidos from "./pages/CarteiraPedidos";
import Comercial from "./pages/Comercial";
import FilaEtapas from "./pages/FilaEtapas";
import NotFound from "./pages/NotFound";
import ScanResultado from "./pages/ScanResultado";
import AreaCorte from "./pages/AreaCorte";
import Fornecedores from "./pages/Fornecedores";
import Tecidos from "./pages/Tecidos";
import TecidoDetalhe from "./pages/TecidoDetalhe";
import Aviamentos from "./pages/Aviamentos";
import AviamentoDetalhe from "./pages/AviamentoDetalhe";



const queryClient = new QueryClient();
const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <AppErrorBoundary>
        <GlobalErrorReporter />
        <BrowserRouter>
          <Routes>
            <Route path="/auth" element={<Auth />} />
            <Route path="/scan/:qrRef" element={<ScanQR />} />
            <Route path="/scan-resultado" element={<ScanResultado />} />
            <Route path="/" element={<Home />} />
            <Route path="/hub/comercial" element={<ComercialHub />} />
            <Route path="/ppcp" element={<Layout><Dashboard /></Layout>} />
            <Route path="/pedidos" element={<Layout><Pedidos /></Layout>} />

            <Route path="/fila-etapas" element={<Layout><FilaEtapas /></Layout>} />
            <Route path="/comercial" element={<Layout><Comercial /></Layout>} />
            <Route path="/carteira" element={<Layout><CarteiraPedidos /></Layout>} />
            <Route path="/pedidos/novo" element={<Layout><NovoPedido /></Layout>} />
            <Route path="/pedidos/:id" element={<Layout><DetalhesPedido /></Layout>} />
            <Route path="/pedidos/:id/editar" element={<Layout><EditarPedido /></Layout>} />
            <Route path="/clientes" element={<Layout><Clientes /></Layout>} />
            <Route path="/cadastros/referencias/:id" element={<Layout><ReferenciaDetalhe /></Layout>} />
            <Route path="/calendario" element={<Layout><Calendario /></Layout>} />
            <Route path="/pcp/fechamentos" element={<Layout><Fechamentos /></Layout>} />
            <Route path="/pcp/fechamentos/:id" element={<Layout><DetalhesFechamento /></Layout>} />
            <Route path="/usuarios" element={<Layout><Usuarios /></Layout>} />
            <Route path="/area-corte" element={<Layout><AreaCorte /></Layout>} />
            <Route path="/area-corte/:pedidoId" element={<Layout><AreaCorte /></Layout>} />
            <Route path="/catalogo/fornecedores" element={<Layout><Fornecedores /></Layout>} />
            <Route path="/catalogo/tecidos" element={<Layout><Tecidos /></Layout>} />
            <Route path="/catalogo/tecidos/:id" element={<Layout><TecidoDetalhe /></Layout>} />
            <Route path="/catalogo/aviamentos" element={<Layout><Aviamentos /></Layout>} />
            <Route path="/catalogo/aviamentos/:id" element={<Layout><AviamentoDetalhe /></Layout>} />

            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </AppErrorBoundary>
    </TooltipProvider>
  </QueryClientProvider>
);
export default App;
