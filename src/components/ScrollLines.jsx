import { useEffect, useRef, useState } from 'react'

function buildStraightPath(x, height) {
  return `M${x},0 L${x},${height}`
}

function buildConnectorPath(xLeft, xRight, y) {
  return `M${xLeft},${y} L${xRight},${y}`
}

export default function ScrollLines() {
  const [docHeight, setDocHeight] = useState(0)
  const leftRef = useRef(null)
  const rightRef = useRef(null)
  const connectorRefs = useRef([])
  const lengthsRef = useRef({ left: 0, right: 0, connectors: [] })

  useEffect(() => {
    function measure() {
      setDocHeight(document.documentElement.scrollHeight)
    }
    measure()
    window.addEventListener('resize', measure)
    const ro = new ResizeObserver(measure)
    ro.observe(document.body)
    return () => {
      window.removeEventListener('resize', measure)
      ro.disconnect()
    }
  }, [])

  const connectorFractions = [0.22, 0.5, 0.78]

  useEffect(() => {
    if (!docHeight) return

    lengthsRef.current.left = leftRef.current ? leftRef.current.getTotalLength() : 0
    lengthsRef.current.right = rightRef.current ? rightRef.current.getTotalLength() : 0
    lengthsRef.current.connectors = connectorRefs.current.map((el) => (el ? el.getTotalLength() : 0))

    if (leftRef.current) leftRef.current.style.strokeDasharray = String(lengthsRef.current.left)
    if (rightRef.current) rightRef.current.style.strokeDasharray = String(lengthsRef.current.right)
    connectorRefs.current.forEach((el, i) => {
      if (el) el.style.strokeDasharray = String(lengthsRef.current.connectors[i])
    })

    let ticking = false

    function update() {
      ticking = false
      const scrollable = docHeight - window.innerHeight
      const progress = scrollable > 0 ? Math.min(Math.max(window.scrollY / scrollable, 0), 1) : 1

      const { left, right, connectors } = lengthsRef.current

      if (leftRef.current) {
        leftRef.current.style.strokeDashoffset = String(left * (1 - progress))
      }
      if (rightRef.current) {
        rightRef.current.style.strokeDashoffset = String(right * (1 - progress))
      }

      connectorRefs.current.forEach((el, i) => {
        if (!el) return
        const start = connectorFractions[i] - 0.05
        const end = connectorFractions[i] + 0.05
        const local = Math.min(Math.max((progress - start) / (end - start), 0), 1)
        el.style.strokeDashoffset = String(connectors[i] * (1 - local))
      })
    }

    function onScroll() {
      if (!ticking) {
        ticking = true
        requestAnimationFrame(update)
      }
    }

    update()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [docHeight])

  if (!docHeight) return null

  const xLeft = 32

  return (
    <svg
      className="scroll-lines"
      width="100%"
      height={docHeight}
      viewBox={`0 0 1600 ${docHeight}`}
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      <path
        ref={leftRef}
        d={buildStraightPath(xLeft, docHeight)}
        className="scroll-lines-path"
        vectorEffect="non-scaling-stroke"
      />
      <path
        ref={rightRef}
        d={buildStraightPath(1600 - xLeft, docHeight)}
        className="scroll-lines-path"
        vectorEffect="non-scaling-stroke"
      />
      {connectorFractions.map((frac, i) => (
        <path
          key={frac}
          ref={(el) => (connectorRefs.current[i] = el)}
          d={buildConnectorPath(xLeft, 1600 - xLeft, docHeight * frac)}
          className="scroll-lines-path"
          vectorEffect="non-scaling-stroke"
        />
      ))}
    </svg>
  )
}
