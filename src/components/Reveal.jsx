import { useInView } from '../hooks/useInView'

export default function Reveal({ children, delay = 0, className = '', as = 'div' }) {
  const [ref, inView] = useInView()
  const Tag = as

  return (
    <Tag
      ref={ref}
      className={`reveal${inView ? ' reveal-visible' : ''}${className ? ` ${className}` : ''}`}
      style={{ transitionDelay: inView ? `${delay}ms` : '0ms' }}
    >
      {children}
    </Tag>
  )
}
