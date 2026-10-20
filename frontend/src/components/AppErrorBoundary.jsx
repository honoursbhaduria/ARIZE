import React from 'react'

// Last-resort guard for errors outside the router (route errors use RouteError).
export default class AppErrorBoundary extends React.Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, errorMessage: '' }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, errorMessage: error?.message || 'Unexpected application error' }
  }

  componentDidCatch(error, errorInfo) {
    console.error('AppErrorBoundary caught an error:', error, errorInfo)
  }

  render() {
    if (!this.state.hasError) return this.props.children
    return (
      <div className="page" style={{ minHeight: '100dvh', justifyContent: 'center', maxWidth: 640 }}>
        <div className="card card--red stack">
          <div className="eyebrow red">Critical hit</div>
          <h1 style={{ fontSize: '1.6rem' }}>ARIZE ran into an error</h1>
          <pre className="mono small muted" style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{this.state.errorMessage}</pre>
          <button type="button" className="btn btn--primary" onClick={() => window.location.assign('/')}>Respawn</button>
        </div>
      </div>
    )
  }
}
