// PhD Application Tracker data — extracted from
// 0_code/a_partials/05_applicationTracker.html (2025-2026 cycle, 20-school table).
//
// statusVariant / decisionVariant map the original `badge--*` classes onto the
// @/ui Badge variants 1:1 (badge--success → success, badge--failure → failure,
// badge--warning → warning). The original markup's badge choices are preserved
// verbatim, including its quirks (UT Austin shows "WAITLISTED" with a
// badge--failure class), so the React render matches the static page exactly.
//
// Proof PDFs map data-proof-pdf="2_docs/03_ApplicationDecisions/X.pdf" onto the
// staged public path "/docs/ApplicationDecisions/X.pdf". Email proof bodies are
// preserved exactly (line breaks as \n); some bodies contain inline HTML (links,
// <b> tags) that the original modal rendered via innerHTML.

import type { BadgeVariant } from '@/ui'

export interface ProofEmail {
  kind: 'email'
  from?: string
  date?: string
  subject?: string
  body: string
}

export interface ProofPdf {
  kind: 'pdf'
  url: string
}

export type Proof = ProofEmail | ProofPdf

export interface ApplicationRow {
  rank: number
  school: string
  deadline: string
  status: string // e.g. 'SUBMITTED'
  statusVariant: BadgeVariant
  decision?: string // e.g. 'ACCEPTED 3/14', 'WAITLISTED', 'REJECTED'
  decisionVariant?: BadgeVariant
  proof?: Proof
}

export const applications: ApplicationRow[] = [
  {
    rank: 1,
    school: 'Yale University',
    deadline: '12/1/2025',
    status: 'SUBMITTED',
    statusVariant: 'success',
    decision: 'REJECTED (2/26/2026)',
    decisionVariant: 'failure',
    proof: {
      kind: 'email',
      from: '',
      date: 'February 26, 2026',
      subject: 'Yale Applicaiton Status',
      body: `Dear Michael Sparks,

Thank you very much for applying to the Graduate School of Arts and Sciences at Yale University. I regret to inform you that we are unable to offer you admission. As youknow, the very high number of extraordinary candidates far exceeds the number of places we have in each program, and we are not able to admit many excellent candidates.

We wish you every success in all your future endeavours.
Sincerely,
Lynn Cooley
Dean, Graduate School of Arts & Sciences`,
    },
  },
  {
    rank: 2,
    school: 'Univ. of Michigan',
    deadline: '12/1/2025',
    status: 'SUBMITTED',
    statusVariant: 'success',
    decision: 'WAITLISTED (2/17/2026)',
    decisionVariant: 'warning',
    proof: {
      kind: 'pdf',
      url: '/docs/ApplicationDecisions/Sparks_Michigan_WL.pdf',
    },
  },
  {
    rank: 3,
    school: 'UCLA',
    deadline: '12/1/2025',
    status: 'SUBMITTED',
    statusVariant: 'success',
    decision: 'REJECTED (4/15/2026)',
    decisionVariant: 'failure',
  },
  {
    rank: 4,
    school: 'Stanford University',
    deadline: '12/3/2025',
    status: 'SUBMITTED',
    statusVariant: 'success',
    decision: 'REJECTED (2/20/2026)',
    decisionVariant: 'failure',
  },
  {
    rank: 5,
    school: 'UCSD',
    deadline: '12/3/2025',
    status: 'SUBMITTED',
    statusVariant: 'success',
    decision: 'ACCEPTED (3/3/2026)',
    decisionVariant: 'success',
    proof: {
      kind: 'email',
      from: 'econ-phdadmissions@ucsd.edu',
      date: 'March 3, 2026',
      subject: 'UC San Diego Application Update',
      body: `Dear Michael,

We are writing to congratulate you on your impressive achievements as described in your application to our Economics (PhD) program. We believe you have great potential to succeed as a graduate student at UC San Diego and thus, <b> we are nominating you for admission to our program in Fall 2026!</b>
The purpose of this nomination notice is to share as early as possible our enthusiasm at the prospect of you joining our community. You will receive a formal admission decision letter from the UC San Diego Division of Graduate Education and Postdoctoral Affairs (GEPA) after confirmation that your submitted application materials are complete and meet university-wide admissions requirements. For admitted students who meet those formal admissions requirements, their financial support package would begin with at least $37,500 in support, plus full tuition and fee coverage, over their first year in the program.

Feel free to contact us directly if you have questions: econ-phdadmissions@ucsd.edu. You will be receiving more details around the status of your admission soon.

Sincerely,
The Economics Department
UC San Diego`,
    },
  },
  {
    rank: 6,
    school: 'Univ. of Chicago',
    deadline: '12/4/2025',
    status: 'SUBMITTED',
    statusVariant: 'success',
    decision: 'REJECTED (3/2/2026)',
    decisionVariant: 'failure',
  },
  {
    rank: 7,
    school: 'Columbia University',
    deadline: '12/4/2025',
    status: 'SUBMITTED',
    statusVariant: 'success',
    decision: 'REJECTED(3/10/2026)',
    decisionVariant: 'failure',
  },
  {
    rank: 8,
    school: 'UW-Madison',
    deadline: '12/5/2025',
    status: 'SUBMITTED',
    statusVariant: 'success',
    decision: 'REJECTED (4/15/2026)',
    decisionVariant: 'failure',
  },
  {
    rank: 9,
    school: 'LSE',
    deadline: '12/10/2025',
    status: 'SUBMITTED',
    statusVariant: 'success',
    decision: 'REJECTED (2/13/2026)',
    decisionVariant: 'failure',
    proof: {
      kind: 'email',
      from: 'My Application Status',
      date: 'February 13, 2026',
      subject: 'Application Updates',
      body: `
Your application has not been successful. We know that you will find this decision disappointing. Please remember that the competition for places at LSE is intense, and every year we have many more highly qualified applicants than there are places available. We consider applications holistically, taking into consideration not just your marks, but also the relevance of your academic background to the programme, your references and your personal statement. Each application is considered on its merits within the cohort of applications received in the current cycle, looking for those people with the academic motivation, merit and potential to best succeed on their chosen programme. In your case the selectors considered that there were other more suitable candidates. The selectors' decision is final and your application cannot be reconsidered for the same programme in this academic cycle.

`,
    },
  },
  {
    rank: 10,
    school: 'Univ. of Minnesota',
    deadline: '12/12/2025',
    status: 'SUBMITTED',
    statusVariant: 'success',
    decision: 'ACCEPTED (2/17/2026)',
    decisionVariant: 'success',
    proof: {
      kind: 'pdf',
      url: '/docs/ApplicationDecisions/Sparks_Minnesota_ACC.pdf',
    },
  },
  {
    rank: 11,
    school: 'UBC',
    deadline: '12/15/2025',
    status: 'SUBMITTED',
    statusVariant: 'success',
    decision: 'REJECTED (4/15/2026)',
    decisionVariant: 'failure',
  },
  {
    rank: 12,
    school: 'Cornell University',
    deadline: '12/15/2025',
    status: 'SUBMITTED',
    statusVariant: 'success',
    decision: 'WAITLISTED (2/11/2026)',
    decisionVariant: 'warning',
    proof: {
      kind: 'email',
      from: 'gradadmissions@gradschool.cornell.edu',
      date: 'February 11, 2026',
      subject: 'Cornell University Economics: Admissions Decision',
      body: `Dear Michael,
Thank you very much for yout interest in our economics Ph.D. program. The admissions committee was very impressed with your application. While we were not able to extend you an offer in our first wave of admissions offer, it is possible but not guaranteed that we can do so in the near future. As such we would like to keep your application active.

The Cornell Economics Ph.D. program is the joint effort of more than 100 economists in different departments and schools at the university. It is one of the most diverse and broad-ranging programs in the world. The Cornell Economics Department has undergone major changes in recent years, broadening and deepening its strengths in many areas of Economics.

The Department is made up predominantly of economists in the College of Arts and Sciences, labor economists in the School of Industrial and Labor Relations, and public policy economists in the newly-created Jeb E. Brooks School of Public Policy. Several Economics faculty members have joint appointments in other units on campus, such as Computer and Information Science, Statistics and Data Science, the Johnson Graduate School of Management, and Applied Economics and Management. A complete list of our graduate faculty is located at
<a href='https://economics.cornell.edu/grad-field-faculty' target='_blank' class='tracker-link'>[ LINK ]</a>.

Please contact Jennine Crouse Hagadorn by phone (+REDACTED) or email (REDACTED) if you have any questions about the status or updates regarding your status. You can expect to receive an update from us by <b>April 1, 2026</b>

Thank you for your interest in Cornell Economics.

Sincerely,
<a href = 'https://molinari.economics.cornell.edu/' target = '_blank' class ='tracker-link' >Francesca Molinari</a>

`,
    },
  },
  {
    rank: 13,
    school: 'UT Austin',
    deadline: '12/15/2025',
    status: 'SUBMITTED',
    statusVariant: 'success',
    decision: 'WAITLISTED (3/30/2026)',
    decisionVariant: 'failure',
  },
  {
    rank: 14,
    school: 'Univ. of Rochester',
    deadline: '12/15/2025',
    status: 'SUBMITTED',
    statusVariant: 'success',
    decision: 'REJECTED (2/26/2026)',
    decisionVariant: 'failure',
  },
  {
    rank: 15,
    school: 'NYU',
    deadline: '12/18/2025',
    status: 'SUBMITTED',
    statusVariant: 'success',
    decision: 'REJECTED (4/15/2026)',
    decisionVariant: 'failure',
  },
  {
    rank: 16,
    school: 'Duke Univ.',
    deadline: '1/6/2026',
    status: 'SUBMITTED',
    statusVariant: 'success',
    decision: 'ACCEPTED (4/9/2026)',
    decisionVariant: 'success',
    proof: {
      kind: 'pdf',
      url: '/docs/ApplicationDecisions/Sparks_Duke_WL.pdf',
    },
  },
  {
    rank: 17,
    school: 'Boston Univ.',
    deadline: '1/7/2026',
    status: 'SUBMITTED',
    statusVariant: 'success',
    decision: 'WAITLISTED (3/5/2026)',
    decisionVariant: 'warning',
    proof: {
      kind: 'email',
      from: 'guren@bu.edu',
      date: 'March 5, 2026',
      subject: 'Boston University Economics PhD Status Update',
      body: `Dear Michael,

Our admissions committee was extremely impressed by your application. However, we are extremely constrained in our ability to make offers this year, and we have made the difficult decision to put you on the waitlist for admission for the time being.

I am hoping to stay in touch with you over the next few weeks to gauge your interest in being admitted off the waitlist. The best strategy is to be as communicative as possible. I will be your primary point of contact. Please respond to my emails, let me know your level of interest, and keep me posted as deadlines near or if circumstances change. Do not hesitate to email me, and I will do my best to be as honest as I can with you about where you stand. I would also appreciate it if you were honest about having an offer you prefer that would lead you not to take a potential offer from BU seriously.

The most common question I receive from waitlisted students is the likelihood of their being admitted from the waitlist and when they can expect this uncertainty to be resolved. Given your position on the waitlist, I expect that I will not have much clarity until April.

Unless we hear from you otherwise, we will keep your application on the waiting list. Should you wish to withdraw your application from consideration, please notify both me at guren@bu.edu and Mirtha Cabello, PhD program administrator, by email at cabello@bu.edu as soon as possible.

Again, thank you for your interest in the BU Economics PhD Program.

Sincerely,

Adam Guren
Associate Professor of Economics and Recruiting Chair
Boston University`,
    },
  },
  {
    rank: 18,
    school: 'Boston Univ. (Questrom)',
    deadline: '1/7/2026',
    status: 'SUBMITTED',
    statusVariant: 'success',
    decision: 'ACCEPTED (3/4/2026)',
    decisionVariant: 'success',
    proof: {
      kind: 'pdf',
      url: '/docs/ApplicationDecisions/Sparks_Questrom_ACC.pdf',
    },
  },
  {
    rank: 19,
    school: 'Univ. of Zurich',
    deadline: '1/15/2026',
    status: 'SUBMITTED',
    statusVariant: 'success',
    decision: 'REJECTED (2/6/2026)',
    decisionVariant: 'failure',
    proof: {
      kind: 'email',
      from: 'zurichgse@econ.uzh.ch',
      date: 'February 6, 2026',
      subject: 'Your Application to the Zurich Graduate School of Economics',
      body: `Dear Michael Sparks,

Thank you for applying to the doctoral program in Economics at the University of Zurich. We are sorry to inform you that we are not able to admit you to our program.


This year, we had a very large number of applications, and we had to make extremely tough choices when selecting candidates. We were unable to admit several excellent candidates that we might have admitted in other years. Apart from the overall abilities (as measured by grades, GRE and TOEFL scores etc.), we paid particular attention to the fit of the candidates’ research interests with those of the faculty.


After careful consideration we have decided not to take your application any further. We are sorry that we do not have better news. We would like to take the opportunity to thank you for your interest in our program and to wish you all the best for your future career.

Yours sincerely,
Zurich Graduate School of Economics`,
    },
  },
  {
    rank: 20,
    school: 'Univ. of Toronto',
    deadline: '1/16/2026',
    status: 'SUBMITTED',
    statusVariant: 'success',
    decision: 'REJECTED (3/18/2026)',
    decisionVariant: 'failure',
  },
]
