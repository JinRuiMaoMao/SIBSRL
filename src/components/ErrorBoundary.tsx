import { Component, type ErrorInfo, type ReactNode } from 'react'

interface Props {
  children: ReactNode
}

interface State {
  error: Error | null
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('App render error:', error, info.componentStack)
  }

  render() {
    if (this.state.error) {
      return (
        <div
          style={{
            margin: '2rem auto',
            maxWidth: 640,
            padding: '1.25rem',
            borderRadius: 12,
            border: '1px solid #f5b94259',
            background: '#141c2e',
            color: '#eef2f8',
            fontFamily: 'system-ui, sans-serif',
          }}
        >
          <h1 style={{ margin: '0 0 0.75rem', fontSize: '1.1rem' }}>页面加载出错</h1>
          <p style={{ margin: 0, fontSize: '0.9rem', opacity: 0.85 }}>
            {this.state.error.message}
          </p>
          <p style={{ margin: '1rem 0 0', fontSize: '0.8rem', opacity: 0.6 }}>
            请尝试 Ctrl+F5 刷新；若仍失败，请用 npm run dev 在本地调试。
          </p>
        </div>
      )
    }
    return this.props.children
  }
}
