/**
 * The master bank of discovery questions, verbatim from the source deck and
 * grouped the way it groups them. Subscribers drag the ones relevant to a
 * project into their own form — the deck's own closing note is the point:
 * "Do not ask all these questions all at once, pick questions relevant to the
 * project you're on discovery for."
 *
 * `type` drives the input the client sees, and `maps` names the document field
 * an answer feeds, so a generated brief can quote the client rather than
 * leaving a blank for the designer to fill in from memory.
 */
export const QUESTION_GROUPS = [
  {
    id: 'client-discovery',
    label: 'Client Discovery',
    blurb: 'Who they are and what they are trying to achieve.',
    questions: [
      { id: 'q1', text: 'What are your primary business goals for the next 6-12 months?', type: 'long', maps: 'goals' },
      { id: 'q2', text: 'Who is your target audience, and what challenges do they face?', type: 'long', maps: 'audience' },
      { id: 'q3', text: 'What problem does your product/service solve for your customers?', type: 'long', maps: 'problem' },
      { id: 'q4', text: 'How do you currently measure success for your marketing or branding efforts?', type: 'long', maps: 'successMetrics' },
      { id: 'q5', text: 'Are there any specific competitors you admire or want to differentiate yourself from?', type: 'long', maps: 'competitors' },
    ],
  },
  {
    id: 'project-specific',
    label: 'Project-Specific',
    blurb: 'The shape of this particular piece of work.',
    questions: [
      { id: 'q6', text: 'What inspired this project, and why is it important now?', type: 'long', maps: 'inspiration' },
      { id: 'q7', text: 'Are there any brand guidelines or creative preferences we should follow?', type: 'long', maps: 'guidelines' },
      { id: 'q8', text: 'What is the most important message you want your audience to take away?', type: 'long', maps: 'keyMessage' },
      { id: 'q9', text: 'Do you have a timeline or any key deadlines for this project?', type: 'short', maps: 'deadline' },
      { id: 'q10', text: 'What does a successful outcome look like to you?', type: 'long', maps: 'successLooksLike' },
    ],
  },
  {
    id: 'brand-identity',
    label: 'Brand Identity',
    blurb: 'How the brand should feel and where it shows up.',
    questions: [
      { id: 'q11', text: "What is your brand's mission, vision, and core values?", type: 'long', maps: 'brandValues' },
      { id: 'q12', text: 'How do you want your brand to make people feel?', type: 'long', maps: 'brandFeeling' },
      { id: 'q13', text: 'What are the three words that best describe your brand?', type: 'short', maps: 'brandWords' },
      { id: 'q14', text: 'Are there any colors, symbols, or design elements that resonate with your brand?', type: 'long', maps: 'brandElements' },
      { id: 'q15', text: 'What platforms or channels are most important for your brand presence?', type: 'long', maps: 'channels' },
    ],
  },
  {
    id: 'engagement',
    label: 'Value-Driven Engagement',
    blurb: 'How the working relationship should run.',
    questions: [
      { id: 'q16', text: 'How does this project fit into your larger business strategy?', type: 'long', maps: 'strategyFit' },
      { id: 'q17', text: 'Are there opportunities for us to collaborate long-term on future projects?', type: 'long', maps: 'longTerm' },
      { id: 'q18', text: "What has worked well or not worked well with previous creatives you've worked with?", type: 'long', maps: 'pastExperience' },
      { id: 'q19', text: 'What are your pain points when it comes to executing this type of project?', type: 'long', maps: 'painPoints' },
      { id: 'q20', text: 'How do you prefer to communicate and review progress during the project?', type: 'long', maps: 'communication' },
    ],
  },
  {
    id: 'urgency',
    label: 'Urgency-Driven',
    blurb: 'Why now, and what does waiting cost them?',
    questions: [
      { id: 'q22', text: 'Why is now the right time to move forward with this project? What has changed in your business or market to make it a priority?', type: 'long', maps: 'whyNow' },
      { id: 'q23', text: "If this project doesn't move forward, what opportunities do you think you might miss out on?", type: 'long', maps: 'missedOpportunity' },
      { id: 'q24', text: 'What specific problem or gap are you hoping to solve with this initiative, and how long have you been experiencing it?', type: 'long', maps: 'gap' },
      { id: 'q25', text: 'How do you think this project will impact your business in the next 6 months, 1 year, or 5 years?', type: 'long', maps: 'impact' },
      { id: 'q26', text: 'If you decide to delay or not pursue this project, what risks or challenges do you foresee?', type: 'long', maps: 'risks' },
      { id: 'q27', text: 'What has prevented you from tackling this project sooner, and what has changed to make it a priority now?', type: 'long', maps: 'blockers' },
      { id: 'q28', text: "How does this project align with your overall business goals or vision? What happens if it doesn't get executed?", type: 'long', maps: 'alignment' },
      { id: 'q29', text: 'What would success in this project mean for you, your team, and your customers? What does failure to act mean?', type: 'long', maps: 'stakes' },
      { id: 'q30', text: 'If a competitor launched something similar first, how would that affect your position in the market?', type: 'long', maps: 'competitiveRisk' },
    ],
  },
]

/** Flat lookup, since forms store question ids and need to resolve them back. */
export const ALL_QUESTIONS = QUESTION_GROUPS.flatMap((g) =>
  g.questions.map((q) => ({ ...q, groupId: g.id, groupLabel: g.label }))
)

export function findQuestion(id) {
  return ALL_QUESTIONS.find((q) => q.id === id) || null
}

/** A sensible opening form: the five that apply to almost any project. */
export const STARTER_QUESTION_IDS = ['q1', 'q2', 'q6', 'q9', 'q10']
