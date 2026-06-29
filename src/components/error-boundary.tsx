import { Component } from "react";
import { Button } from "@/components/ui/button";
import { t } from "@/i18n";

interface Props {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  onError?: (error: Error) => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error("ErrorBoundary caught:", error, info);
    this.props.onError?.(error);
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;
      return (
        <div className="flex min-h-[400px] items-center justify-center">
          <div className="max-w-md text-center">
            <p className="text-sm text-muted-foreground">{t("errorBoundary.somethingWrong")}</p>
            <p className="mt-1 text-xs text-muted-foreground/60">{this.state.error?.message}</p>
            <Button
              variant="outline"
              size="sm"
              className="mt-4"
              onClick={() => this.setState({ hasError: false, error: null })}
            >
              {t("errorBoundary.tryAgain")}
            </Button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
