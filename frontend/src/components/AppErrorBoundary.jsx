import React from 'react'

export default class AppErrorBoundary extends React.Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, errorMessage: '' }
  }

  static getDerivedStateFromError(error) {
    return {
      hasError: true,
      errorMessage: error?.message || 'Unexpected application error',
    }
  }

  componentDidCatch(error, errorInfo) {
    console.error('AppErrorBoundary caught an error:', error, errorInfo)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div
          style={{
            minHeight: '100vh',
            display: 'grid',
            placeItems: 'center',
            background: '#f7faf8',
            color: '#202733',
            padding: '24px',
            fontFamily: 'Sora, sans-serif',
          }}
        >
          <div
            style={{
              maxWidth: '720px',
              width: '100%',
              border: '1px solid #dbe3ef',
              background: '#ffffff',
              borderRadius: '14px',
              padding: '20px',
            }}
          >
            <h1 style={{ marginBottom: '10px', fontSize: '1.35rem', color: '#2f6fb2' }}>ARIZE encountered an error</h1>
            <p style={{ marginBottom: '12px', color: '#5e6878' }}>
              A runtime error prevented this screen from rendering.
            </p>
            <pre
              style={{
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word',
                background: '#f6f9fc',
                border: '1px solid #dbe3ef',
                borderRadius: '10px',
                padding: '10px',
                color: '#2f3f55',
              }}
            >
              {this.state.errorMessage}
            </pre>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
