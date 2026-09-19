import { createContext, useContext, useLayoutEffect, useRef } from 'react'

/**
 * Editing a designed document in place.
 *
 * Every piece of text on a page is an <E path="…"> bound to one field of the
 * document's data. It is typed into where it sits, so what you edit is exactly
 * what prints: there is no form on one side and a preview on the other that
 * could disagree.
 *
 * The DOM owns the text while a field has focus, and the data only changes on
 * blur. Writing React state on every keystroke would re-render the node under
 * the caret and throw it back to the start.
 */

const DocContext = createContext(null)

export const useDoc = () => useContext(DocContext)

export function DocProvider({ doc, onChange, editable = true, children }) {
  const value = {
    doc,
    editable,
    get: (path) => getPath(doc, path),
    set: (path, v) => onChange(setPath(doc, path, v)),
  }
  return <DocContext.Provider value={value}>{children}</DocContext.Provider>
}

export function getPath(obj, path) {
  return String(path)
    .split('.')
    .reduce((o, k) => (o == null ? undefined : o[k]), obj)
}

/** An immutable set: every object on the way down is copied, nothing else. */
export function setPath(obj, path, value) {
  const [head, ...rest] = String(path).split('.')
  const key = Array.isArray(obj) ? Number(head) : head
  const current = obj == null ? (/^\d+$/.test(head) ? [] : {}) : obj
  const next = rest.length ? setPath(current[key], rest.join('.'), value) : value
  if (Array.isArray(current)) {
    const copy = current.slice()
    copy[key] = next
    return copy
  }
  return { ...current, [key]: next }
}

// "plaintext-only" keeps pasted formatting and <div>s out of the field, where
// the browser supports it; elsewhere pasting is still forced to plain text.
let plaintextSupport = null
function editableMode() {
  if (plaintextSupport === null) {
    try {
      const el = document.createElement('div')
      el.contentEditable = 'plaintext-only'
      plaintextSupport = el.contentEditable === 'plaintext-only'
    } catch {
      plaintextSupport = false
    }
  }
  return plaintextSupport ? 'plaintext-only' : 'true'
}

/**
 * One editable piece of text.
 *
 * `format`/`parse` let a field show one thing and store another: a price reads
 * "₦500,000" on the page, but is typed and stored as 500000.
 */
export function E({ path, as: Tag = 'span', className = '', multiline = false, placeholder = '', format, parse }) {
  const { get, set, editable } = useDoc()
  const raw = get(path)
  const value = raw == null ? '' : raw
  const shown = format ? format(value) : String(value)
  const ref = useRef(null)
  const focused = useRef(false)

  useLayoutEffect(() => {
    if (ref.current && !focused.current && ref.current.textContent !== shown) ref.current.textContent = shown
  })

  if (!editable) return <Tag className={className}>{shown}</Tag>

  function commit() {
    focused.current = false
    const el = ref.current
    if (!el) return
    let text = multiline ? el.innerText : el.textContent
    text = multiline ? text.replace(/\n{3,}/g, '\n\n').trim() : text.replace(/\s+/g, ' ').trim()
    const next = parse ? parse(text) : text
    if (String(next) !== String(value)) set(path, next)
    else el.textContent = shown
  }

  return (
    <Tag
      ref={ref}
      className={`dt-e ${multiline ? 'dt-e-multi' : ''} ${className}`}
      contentEditable={editableMode()}
      suppressContentEditableWarning
      spellCheck
      data-placeholder={placeholder}
      onFocus={() => {
        focused.current = true
        if (format && ref.current) ref.current.textContent = String(value)
      }}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === 'Enter' && !multiline) {
          e.preventDefault()
          e.currentTarget.blur()
        }
        if (e.key === 'Escape') {
          e.currentTarget.textContent = String(value)
          e.currentTarget.blur()
        }
      }}
      onPaste={(e) => {
        e.preventDefault()
        const text = e.clipboardData.getData('text/plain')
        document.execCommand('insertText', false, multiline ? text : text.replace(/\s+/g, ' '))
      }}
    />
  )
}

/**
 * A date. It always reads as the document formats it ("March 13, 2024"); a
 * native date input sits invisibly over the text, so clicking it opens the
 * browser's own picker.
 */
export function EDate({ path, format, className = '' }) {
  const { get, set, editable } = useDoc()
  const value = get(path) || ''
  const text = format(value) || 'Pick a date'
  if (!editable) return <span className={className}>{text}</span>
  return (
    <span className={`dt-date ${className}`}>
      {text}
      <input
        type="date"
        className="dt-date-input dt-screen-only"
        value={/^\d{4}-\d{2}-\d{2}$/.test(value) ? value : ''}
        onChange={(e) => e.target.value && set(path, e.target.value)}
        onClick={(e) => {
          try {
            e.currentTarget.showPicker?.()
          } catch {
            // older browsers open it themselves on focus
          }
        }}
        aria-label="Change date"
      />
    </span>
  )
}

/** Controls that exist only while editing: never printed. */
export function EditOnly({ children }) {
  const { editable } = useDoc()
  return editable ? children : null
}

/** Removes item `index` from the array at `path`. */
export function useListOps(path) {
  const { get, set } = useDoc()
  const list = get(path) || []
  return {
    list,
    add: (item) => set(path, [...list, item]),
    remove: (index) => set(path, list.filter((_, i) => i !== index)),
    move: (index, dir) => {
      const to = index + dir
      if (to < 0 || to >= list.length) return
      const copy = list.slice()
      ;[copy[index], copy[to]] = [copy[to], copy[index]]
      set(path, copy)
    },
  }
}

/** The little × on a list row, shown on hover while editing. */
export function RemoveBtn({ onClick, label = 'Remove' }) {
  const { editable } = useDoc()
  if (!editable) return null
  return (
    <button type="button" className="dt-remove dt-screen-only" onClick={onClick} aria-label={label} title={label}>
      ×
    </button>
  )
}

export function AddBtn({ onClick, children }) {
  const { editable } = useDoc()
  if (!editable) return null
  return (
    <button type="button" className="dt-add dt-screen-only" onClick={onClick}>
      + {children}
    </button>
  )
}

/** A list of strings, one editable line each. */
export function EList({ path, className = '', itemClassName = '', addLabel = 'Add item', placeholder = 'New item', renderPrefix }) {
  const { list, add, remove } = useListOps(path)
  return (
    <>
      <ul className={className}>
        {list.map((_, i) => (
          <li key={i} className={`dt-row-edit ${itemClassName}`}>
            {renderPrefix?.(i)}
            <E path={`${path}.${i}`} placeholder={placeholder} />
            <RemoveBtn onClick={() => remove(i)} />
          </li>
        ))}
      </ul>
      <AddBtn onClick={() => add('')}>{addLabel}</AddBtn>
    </>
  )
}
