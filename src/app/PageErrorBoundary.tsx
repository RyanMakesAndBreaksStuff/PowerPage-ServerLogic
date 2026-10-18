import { Component } from 'react';
import type { ReactNode } from 'react';

type Props = { label: string; children: ReactNode };
type State = { failed: boolean };

// React 19 has no function-component error boundary; createRoot's onCaughtError logs the error name.
export class PageErrorBoundary extends Component<Props, State> {
  override state: State = { failed: false };

  static getDerivedStateFromError(): State {
    return { failed: true };
  }

  override render(): ReactNode {
    if (!this.state.failed) return this.props.children;
    return (
      <p role="alert" className="shell__page-error">
        {`${this.props.label} couldn't load. Close and reopen the tool.`}
      </p>
    );
  }
}
