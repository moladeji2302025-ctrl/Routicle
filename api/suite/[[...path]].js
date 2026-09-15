import { sql } from '../_lib/db.js'
import { requireUser } from '../_lib/auth.js'
import { send, methodGuard, withErrorHandling } from '../_lib/http.js'

/**
 * The Business Suite API, behind one Vercel function.
 *
 *   GET/PUT   /api/suite/profile                studio profile
 *   GET/POST  /api/suite/projects               list / create
 *   GET/PATCH/DELETE /api/suite/projects/:id    one project (+ its form, docs, schedule)
 *   GET/PUT   /api/suite/forms/:projectId       the project's discovery form
 *   POST      /api/suite/documents              save a generated document
 *   PATCH/DELETE /api/suite/documents/:id       edit / remove
 *   PUT       /api/suite/schedule/:projectId    recurring month plan
 *   GET       /api/suite/public/:slug           public form (no auth)
 *   POST      /api/suite/public/:slug           client submits (no auth)
 *
 * Everything except the two public routes is scoped to the signed-in owner.
 */
export default async function handler(req, res) {
  await withErrorHandling(res, async () => {
    const segments = req.query?.path
    const parts = Array.isArray(segments) ? segments : segments ? [segments] : []
    const [resource, id] = parts

    // The client-facing form must work for someone with no Routicle account —
    // that is the whole point of a shareable link.
    if (resource === 'public') return publicForm(req, res, id)

    const user = await requireUser(req, res)
    if (!user) return

    switch (resource) {
      case 'profile':
        return studioProfile(req, res, user)
      case 'projects':
        return id ? oneProject(req, res, user, id) : projects(req, res, user)
      case 'forms':
        return forms(req, res, user, id)
      case 'documents':
        return documents(req, res, user, id)
      case 'schedule':
        return schedule(req, res, user, id)
      default:
        return send(res, 404, { error: `Unknown suite route: ${resource || '(none)'}` })
    }
  })
}

/* ------------------------------------------------------------- ownership */

/** Every project-scoped route runs through this; there is no other way in. */
async function ownedProject(projectId, userId) {
  const rows = await sql`SELECT * FROM suite_projects WHERE id = ${projectId} AND user_id = ${userId}`
  return rows[0] || null
}

const serializeProject = (r) => ({
  id: r.id,
  name: r.name,
  clientName: r.client_name,
  clientCompany: r.client_company,
  clientEmail: r.client_email,
  clientPhone: r.client_phone,
  clientAddress: r.client_address,
  billingType: r.billing_type,
  status: r.status,
  description: r.description,
  startDate: r.start_date,
  endDate: r.end_date,
  currency: r.currency,
  createdAt: r.created_at,
  updatedAt: r.updated_at,
})

const serializeForm = (r) =>
  r && {
    id: r.id,
    projectId: r.project_id,
    title: r.title,
    intro: r.intro,
    questions: r.questions || [],
    shareSlug: r.share_slug,
    status: r.status,
    updatedAt: r.updated_at,
  }

const serializeDoc = (r) => ({
  id: r.id,
  projectId: r.project_id,
  kind: r.kind,
  title: r.title,
  content: r.content,
  status: r.status,
  period: r.period,
  createdAt: r.created_at,
  updatedAt: r.updated_at,
})

/* --------------------------------------------------------- studio profile */

async function studioProfile(req, res, user) {
  if (!methodGuard(req, res, ['GET', 'PUT'])) return

  if (req.method === 'GET') {
    const rows = await sql`SELECT * FROM studio_profiles WHERE user_id = ${user.id}`
    const r = rows[0]
    return send(res, 200, {
      profile: r
        ? {
            studioName: r.studio_name,
            leadName: r.lead_name,
            roleTitle: r.role_title,
            address: r.address,
            phone: r.phone,
            email: r.email,
            website: r.website,
            bankName: r.bank_name,
            accountName: r.account_name,
            accountNumber: r.account_number,
            currency: r.currency,
            vision: r.vision,
            mission: r.mission,
            coreValues: r.core_values || [],
            about: r.about,
            whatWeDo: r.what_we_do || [],
            staff: r.staff || [],
            caseStudy: r.case_study,
          }
        : null,
    })
  }

  const b = req.body || {}
  await sql`
    INSERT INTO studio_profiles (
      user_id, studio_name, lead_name, role_title, address, phone, email, website,
      bank_name, account_name, account_number, currency,
      vision, mission, core_values, about, what_we_do, staff, case_study, updated_at
    ) VALUES (
      ${user.id}, ${b.studioName || null}, ${b.leadName || null}, ${b.roleTitle || 'Design Lead'},
      ${b.address || null}, ${b.phone || null}, ${b.email || null}, ${b.website || null},
      ${b.bankName || null}, ${b.accountName || null}, ${b.accountNumber || null}, ${b.currency || 'NGN'},
      ${b.vision || null}, ${b.mission || null}, ${JSON.stringify(b.coreValues || [])},
      ${b.about || null}, ${JSON.stringify(b.whatWeDo || [])}, ${JSON.stringify(b.staff || [])},
      ${b.caseStudy ? JSON.stringify(b.caseStudy) : null}, now()
    )
    ON CONFLICT (user_id) DO UPDATE SET
      studio_name = EXCLUDED.studio_name, lead_name = EXCLUDED.lead_name, role_title = EXCLUDED.role_title,
      address = EXCLUDED.address, phone = EXCLUDED.phone, email = EXCLUDED.email, website = EXCLUDED.website,
      bank_name = EXCLUDED.bank_name, account_name = EXCLUDED.account_name,
      account_number = EXCLUDED.account_number, currency = EXCLUDED.currency,
      vision = EXCLUDED.vision, mission = EXCLUDED.mission, core_values = EXCLUDED.core_values,
      about = EXCLUDED.about, what_we_do = EXCLUDED.what_we_do, staff = EXCLUDED.staff,
      case_study = EXCLUDED.case_study, updated_at = now()
  `
  return send(res, 200, { ok: true })
}

/* --------------------------------------------------------------- projects */

async function projects(req, res, user) {
  if (!methodGuard(req, res, ['GET', 'POST'])) return

  if (req.method === 'GET') {
    const rows = await sql`
      SELECT p.*,
             (SELECT COUNT(*)::int FROM project_documents d WHERE d.project_id = p.id) AS doc_count,
             (SELECT COUNT(*)::int FROM form_submissions s
                JOIN project_forms f ON f.id = s.form_id WHERE f.project_id = p.id) AS response_count
      FROM suite_projects p
      WHERE p.user_id = ${user.id}
      ORDER BY p.created_at DESC
    `
    return send(res, 200, {
      projects: rows.map((r) => ({ ...serializeProject(r), docCount: r.doc_count, responseCount: r.response_count })),
    })
  }

  const b = req.body || {}
  if (!b.name?.trim()) return send(res, 400, { error: 'A project name is required.' })
  const billing = ['one_time', 'recurring'].includes(b.billingType) ? b.billingType : 'one_time'

  const rows = await sql`
    INSERT INTO suite_projects (user_id, organization_id, name, client_name, client_company,
      client_email, client_phone, client_address, billing_type, description, start_date, end_date, currency)
    VALUES (${user.id}, ${b.organizationId || null}, ${b.name.trim()}, ${b.clientName || null},
      ${b.clientCompany || null}, ${b.clientEmail || null}, ${b.clientPhone || null},
      ${b.clientAddress || null}, ${billing}, ${b.description || null},
      ${b.startDate || null}, ${b.endDate || null}, ${b.currency || 'NGN'})
    RETURNING *
  `
  const project = rows[0]

  // Every project starts with a form, so "Create a Routicle Form" is a matter
  // of choosing questions rather than a second setup step.
  const slug = `${project.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '').slice(0, 32)}-${Math.random().toString(36).slice(2, 8)}`
  await sql`
    INSERT INTO project_forms (project_id, share_slug, questions, intro)
    VALUES (${project.id}, ${slug}, '[]'::jsonb,
      ${`A few questions about ${project.name} before we start.`})
  `
  return send(res, 201, { project: serializeProject(project) })
}

async function oneProject(req, res, user, id) {
  if (!methodGuard(req, res, ['GET', 'PATCH', 'DELETE'])) return

  const project = await ownedProject(id, user.id)
  if (!project) return send(res, 404, { error: 'Project not found' })

  if (req.method === 'GET') {
    const [formRows, docRows, scheduleRows, submissionRows] = await Promise.all([
      sql`SELECT * FROM project_forms WHERE project_id = ${id} LIMIT 1`,
      sql`SELECT * FROM project_documents WHERE project_id = ${id} ORDER BY created_at DESC`,
      sql`SELECT period, doc_kinds, note FROM project_schedule WHERE project_id = ${id} ORDER BY period`,
      sql`SELECT s.* FROM form_submissions s JOIN project_forms f ON f.id = s.form_id
          WHERE f.project_id = ${id} ORDER BY s.submitted_at DESC`,
    ])
    return send(res, 200, {
      project: serializeProject(project),
      form: serializeForm(formRows[0]),
      documents: docRows.map(serializeDoc),
      schedule: scheduleRows.map((r) => ({ period: r.period, docKinds: r.doc_kinds || [], note: r.note })),
      submissions: submissionRows.map((s) => ({
        id: s.id,
        answers: s.answers,
        respondentName: s.respondent_name,
        respondentEmail: s.respondent_email,
        submittedAt: s.submitted_at,
      })),
    })
  }

  if (req.method === 'DELETE') {
    await sql`DELETE FROM suite_projects WHERE id = ${id}`
    return send(res, 200, { ok: true })
  }

  const b = req.body || {}
  const rows = await sql`
    UPDATE suite_projects SET
      name = COALESCE(${b.name?.trim() ?? null}, name),
      client_name = COALESCE(${b.clientName ?? null}, client_name),
      client_company = COALESCE(${b.clientCompany ?? null}, client_company),
      client_email = COALESCE(${b.clientEmail ?? null}, client_email),
      client_phone = COALESCE(${b.clientPhone ?? null}, client_phone),
      client_address = COALESCE(${b.clientAddress ?? null}, client_address),
      billing_type = COALESCE(${['one_time', 'recurring'].includes(b.billingType) ? b.billingType : null}, billing_type),
      status = COALESCE(${['active', 'archived'].includes(b.status) ? b.status : null}, status),
      description = COALESCE(${b.description ?? null}, description),
      start_date = COALESCE(${b.startDate ?? null}, start_date),
      end_date = COALESCE(${b.endDate ?? null}, end_date),
      currency = COALESCE(${b.currency ?? null}, currency),
      updated_at = now()
    WHERE id = ${id}
    RETURNING *
  `
  return send(res, 200, { project: serializeProject(rows[0]) })
}

/* ------------------------------------------------------------------ forms */

async function forms(req, res, user, projectId) {
  if (!methodGuard(req, res, ['GET', 'PUT'])) return
  const project = await ownedProject(projectId, user.id)
  if (!project) return send(res, 404, { error: 'Project not found' })

  if (req.method === 'GET') {
    const rows = await sql`SELECT * FROM project_forms WHERE project_id = ${projectId} LIMIT 1`
    return send(res, 200, { form: serializeForm(rows[0]) })
  }

  const b = req.body || {}
  const rows = await sql`
    UPDATE project_forms SET
      title = COALESCE(${b.title ?? null}, title),
      intro = COALESCE(${b.intro ?? null}, intro),
      questions = COALESCE(${b.questions ? JSON.stringify(b.questions) : null}::jsonb, questions),
      status = COALESCE(${['draft', 'open', 'closed'].includes(b.status) ? b.status : null}, status),
      updated_at = now()
    WHERE project_id = ${projectId}
    RETURNING *
  `
  if (rows.length === 0) return send(res, 404, { error: 'Form not found' })
  return send(res, 200, { form: serializeForm(rows[0]) })
}

/* -------------------------------------------------------------- documents */

async function documents(req, res, user, id) {
  if (!methodGuard(req, res, ['POST', 'PATCH', 'DELETE'])) return

  if (req.method === 'POST') {
    const b = req.body || {}
    const project = await ownedProject(b.projectId, user.id)
    if (!project) return send(res, 404, { error: 'Project not found' })
    if (!['brief', 'proposal', 'contract', 'invoice'].includes(b.kind)) {
      return send(res, 400, { error: 'Unknown document kind' })
    }
    const rows = await sql`
      INSERT INTO project_documents (project_id, kind, title, content, period)
      VALUES (${b.projectId}, ${b.kind}, ${b.title || b.kind}, ${JSON.stringify(b.content || {})}, ${b.period || null})
      RETURNING *
    `
    return send(res, 201, { document: serializeDoc(rows[0]) })
  }

  if (!id) return send(res, 400, { error: 'Document id is required' })

  // Ownership travels through the project, so a document id alone is never enough.
  const owned = await sql`
    SELECT d.id FROM project_documents d
    JOIN suite_projects p ON p.id = d.project_id
    WHERE d.id = ${id} AND p.user_id = ${user.id}
  `
  if (owned.length === 0) return send(res, 404, { error: 'Document not found' })

  if (req.method === 'DELETE') {
    await sql`DELETE FROM project_documents WHERE id = ${id}`
    return send(res, 200, { ok: true })
  }

  const b = req.body || {}
  const rows = await sql`
    UPDATE project_documents SET
      title = COALESCE(${b.title ?? null}, title),
      content = COALESCE(${b.content ? JSON.stringify(b.content) : null}::jsonb, content),
      status = COALESCE(${['draft', 'sent', 'accepted', 'paid', 'void'].includes(b.status) ? b.status : null}, status),
      updated_at = now()
    WHERE id = ${id}
    RETURNING *
  `
  return send(res, 200, { document: serializeDoc(rows[0]) })
}

/* --------------------------------------------------------------- schedule */

async function schedule(req, res, user, projectId) {
  if (!methodGuard(req, res, ['PUT'])) return
  const project = await ownedProject(projectId, user.id)
  if (!project) return send(res, 404, { error: 'Project not found' })

  const { period, docKinds, note } = req.body || {}
  if (!/^\d{4}-\d{2}$/.test(period || '')) return send(res, 400, { error: 'period must be YYYY-MM' })

  const kinds = (Array.isArray(docKinds) ? docKinds : []).filter((k) =>
    ['brief', 'proposal', 'contract', 'invoice'].includes(k)
  )

  // Clearing every kind for a month means "nothing goes out", which is a real
  // choice for a retainer — so an empty list deletes the row rather than
  // leaving a month pinned with no deliverables.
  if (kinds.length === 0 && !note) {
    await sql`DELETE FROM project_schedule WHERE project_id = ${projectId} AND period = ${period}`
    return send(res, 200, { ok: true, cleared: true })
  }

  await sql`
    INSERT INTO project_schedule (project_id, period, doc_kinds, note)
    VALUES (${projectId}, ${period}, ${kinds}, ${note || null})
    ON CONFLICT (project_id, period) DO UPDATE SET doc_kinds = EXCLUDED.doc_kinds, note = EXCLUDED.note
  `
  return send(res, 200, { ok: true })
}

/* ------------------------------------------------------------ public form */

async function publicForm(req, res, slug) {
  if (!methodGuard(req, res, ['GET', 'POST'])) return
  if (!slug) return send(res, 400, { error: 'Form link is missing its id.' })

  const rows = await sql`
    SELECT f.*, p.name AS project_name, p.client_company
    FROM project_forms f JOIN suite_projects p ON p.id = f.project_id
    WHERE f.share_slug = ${slug}
  `
  const form = rows[0]
  if (!form) return send(res, 404, { error: 'This form link is not valid.' })
  if (form.status !== 'open') return send(res, 403, { error: 'This form is not accepting responses right now.' })

  if (req.method === 'GET') {
    return send(res, 200, {
      form: {
        title: form.title,
        intro: form.intro,
        questions: form.questions || [],
        projectName: form.client_company || form.project_name,
      },
    })
  }

  const { answers, respondentName, respondentEmail } = req.body || {}
  if (!answers || typeof answers !== 'object') return send(res, 400, { error: 'No answers were submitted.' })

  await sql`
    INSERT INTO form_submissions (form_id, answers, respondent_name, respondent_email)
    VALUES (${form.id}, ${JSON.stringify(answers)}, ${respondentName || null}, ${respondentEmail || null})
  `
  return send(res, 201, { ok: true })
}
