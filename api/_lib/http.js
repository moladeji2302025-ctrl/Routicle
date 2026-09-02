/** Small helpers shared by every /api/* handler. Vercel's Node runtime already parses JSON bodies into req.body. */

export function send(res, status, body) {
  res.status(status).setHeader('Content-Type', 'application/json')
  res.end(JSON.stringify(body))
}

export function methodGuard(req, res, allowed) {
  if (!allowed.includes(req.method)) {
    send(res, 405, { error: `Method ${req.method} not allowed. Use ${allowed.join(', ')}.` })
    return false
  }
  return true
}

export async function withErrorHandling(res, fn) {
  try {
    await fn()
  } catch (err) {
    console.error(err)
    send(res, 500, { error: err.message || 'Internal server error' })
  }
}
