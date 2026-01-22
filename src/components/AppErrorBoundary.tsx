import React from "react";
import { Button } from "@/components/ui/button";

type Props = {
  children: React.ReactNode;
};

type State = {
  hasError: boolean;
  error?: Error;
  errorInfo?: React.ErrorInfo;
};

export class AppErrorBoundary extends React.Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Mantém no console para diagnóstico
    console.error("[AppErrorBoundary]", error, errorInfo);
    this.setState({ error, errorInfo });
  }

  private handleReload = () => {
    window.location.reload();
  };

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-6 py-10">
        <div className="w-full max-w-2xl space-y-4">
          <h1 className="text-xl font-semibold text-foreground">
            Ocorreu um erro na aplicação
          </h1>
          <p className="text-sm text-muted-foreground">
            A tela branca estava sendo causada por uma exceção não tratada. Você pode recarregar agora.
          </p>

          <div className="flex gap-2">
            <Button onClick={this.handleReload}>Recarregar</Button>
            <Button variant="outline" onClick={() => this.setState({ hasError: false })}>
              Tentar continuar
            </Button>
          </div>

          <div className="rounded-lg border border-border bg-card p-4">
            <p className="text-sm font-medium text-foreground">Detalhes do erro</p>
            <pre className="mt-2 text-xs whitespace-pre-wrap break-words text-muted-foreground">
{String(this.state.error?.message || this.state.error)}

{this.state.errorInfo?.componentStack || ""}
            </pre>
          </div>
        </div>
      </div>
    );
  }
}
