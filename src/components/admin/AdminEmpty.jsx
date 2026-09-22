/** A designed empty state for the console — an icon, a headline, a line of context. */
export default function AdminEmpty({ icon: Icon, title, children }) {
  return (
    <div className="adm-empty">
      {Icon && <Icon size={22} color="currentColor" />}
      <strong>{title}</strong>
      {children && <span>{children}</span>}
    </div>
  )
}
