import { Component } from 'react'

/**
 * Catches a render error instead of letting it unmount the whole tree.
 *
 * Without one of these, a single throw anywhere below the root leaves React
 * with nothing mounted: the page goes blank, showing only the body background,
 * and the only clue is in the console. This shows what happened and offers a
 * way out, which is both kinder to the person and far faster to diagnose.
 *
 * React only routes errors here from rendering, lifecycle and constructors —
 * not from event handlers or async callbacks, which is why the components
 * around it still handle their own fetch failures.
 */
export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { error: null }
  }

  static getDerivedStateFromError(error) {
    return { error }
  }

  componentDidCatch(error, info) {
    console.error('Render error:', error, info?.componentStack)
  }

  render() {
    const { error } = this.state
    if (!error) return this.props.children

    // A named section can fail without taking the page with it.
    if (this.props.inline) {
      return (
        <p className="eb-inline">
          {this.props.label || 'This section'} could not be shown.{' '}
          <button type="button" onClick={() => this.setState({ error: null })}>
            Try again
          </button>
        </p>
      )
    }

    return (
      <div className="eb">
        <h1>Something broke on this page</h1>
        <p>
          The rest of Routicle is fine — this page hit an error while rendering. Reloading usually
          clears it.
        </p>
        <pre className="eb-detail">{String(error?.message || error)}</pre>
        <div className="eb-actions">
          <button type="button" className="eb-btn" onClick={() => window.location.reload()}>
            Reload
          </button>
          <button
            type="button"
            className="eb-btn eb-btn-ghost"
            onClick={() => {
              window.location.href = '/'
            }}
          >
            Go home
          </button>
        </div>
      </div>
    )
  }
}
