# Course Exemptions — Product Specification

**Seminar Hakibbutzim College (SMKB)** · Version 1.0 · 2026-08-26

---

## Abstract

A student arriving at SMKB has often already studied. They may hold a completed degree in another
field, credits from another institution, or a recognised professional certificate. Some of what their
new programme requires, they have already done.

This product lets them say so, once, with evidence — and get an authoritative answer. It proposes
candidate matches between what a programme requires and what the student has already completed, puts
those in front of a member of staff who decides each one, and issues a certificate naming exactly what
the student no longer has to take.

This document describes what that experience should be. It is deliberately silent on how it would be
built.

---

## How to read this

| You are | Read | Time |
|---|---|---|
| Deciding whether to fund or proceed | §1, §4, §13 | ~15 min |
| Designing the experience | §2 → §12, in order | ~70 min |
| Building it | §4, §9, §10, §11, then §7 | ~45 min |
| Writing the words | §2, §5, §7, and the *Words on the screen* field of every entry | ~30 min |

Sections §1–§6 are narrative and read in sequence. Everything from §7 onward is reference material,
organised for lookup rather than reading.

---

## What this document deliberately does not contain

No technology, no products, no code, no infrastructure. Not as an oversight — as a stance. This
describes what the experience should be, for anyone who has to build it or judge it, and it is written
so that the answer does not change depending on what it is built with.

Where a rule is only intelligible through its mechanism, this document states **the outcome the user
experiences** and stops there. A student does not experience a matching algorithm. They experience
being told that four of their previous courses appear to count, and being right or wrong about that.

Two conventions that follow from this:

- **No screen is described twice.** Every screen, message and rule has exactly one entry that owns it;
  everything else refers to it by identifier. See the map below.
- **Where the product is undecided, it says so** — as a numbered `OPEN QUESTION` carrying a provisional
  answer, so the document still reads end to end. Seven remain. They are collected in §13.

---

## Map of identifiers

Every identifier used anywhere in this document, and where it is specified.

**Personas** — §3
`P-1` career-changer · `P-2` prospective enquirer · `P-3` transferring undergraduate · `P-4` reviewer ·
`P-5` administrator · `P-6` peripheral roles

**Rules** — §4
`R-01` what an exemption is · `R-02` how matches are proposed · `R-03` what is shown and hidden ·
`R-04` who decides · `R-05` completeness and finality · `R-06` reopening · `R-07` estimates before
enrolment · `R-08` correcting evidence and withdrawing · `R-09` one application per programme

**Journeys** — §6
`J-STU-01` first application · `J-STU-02` interrupted · `J-STU-03` mixed outcome · `J-STU-04` nothing
matched · `J-STU-05` withdrawal · `J-PRO-01` estimate to enrolment · `J-REV-01` reviewing a case ·
`J-ADM-01..03` administration

**Messages** — §7
`M-01` sign-in code · `M-02` received · `M-03` decided · `M-04` declined · `M-05` estimate ready ·
`M-06` reopened · `M-07` reviewer digest · `M-08` overdue apology · `M-09` estimate became formal ·
`M-10` withdrawal confirmed

**Student portal screens** — §10
`S-P-01` sign in · `S-P-02` code entry · `S-P-03` dashboard · `S-P-04` start an application ·
`S-P-05` prior study · `S-P-06` certificates · `S-P-07` evidence · `S-P-08` review and submit ·
`S-P-09` application status · `S-P-10` outcome · `S-P-11` declined · `S-P-12` estimate result ·
`S-P-13` help · `S-P-14` session ended

**Staff screens** — §11
`S-R-01` work queue · `S-R-02` review workspace · `S-R-03` suggestion detail · `S-R-04` finalise ·
`S-R-05` decline · `S-A-01` programmes and requirements · `S-A-02` matching rules · `S-A-03` active
rule set · `S-A-04` reopen · `S-A-05` exclude a decision · `S-A-06` staff access

**Open questions** — §13
`Q-02` privacy regime · `Q-03` accessibility target · `Q-04` retention · `Q-05` success metric ·
`Q-07` English · `Q-11` reviewer notification · `Q-14` eligibility floors

---

# §1 — Purpose and business context

## 1.1 The problem

Someone applies to a degree programme at SMKB having already studied. The college's exemption process
exists to answer one question: **which of this programme's requirements has this person already
satisfied elsewhere?**

The question is genuinely hard, and it is hard in a way that resists both pure automation and pure
human effort.

It resists automation because equivalence is a judgement, not a lookup. A course called *Introduction
to Psychology* at one institution may or may not cover what SMKB's *Introduction to Psychology*
requires. The names match; the syllabi may not. A course with an unrelated name may cover it exactly.

It resists pure human effort because of volume. A programme may carry forty requirements. A student may
bring thirty completed courses. Someone comparing every requirement against every completed course is
doing twelve hundred comparisons, almost all of which are obviously wrong, to find the four that
matter. That work is tedious, and tedium produces inconsistency — the same pairing decided differently
on a Tuesday than on a Thursday.

So the product's job is not to decide. It is to **find the handful of comparisons worth a person's
attention, and then get out of the way of the person making the judgement**.

## 1.2 Who benefits, and what each gains

**The student** gains time, money and certainty — and gains them *early*, at the point where the
answer still changes their decisions. Someone who learns in November that a course they are already
sitting was exemptable has learned it too late.

**The reviewer** gains a shortlist instead of a spreadsheet, with the student's evidence visible beside
each candidate. The work becomes judgement rather than search.

**The administrator** gains the ability to encode institutional knowledge — "our statistics
requirement is satisfied by any accredited statistics course" — once, rather than re-explaining it to
each reviewer.

**The institution** gains a defensible record. Every exemption granted has a named person attached, a
date, and a stated reason where one was required. When a decision is questioned a year later — by a
student, an auditor, or an accreditation body — the answer exists and can be produced.

## 1.3 What success looks like

Stated as things a person could observe, not as metrics to be gamed:

- **A student always knows where they stand without having to ask anyone.** No student should ever need
  to email someone to find out whether their application was received, or when they might hear back.
- **A reviewer's time goes to judgement, not to search.** If a reviewer is scrolling a transcript
  hunting for a course name, the product has failed at its primary job.
- **Two reviewers reach the same decision on the same evidence.** Consistency is a fairness property,
  not an efficiency one.
- **A decision made today is still explicable in three years.** Not merely recorded — *explicable*, in
  words a student could read.
- **The student's effort is never wasted.** Evidence gathered once is not gathered twice; work started
  before enrolment survives enrolment.

> **OPEN QUESTION Q-05 —** Which of these does the institution actually optimise for when they
> conflict? Reviewer effort, student wait, and decision consistency pull in different directions.
> **Blocks:** how §4 resolves the tension between speed and per-item human decision; how §11 prioritises
> queue design.
> **This document assumes:** reviewer effort first, student wait second, consistency third — inferable
> from the fact that a matching capability exists at all, and that nothing is granted without a person.
> **Who decides:** the academic office that owns the exemption process.

## 1.4 Constraints that shape everything

**Hebrew is the language, not a translation of one.** Every screen, message and document is composed
in Hebrew first. Right-to-left is the reading direction of the product, not a mirroring applied
afterwards. Numerals, course codes, grades and Latin-script institution names appear inside Hebrew
sentences constantly, and handling that mix gracefully is a core requirement rather than an edge case.

**Accessibility is an obligation.** This is a public institution serving the public, including staff
who use the internal tools as a condition of employment. Accessibility applies to both surfaces.
See `Q-03`.

**The certificate carries the whole outcome.** There is no downstream system that receives the
decision. What the student can prove, they can prove because they are holding the document. This makes
the certificate's design a first-order product concern rather than a formatting exercise — see §12.2.

**There is no calendar pressure, which removes a crutch.** Applications are accepted at any time; there
is no deadline creating urgency and no window whose closing forces a decision. Nothing external tells a
student when to expect an answer, so **the product must say so itself, and then keep its word**. See
`R-05` and `M-02`.

**A meaningful share of applicants are not yet students.** Career-changers and second-degree candidates
are the population this process serves. Many are deciding whether to enrol at all, and the exemption
answer is an input to that decision. The product cannot assume its user has an institutional identity,
a student number, or any prior relationship with the college. See `R-07`.

---

# §2 — Domain vocabulary

## 2.1 Terms as users say them

| Hebrew | English | What it means to a user | What it is not |
|---|---|---|---|
| פטור | Exemption | The student does not have to take a required course. The requirement is satisfied. | Not a grade, and not credit awarded — the requirement is removed, nothing is added |
| בקשה | Application | Everything a student submits about one programme: their prior study, their certificates, their evidence | Not a single question about a single course |
| תואר / תוכנית לימודים | Programme | The degree the student is applying to or enrolled in, with its own list of requirements | Not a department or a faculty |
| קורס נדרש | Requirement | One course this programme obliges its students to complete | Not a recommendation or an elective preference |
| לימודים קודמים | Prior study | A course the student has already completed somewhere, with a grade and an institution | Not necessarily at another university — professional training counts |
| התאמה אפשרית | Suggestion | A proposed pairing: *this* prior course may satisfy *that* requirement | Not a decision, and never presented to the student |
| החלטה | Decision | A person granting or refusing one suggestion | Not automatic, ever |
| אישור הבקשה | Confirmation | A reviewer declaring the whole application finished, which produces the certificate | Not the same as granting an individual exemption |
| דחיית הבקשה | Declining | Ending the whole application without exemptions, with a written reason | Not the same as refusing one suggestion |
| פתיחה מחדש | Reopening | An administrator undoing finality to correct something | Not something a student can request through the product |
| אישור פטור | Certificate | The document naming exactly which requirements were waived | Not a transcript, and not proof of credit |
| הערכה מקדימה | Preliminary estimate | A non-binding indication given before enrolment | **Not** an exemption, and it grants nothing |

**SMKB** is used throughout without expansion. It is how the institution refers to itself.

## 2.2 Words we use, and words we do not

**In front of a student, never:** *score*, *confidence*, *percentage*, *algorithm*, *model*, *rule*,
*match strength*, *queue*, *ticket*. A student is told outcomes and reasons. See `R-03`.

**In front of a reviewer, freely:** *suggestion*, *confidence*, *rule*, *near-miss*. These are the
instruments of their work and hiding them would make the work opaque.

**In this document, never:** the name of any product, vendor, framework or service; anything describing
storage, transport or deployment; any identifier that exists for a machine rather than a person.

One nuance, because the ban is easy to over-apply: **"record" is permitted in its ordinary
institutional sense** — a student's academic record, a record of a decision, a record kept for audit.
What is banned is data-model vocabulary: *row*, *table*, *field*, *entity*, *schema*.

---

# §3 — User personas

Nine fixed fields each, always in the same order.

## P-1 — Ronit, the career-changer

**In one sentence:** forty-three, fifteen years in another profession, returning for a teaching
qualification, and quietly certain that she should not have to redo statistics.

**Who she is:** holds a completed bachelor's degree from over a decade ago in an unrelated field, plus
professional training accumulated since. Working, often with children at home. Studying is a
significant financial and personal commitment she has thought hard about.

**Comfort with software:** competent but not fluent. Uses her phone for most things. Will not create an
account with a password she has to remember, and will abandon a process that demands one.

**How often, and at what pace:** once. Possibly twice if she applies to a second programme. She will
use this product for a few hours across a few weeks and then never again.

**What she is trying to achieve:** to not repeat work she has already done, and to know how much of the
degree actually stands in front of her before she commits.

**How it feels, and what she fears:** exposed. Submitting her academic history to strangers who will
judge whether it was good enough. Her real fear is not rejection — it is *silence*: submitting and then
hearing nothing, with no way to tell whether it is being looked at or was lost.

**What she will not tolerate:** being asked for the same information twice. Being told a decision
without being told why. Discovering a rule after it has already disqualified her.

**Pain this product removes:** the previous answer to her question was "email the department and wait".

**How she'd describe it:**
> "שלחתי את הגיליון ציונים שלי וקיבלתי תשובה ברורה — מאילו קורסים אני פטורה ומאילו לא."
> *("I sent my transcript and got a clear answer — which courses I'm exempt from and which I'm not.")*

## P-2 — Amir, the prospective enquirer

**In one sentence:** thirty-one, seriously considering SMKB but not committed, and the size of the
exemption is a material input to whether he applies at all.

**Who he is:** has a prior degree and several years of relevant work. Comparing two or three
institutions. Not in any system anywhere at SMKB — no student number, no account, no file.

**Comfort with software:** high. Will evaluate the product's competence as a proxy for the
institution's.

**How often, and at what pace:** a single burst of thirty minutes, then months of nothing, then either
enrolment or silence.

**What he is trying to achieve:** a credible answer to "how much of this degree would I actually have
to do?" — before paying anything.

**How it feels, and what he fears:** transactional and slightly sceptical. He fears being given an
encouraging number that quietly evaporates once he has paid, and he will read any estimate with that
suspicion.

**What he will not tolerate:** an estimate that is hedged into meaninglessness. Having to re-enter
everything after enrolling.

**Pain this product removes:** the choice between committing blind and not committing.

**How he'd describe it:**
> "קיבלתי הערכה מקדימה לפני שנרשמתי — לא הבטחה, אבל מספיק כדי להחליט."
> *("I got a preliminary estimate before I enrolled — not a promise, but enough to decide.")*

## P-3 — Dana, the transferring undergraduate

**In one sentence:** twenty-two, moving from another institution mid-degree, with the largest volume of
prior study and the most items to decide.

**Who she is:** two years of coursework at a comparable institution, recent, well documented,
straightforwardly relevant. Her application will generate more suggestions than anyone else's.

**Comfort with software:** native. Fast, impatient, mobile-first.

**How often, and at what pace:** once, quickly, probably in a single sitting on a phone.

**What she is trying to achieve:** to transfer without losing a year.

**How it feels, and what she fears:** urgent. Her fear is arbitrary partial loss — that eleven of her
fourteen courses transfer and the three that do not will turn out to be the ones that matter.

**What she will not tolerate:** slow data entry. Typing thirty courses into a form one at a time is the
single most likely reason she abandons.

**Pain this product removes:** the uncertainty that makes transferring feel like gambling.

**How she'd describe it:**
> "העברתי כמעט שנתיים של קורסים בלי לאבד סמסטר."
> *("I transferred nearly two years of courses without losing a semester.")*

## P-4 — Yossi, the reviewer

**In one sentence:** academic staff who reviews exemption applications as one duty among several, and
whose scarcest resource is uninterrupted attention.

**Who he is:** deep knowledge of his programme's curriculum. Knows without looking which requirements
are commonly satisfied elsewhere and which almost never are. Reviewing is not his main job.

**Comfort with software:** pragmatic. Wants keyboard efficiency and no ceremony. Will not learn a tool
he uses in bursts.

**How often, and at what pace:** in sittings. Sits down, works through several applications, leaves.
May be interrupted mid-application and not return for a day.

**What he is trying to achieve:** to make correct, defensible decisions quickly, and to not be the
bottleneck.

**How it feels, and what he fears:** conscientious under time pressure. He fears two things
specifically: **granting something he should not have**, discovered later; and **deciding the same case
twice** because he could not tell where he left off.

**What he will not tolerate:** deciding without the evidence on screen. Losing his place. Being unable
to change a decision he has just realised was wrong.

**Pain this product removes:** the comparison work, and the fear of having missed something.

**How he'd describe it:**
> "אני רואה את גיליון הציונים ואת ההצעה זה לצד זה, ומחליט. זה לוקח דקות, לא שעות."
> *("I see the transcript and the suggestion side by side, and decide. It takes minutes, not hours.")*

## P-5 — Michal, the administrator

**In one sentence:** owns the rules that generate suggestions and is the only person who can undo
finality — low frequency, high consequence.

**Who she is:** administrative or academic-administrative staff with authority over how the process
runs. Understands the curriculum structurally rather than course by course.

**Comfort with software:** confident. Comfortable with abstraction, but not a technical specialist —
she thinks in terms of "this requirement is usually satisfied by X", not in terms of weights.

**How often, and at what pace:** rarely, deliberately. Adjusts rules a few times a term. Reopens a
finalised application perhaps monthly.

**What she is trying to achieve:** to encode institutional knowledge so reviewers do not each carry it
in their heads, and to correct mistakes without destroying the record of them.

**How it feels, and what she fears:** cautious. She fears changing a rule and not knowing what it did —
a change that quietly makes suggestions worse across every future application, discovered months later.

**What she will not tolerate:** a change taking effect before she can see its consequence. Any
irreversible action without a confirmation naming exactly what is about to happen.

**Pain this product removes:** having no mechanism at all for institutional knowledge except telling
people.

**How she'd describe it:**
> "אני יכולה לראות מה השינוי עושה לפני שהוא נכנס לתוקף."
> *("I can see what the change does before it takes effect.")*

## P-6 — Three people the product must not forget

**The programme chair**, asked by a student "why was I denied?", who was not the reviewer and has no
access to the tool. Whatever the product tells the student must be complete enough to be re-read by
someone else and still make sense — because it will be forwarded.

**The support desk**, receiving a reply to an automated message. Every message this product sends is a
potential inbound conversation, and the person receiving it needs enough context in the original to
respond without an investigation.

**The auditor**, reading a case a year later with no memory of it. They need the decision, the person,
the date, the reason, and the evidence it rested on — reconstructable without asking anyone.
---

# §4 — Business rules as users experience them

Nine rules. Each is written as the promise the product makes, not as the logic that keeps it.

## R-01 — What an exemption is, and what it is not

**The promise:** if a requirement is exempted, you do not take that course, and nothing further is
asked of you about it.

**What the user sees:** a list of requirement names, each either waived or not, with the prior study it
was waived against.

**Why it is this way:** an exemption removes an obligation. It does not add credit, does not carry a
grade, and does not shorten the degree's total credit count on its own. Students routinely assume
otherwise, and the product must not let that assumption form. The words on screen say *removed from
your requirements*, never *credited*.

**Where it shows up:** `S-P-08`, `S-P-10`, the certificate (§12.2), `M-03`.

**What it deliberately does not do:** it does not tell the student what to register for instead, and it
does not calculate how much of the degree remains. Those are the academic advisor's job, and a wrong
number here would be believed.

## R-02 — How matches are proposed

**The promise:** you list what you have studied; the product finds the requirements it might satisfy.
You are never asked to guess which of your courses matches which requirement.

**What the user sees:** *a student sees nothing of this at all.* A reviewer sees, per requirement, the
prior study proposed against it, ordered by how strongly it was matched, each carrying a short
explanation of what drove the match — subject similarity, the institution, the grade, how recently it
was taken, or an institutional rule that applies.

**Why it is this way:** the comparison is mechanical and voluminous; the judgement is not. Separating
them is the entire point. The explanation exists because a reviewer who cannot see why something was
proposed cannot calibrate their trust in the proposal, and will either rubber-stamp or ignore it.

**Where it shows up:** `S-R-02`, `S-R-03`.

**What it deliberately does not do:** it does not decide. It does not rank *students*. It does not
learn from a single reviewer's habits in a way that would make two reviewers see different suggestions.

## R-03 — What is shown, what is hidden, what is ranked

**The promise (to a reviewer):** you will not be shown noise. What you are shown is worth your
attention. Anything borderline is one deliberate click away and clearly labelled as borderline.

**What the user sees:** a reviewer sees strong candidates directly. Weaker candidates are collected
behind a single control that states how many there are — expanding it shows all of them, never a
sample. Genuinely implausible pairings are never generated at all.

**Why it is this way:** a shortlist that includes everything is not a shortlist. But a shortlist that
silently discards a valid match is worse than no shortlist, because the reviewer cannot know what they
did not see. Two thresholds resolve this: below the lower one, nothing is kept; between the two, it is
kept but folded away; above the upper one, it is shown.

**Where it shows up:** `S-R-02`, `S-R-03`.

**What it deliberately does not do:** the folded-away set is never surfaced to the student, never
counted in anything the student sees, and never described to them.

> **OPEN QUESTION Q-14 —** Does SMKB apply eligibility floors — a maximum age for prior study, a
> minimum grade, a requirement that the prior institution be accredited?
> **Blocks:** whether `S-P-04` must state entry conditions before a student invests effort.
> **This document assumes:** no floors. If any exist they belong on the entry screen, stated before the
> student begins — never discovered in a rejection reason.
> **Who decides:** the academic office.

## R-04 — Who decides

**The promise:** a person decides every exemption. No requirement is ever waived by the product alone.

**What the user sees:** nothing granted without a named member of staff having granted it, on a date,
in a record that survives.

**Why it is this way:** an exemption is an academic judgement the institution is accountable for. Some
matches are so certain that a human decision looks like ceremony — a recognised professional
certificate the college has already mapped to specific requirements, or a requirement that functions as
a generic slot. Those are presented with maximum confidence *and still decided by a person*, because
the alternative is a class of granted exemptions with nobody's name on them.

**The condition under which this could change:** if the institution ever accepts automatic granting, it
should be scoped to pre-mapped certificates only, be visibly labelled as automatic wherever it appears,
and remain individually reversible. It should not be introduced as a confidence threshold — "above 95%,
grant automatically" — because that converts a calibration parameter into a delegation of academic
authority, and the two are not the same kind of thing.

**Where it shows up:** `S-R-02`, `S-R-03`, `S-R-04`, and negatively in the absence of any bulk control.

**What it deliberately does not do:** there is no "grant all remaining" control, and no keyboard
shortcut that decides more than one item. Efficiency comes from moving between items quickly, never
from acting on them together. A control that decided ten items at once would make this rule a fiction
while appearing to honour it.

> **BY DESIGN —** There is no bulk grant or deny. Reviewers get sorting, filtering, grouping, and
> keyboard-driven sequential decisioning instead. This delivers most of the speed of bulk action while
> keeping every decision an individual act with an individual owner.

## R-05 — Completeness, timing and finality

**The promise:** an application is either fully decided or not finished. And you will be told when to
expect an answer.

**What the user sees:** a reviewer cannot finalise while any suggestion is undecided; the control says
how many remain. A student is told at submission that a decision takes **up to ten working days**, and
is told again if that is missed.

**Why it is this way:** a half-decided application produces a certificate that is silently incomplete —
the student cannot tell whether a requirement was refused or simply never looked at. Since nothing
external sets a deadline, an unstated turnaround is not an absent expectation; the student invents one,
and it is always worse than the truth.

**Where it shows up:** `S-R-04`, `S-P-08`, `S-P-09`, `M-02`, `M-08`.

**What it deliberately does not do:** the ten days are not a countdown shown ticking to the student.
They are stated once at submission, restated on the status screen as a date, and apologised for if
missed. A live timer would make waiting worse.

## R-06 — Reopening and correcting

**The promise:** a decision can be corrected, and correcting it never erases what was there before.

**What the user sees:** while a case is open, its reviewer can undo one decision and decide it again —
an ordinary self-correction. Once finalised, only an administrator can reopen it, must state why, and
that reopening is itself recorded. If reopening leads to a new certificate, the previous one is
superseded and marked as such, never deleted.

**Why it is this way:** the two actions are different in kind. Undoing your own decision seconds after
making it is a misclick. Reopening a finalised case is an institutional act with consequences for
someone who has already been told an answer.

**Where it shows up:** `S-R-02`, `S-A-04`, `M-06`, §12.2.

**What it deliberately does not do:** a student cannot request reopening through the product. The route
is a conversation — see `S-P-11`.

## R-07 — Estimates before enrolment

**The promise:** you can find out what you would likely be exempt from before you commit to anything.
It is an estimate, it is honest about being one, and the work you do is not wasted.

**What the user sees:** someone who is not enrolled submits exactly as anyone else does, and receives a
**preliminary estimate** — clearly labelled, granting nothing, producing no certificate. The
application and its evidence persist. On enrolment it **automatically becomes a formal application**
and enters the normal queue; the student is told this happened (`M-09`). A reviewer sees the estimate
and its history as context, and **decides fresh** — they may approve on the same evidence, or ask for
more.

**Why it is this way:** the exemption answer materially changes whether and where someone enrols, so
withholding it until after enrolment inverts the sequence. But a binding grant to a non-student commits
the institution to someone it has no relationship with. Separating *estimate* from *grant* gives the
student the answer they need to decide, and gives the institution a decision point that only arrives
once the person is actually a student.

**Where it shows up:** `S-P-12`, `J-PRO-01`, `M-09`, `S-R-02`.

**What it deliberately does not do:** an estimate never produces a certificate, is never described as
an exemption, and the Hebrew term for exemption (§2.1) is never applied to it. The reviewer is not bound by it
and the screen tells them so.

## R-08 — Correcting evidence, and withdrawing

**The promise:** you can always add. You can withdraw while nobody has started work. Once someone has
picked up your application, it is theirs to finish.

**What the user sees:**

| Situation | Add a document | Withdraw |
|---|---|---|
| Draft, not submitted | yes | not applicable — delete the draft |
| Submitted, not yet assigned | yes | **yes** |
| Assigned to a reviewer | yes | no |
| Finalised or declined | yes | no |

Documents are never replaced or removed. A student who uploaded the wrong file adds the right one; both
remain.

**Why it is this way:** evidence a decision was made against must remain inspectable, or the decision
becomes unauditable — so nothing is ever swapped out from underneath a decision. But append-only
evidence alone creates a trap: a student who uploads the wrong transcript has no recovery. Withdrawal
before assignment is the release valve, and it costs nothing, because no one has spent time yet.

**Where it shows up:** `S-P-07`, `S-P-09`, `M-10`.

**What it deliberately does not do:** adding a document after a decision does not reopen anything
automatically. It flags the application for the reviewer's attention and leaves the judgement to them.

How long added evidence is then kept is a retention question, specified in §12.3 (`Q-04`).

## R-09 — One application per programme

**The promise:** one live application per programme, as many programmes as you like.

**What the user sees:** starting an application for a programme you already have one for returns you to
it — the product says so plainly rather than silently creating a second. Applications for different
programmes run independently and are listed separately.

**Why it is this way:** two live applications for the same programme are two answers to one question. But
the same prior course can legitimately satisfy one programme's requirement and not another's, so the
programmes must not be collapsed.

**Where it shows up:** `S-P-03`, `S-P-04`, `S-R-02`.

**What it deliberately does not do:** exemptions granted for one programme are **never carried across**
to another. A reviewer sees them as context — useful, and explicitly labelled as another programme's
decision — and judges the new application on its own terms.

---

# §5 — Voice, tone and content principles

## 5.1 The voice

Formal, warm, and direct — a competent administrative office, not a consumer app and not a form. It
uses complete sentences. It does not exclaim, congratulate, or apologise for existing. It never uses
humour, because a person reading a rejection is not in the mood for it and the same voice writes both.

| Do | Don't |
|---|---|
| "בקשתך נבדקה ואושרה." *(Your application has been reviewed and approved.)* | "מזל טוב! 🎉 קיבלת פטור!" *(Congratulations! You got an exemption!)* |
| "לא ניתן להגיש בקשה ללא קורס אחד לפחות." *(An application cannot be submitted without at least one course.)* | "אופס! משהו חסר." *(Oops! Something's missing.)* |
| "התשובה תישלח בתוך עשרה ימי עבודה." *(A response will be sent within ten working days.)* | "נחזור אליך בקרוב." *(We'll get back to you soon.)* |

## 5.2 Gender-inclusive forms

Hebrew forces a gender choice on almost every verb and adjective. The product does not guess. It uses
the slash form consistently rather than occasionally:

> סטודנט/ית · בחר/י · נרשמת/ה
> *(student · choose · you registered)*

Where a sentence collapses under three or more slashes and becomes unreadable, rewrite it rather than
accepting either the clutter or a gendered default. Impersonal and infinitive constructions usually
solve it: **"יש לבחור תואר"** *(a degree must be selected)* rather than **"בחר/י תואר שאליו הגשת/ה מועמדות"**.

Names of people are never inflected. Where the product addresses a specific named person it uses the
name.

## 5.3 Delivering bad news

The pattern, in order, without exception:

1. **State it in the first sentence.** No preamble, no cushioning clause. A student scanning for the
   answer must find it immediately.
2. **Give the reason, if there is one.** In words, complete enough to be forwarded to someone who was
   not there.
3. **Give exactly one next step.** Not a list of options — one route, named, with a way to take it.
4. **Invite a reply from a person.** Every terminal message ends by making a human reachable. Never a
   form, never a reference number.

What this rules out: burying a refusal in a paragraph; "unfortunately"; offering a next step the
product cannot actually deliver; and the false kindness of vagueness.

## 5.4 Error messages

**Never assign blame.** "הקובץ גדול מ-4 מגה-בייט" *(the file is larger than 4 MB)* — not "העלית קובץ
גדול מדי" *(you uploaded a file that is too large)*.

**Never expose internals.** A student never sees a code, an identifier, or the name of anything
internal. If support needs to correlate, the correlation happens on the support side.

**Always name the recovery.** An error that says only what went wrong is half an error message.

**Distinguish "nothing here" from "we could not load this."** These look identical and mean opposite
things. An empty result and a failure to fetch must never share a screen state — a student told "no
suggestions were found" when the truth is "we could not check" has been actively misled.

## 5.5 Empty states

An empty state is an invitation, not a report of absence. It says what would be here, why it is not,
and what to do — and it never uses an illustration to fill space where a sentence would do the work.

---

# §6 — Ideal user journeys

Each step names a screen and a consequence. Composition of screens lives in §10 and §11; message
contents live in §7. A journey says only what moves and what changes.

## J-STU-01 — First application, from nothing to certificate

**Persona:** `P-1`, `P-3` · **Entry:** a link from the college site, a link in an admissions message, or
a direct return visit.

1. She reaches sign-in (`S-P-01`), enters her email address → a code is sent (`M-01`).
2. She enters the code (`S-P-02`) → she is in. No password was created and none is remembered.
3. The dashboard (`S-P-03`) is empty and says so → the only action offered is to start.
4. She picks a programme (`S-P-04`) → an application is opened. If one already existed for that
   programme she is returned to it and told so (`R-09`).
5. She lists prior study (`S-P-05`), one course at a time → each is saved as she enters it. There is no
   save button and nothing to lose by leaving.
6. She adds a professional certificate (`S-P-06`) → recorded separately from coursework, because it is a
   different kind of claim.
7. She attaches her transcript (`S-P-07`) → the screen tells her, before she needs to know, that files
   can be added but not replaced, and that clear filenames matter (`R-08`).
8. She reviews everything (`S-P-08`) → she is told the ten-working-day expectation *before* submitting,
   not after. She submits.
9. `M-02` arrives within minutes, restating the expectation and the date.
10. The status screen (`S-P-09`) shows her application as awaiting a reviewer, and offers withdrawal.
11. A reviewer takes the case → the status becomes *in review* and the withdrawal option disappears
    (`R-08`, and see the design note on `S-P-09`).
12. The reviewer finalises (`J-REV-01`) → `M-03` arrives once the certificate exists, never before.
13. She opens the outcome (`S-P-10`), reads which requirements were waived and which were not, and
    downloads the certificate.

**Where it can go differently**

| Fork | Outcome | Specified in |
|---|---|---|
| She leaves mid-way | Draft persists indefinitely | `J-STU-02` |
| Some requirements refused | Same screen, mixed result | `J-STU-03` |
| Nothing matched | Application still decided, certificate lists nothing | `J-STU-04` |
| She changes her mind before assignment | Withdrawn | `J-STU-05` |
| Whole application declined | `M-04` arrives; reason and a contact route | `S-P-11` |

**Where it ends badly:** she submits and hears nothing. The product's defence is `M-02` setting an
expectation, `S-P-09` restating it as a date, and `M-08` apologising *before she has to ask*. Silence
is the failure mode this journey is designed against.

## J-STU-02 — Interrupted, and resumed

1. She adds four courses (`S-P-05`) and closes the browser mid-entry → everything entered is already
   saved.
2. Days later she returns to sign-in (`S-P-01`) → a new code, a new session.
3. The dashboard (`S-P-03`) shows the unfinished application and where it stopped → one action:
   continue.
4. She resumes exactly where she left off, with nothing re-entered.

**Where it can go differently:** her session ends while she is typing. She lands on `S-P-14`, which
says the session ended and offers to sign in again — and returns her to the same step, not to the
dashboard. Being dropped at the dashboard after re-authenticating is the difference between an
interruption and a punishment.

**Where it ends badly:** she does not return. The draft persists. See `Q-04` for how long, and note that
whatever the answer, the product warns before destroying anything.

## J-STU-03 — Mixed outcome

1. `M-03` arrives → its subject says the application was decided, not that it was approved, because it
   was partly neither.
2. She opens the outcome (`S-P-10`) → granted requirements are listed first and clearly; refused ones
   follow, each with the reviewer's reason.
3. She downloads a certificate naming **only** what was granted.
4. For a refusal she disputes, the screen offers a contact route — a person, not a form.

**Where it ends badly:** she reads the refusals as arbitrary. The defence is `R-02`'s requirement that
every refusal carries a reason written for her, and `R-03`'s rule that she is never shown a number to
argue with.

## J-STU-04 — Nothing matched, or the wrong documents

1. She submits (`S-P-08`) with prior study that turns out to satisfy nothing.
2. `M-02` arrives as normal — the application is real and is being handled.
3. A reviewer finalises with no grants → `M-03` says so plainly.
4. The outcome (`S-P-10`) explains that no requirements were waived, and why, and what she can do.

**Where it can go differently:** she realises at step 2 that she attached the wrong transcript. If
nobody has taken the case she withdraws, fixes, resubmits (`J-STU-05`). If someone has, she adds the
correct document, which flags the case for the reviewer (`R-08`).

**Where it ends badly:** she is left believing the effort was pointless. The outcome screen's job here
is to be explicit that a nil result is a real answer, not a failure to process — and to say what would
have to be different.

## J-STU-05 — Withdrawal before assignment

1. Status (`S-P-09`) shows the application awaiting a reviewer, with withdrawal available.
2. She withdraws → confirmed with an explicit warning that it cannot be undone and that a new
   application starts from scratch.
3. `M-10` confirms it.
4. The dashboard (`S-P-03`) shows it as withdrawn — visible, not erased.
5. She may start a fresh application for the same programme immediately (`R-09`).

**Where it ends badly:** she withdraws expecting to edit and resubmit, and discovers she must re-enter
everything. The confirmation must say this in advance, in those words.

## J-PRO-01 — Estimate, then enrolment

The longest-lived journey here. It spans months and survives a change in who the person is.

1. `P-2` reaches sign-in (`S-P-01`) with no institutional identity → email and a code are enough.
2. He chooses a programme he is *considering* (`S-P-04`) → the screen states that what he will receive is
   a preliminary estimate, before he invests any effort (`R-07`).
3. He enters prior study and evidence (`S-P-05`–`S-P-07`) exactly as an enrolled student would.
4. He submits (`S-P-08`) → the confirmation names it an estimate, not an application.
5. `M-05` tells him the estimate is ready → he opens it (`S-P-12`), labelled provisional throughout,
   granting nothing, with no certificate anywhere on the screen.
6. **Months pass.** He enrols.
7. The estimate automatically becomes a formal application and joins the queue → `M-09` tells him,
   unprompted. This is the only message he did not initiate.
8. A reviewer opens it (`S-R-02`) and sees the estimate and its history as context, marked as
   non-binding → decides fresh.
9. From here the journey is `J-STU-01` from step 12.

**Where it can go differently**

| Fork | Outcome |
|---|---|
| He never enrols | The estimate stays an estimate. Nothing is granted, no certificate exists. Retention per `Q-04` |
| He enrols in a *different* programme | The estimate does not transfer. He applies afresh; the prior estimate appears as context only (`R-09`) |
| His evidence has aged or changed | The reviewer asks for more — the estimate never obliged them to accept it |

**Where it ends badly:** he reads the estimate as a promise and feels deceived when the formal decision
differs. Every defence against this is on `S-P-12`: the label, the wording, the absence of a
certificate, and an explicit sentence saying a reviewer will decide again after enrolment.

## J-REV-01 — Reviewing a case

1. `P-4` opens the queue (`S-R-01`), prompted by the daily digest (`M-07`) rather than by a per-application
   alert → sees what is waiting and, prominently, what has been waiting longest (`Q-11`).
2. He takes a case → it is his; no one else can decide it. If he abandons it, it returns to the queue.
3. The workspace (`S-R-02`) opens with **the student's evidence beside the suggestions**, not behind a
   tab. If this is a converted estimate, the prior estimate is shown as context.
4. He works down the suggestions, deciding each (`S-R-03`) → each decision is individual; there is no
   control that decides several (`R-04`).
5. He expands the folded near-misses for one requirement, finds a valid match that fell below the line,
   and grants it (`R-03`).
6. He misclicks and immediately undoes that decision (`R-06`) → an ordinary correction, his to make.
7. He is interrupted and leaves → the case stays his, and the queue shows where he stopped.
8. Returning, he finishes the last item → finalisation (`S-R-04`) unlocks only now, and says so while
   locked.
9. He confirms → the certificate is produced, then `M-03` is sent. In that order, so the link works.

**Where it can go differently:** the application should not proceed at all — wrong programme, unusable
evidence, an ineligible applicant. He declines the whole application (`S-R-05`) with a mandatory reason
he is told will be shown to the student verbatim; `M-04` carries that reason to them unchanged.

**Where it ends badly:** he decides without reading the evidence. The workspace's layout is the entire
defence, which is why `S-R-02` specifies evidence placement as a requirement rather than a preference.

## J-ADM-01 — Defining a programme's requirements

1. `P-5` opens programmes (`S-A-01`) → picks one, sees its requirements.
2. She adds a requirement → it applies to applications submitted from now on. Applications already in
   flight are not retroactively changed, and the screen says so.

## J-ADM-02 — Changing how matches are proposed

1. She opens matching rules (`S-A-02`) → each rule is stated in plain language, per programme.
2. She edits one → **before it takes effect**, she sees what it would have done to recent applications.
   Her stated fear (`P-5`) is a silent change; this is the answer to it.
3. She activates the revised set (`S-A-03`) → the change applies going forward. Applications already
   scored keep the suggestions they were given, and the screen says which set produced them.

## J-ADM-03 — Reopening a finalised case

1. A student disputes a decision by email. Michal opens the case and reopens it (`S-A-04`) → a reason is
   required.
2. The application returns to the queue. `M-06` tells the student, because a decision they were given
   has been withdrawn and they must not learn that from silence.
3. On re-finalisation a new certificate supersedes the old one; the old one is marked superseded and
   kept.
---

# §7 — Message catalogue

Every automated message the product sends. Nothing here is final copy; each entry states required
substance, and the wording obeys §5 without restating it.

## 7.0 Rules for every message

**Sender identity.** Messages come from a named institutional address that accepts replies. There is no
no-reply address anywhere in this product. A message a person cannot answer is a message that generates
a phone call.

**Subject lines** name the thing and its state:

> בקשת פטור — התקבלה החלטה
> *(Exemption application — a decision has been made)*

They never say merely "update":

> עדכון
> *(update)*

which tells the reader nothing and forces them to open it to find out whether it matters.

**One action per message.** Every message has at most one thing it wants the reader to do, and that
action appears once.

**Plain-text parity.** Every message must be fully comprehensible with no styling, images or layout.
The Hebrew must read correctly right-to-left in a plain-text client.

**Never contains:** a score, a percentage, an internal identifier, a reference number, the name of any
system, or an instruction to not reply.

**Timing.** Messages caused by a person's action arrive within minutes. Messages caused by the passage
of time arrive during working hours — never at 03:00, which reads as automated indifference.

## M-01 — Your sign-in code

**Goes to:** anyone signing in · **Because:** they asked for a code · **Arrives:** within a minute

**It exists to:** let someone in without a password, and to be useless to anyone who intercepts it late.

**Subject:** קוד כניסה לבקשות פטור *(Sign-in code for exemption applications)*

**In substance:** the code, prominent and separable; how long it lasts; one sentence saying that if they
did not request it, no action is needed and nothing has happened.

**The one thing it lets you do:** sign in.

**Tone notes:** this message is **in Hebrew**, like everything else. It is the first thing a new user
ever receives from the institution and an English message here reads as a system talking rather than a
college.

**If they do nothing:** the code expires. Nothing else happens.

**Referenced by:** `J-STU-01` step 1, `J-STU-02` step 2, `J-PRO-01` step 1.

## M-02 — We have your application

**Goes to:** the student · **Because:** they submitted · **Arrives:** within minutes

**It exists to:** be the entire basis of the student's patience. With no deadline structure anywhere in
this process, this message is where the institution states its obligation.

**Subject:** בקשת הפטור שלך התקבלה *(Your exemption application has been received)*

**In substance:** confirmation it arrived; which programme; how many courses and certificates were
included, so they can spot an omission now; **the ten-working-day expectation as an actual date**; that
they need do nothing; how to reach a person.

**Must appear verbatim in effect:** the date. "בתוך עשרה ימי עבודה" *(within ten working days)* is
weaker than a date, because the reader must otherwise compute it and will compute it wrong.

**The one thing it lets you do:** nothing. That is the message.

**If they do nothing:** the expected behaviour.

**Referenced by:** `J-STU-01` step 9, `J-STU-04` step 2.

## M-03 — A decision has been made

**Goes to:** the student · **Because:** a reviewer finalised the application · **Arrives:** after the
certificate exists, never before

**It exists to:** deliver the outcome and a working link to the proof.

**Subject:** בקשת הפטור שלך — התקבלה החלטה *(Your exemption application — a decision has been made)*

**In substance:** that it was reviewed and decided; how many requirements were waived; that the full
list and the certificate are in the portal; a direct link; an invitation to reply with questions.

**Tone notes:** the subject says *decided*, not *approved*, because the same message carries a mixed
result where some requirements were refused. Announcing approval to someone who was half-refused is a
small cruelty. The body leads with what was granted.

**Sequencing is load-bearing:** this message is sent only once the certificate exists. A link that
resolves to nothing, in the message that matters most, is the worst possible failure.

**If they do nothing:** the outcome remains available indefinitely, subject to `Q-04`.

**Referenced by:** `J-STU-01` step 12, `J-STU-03` step 1, `J-STU-04` step 3.

## M-04 — Your application was not approved

**Goes to:** the student · **Because:** a reviewer declined the whole application · **Arrives:** within
minutes

**It exists to:** deliver a refusal in a way that survives being forwarded to a third party who was not
there.

**Subject:** בקשת הפטור שלך — לא אושרה *(Your exemption application — not approved)*

**In substance:** that it was reviewed and not approved, in the first sentence; **the reviewer's reason,
quoted exactly as written**, visually set apart as their words; that a person will answer questions,
with the way to reach them.

**Must appear verbatim:** the reviewer's reason. Not summarised, not reformatted, not truncated. The
same text the student sees on `S-P-11` — one source, so the two can never disagree.

**The one thing it lets you do:** reply to a person.

**Tone notes:** no "unfortunately". No apology for the decision — an apology implies the decision was
regrettable rather than correct. Warmth here comes from the reply invitation, not from softened
language.

> **BY DESIGN —** There is no "apply again" or "appeal" control anywhere in this message or on
> `S-P-11`. Offering a retry would suggest the product can revisit a decision it cannot. The sanctioned
> route is a conversation with a person, who can escalate through the institution's own academic
> process if warranted.

**If they do nothing:** nothing further happens.

**Referenced by:** `J-STU-01` fork table, `J-REV-01` "where it can go differently".

## M-05 — Your preliminary estimate is ready

**Goes to:** a prospective applicant · **Because:** their estimate was completed · **Arrives:** per the
same expectation as a formal application

**It exists to:** deliver an answer that is useful for deciding, while being unmistakably not a grant.

**Subject:** הערכה מקדימה לפטור מקורסים — מוכנה *(Preliminary course exemption estimate — ready)*

**In substance:** that the estimate is ready and where to see it; that it is an estimate and grants
nothing; that if they enrol it becomes a formal application automatically and their evidence carries
over; a link; a reply invitation.

**Must appear verbatim in effect:** a sentence stating that a reviewer will decide again after
enrolment and is not bound by the estimate.

**Tone notes:** the hardest message in this document. It must be useful enough to act on and honest
enough not to mislead. It never applies the Hebrew term for exemption (§2.1) to the estimate's contents.

**If they do nothing:** the estimate persists. Nothing expires without warning.

**Referenced by:** `J-PRO-01` step 5.

## M-06 — Your application has been reopened

**Goes to:** the student · **Because:** an administrator reopened a finalised application ·
**Arrives:** within minutes

**It exists to:** ensure a person whose answer has been withdrawn learns it from the institution rather
than by noticing.

**Subject:** בקשת הפטור שלך נפתחה מחדש לבדיקה *(Your exemption application has been reopened for review)*

**In substance:** that a decision they were given is being looked at again; that any certificate they
hold is no longer current; the reason, in the administrator's words; when to expect a new answer; a
reply invitation.

**Tone notes:** this message tells someone that something they were told is no longer true. It must not
be breezy, and it must not be alarming — it states the fact, the reason and the timeline.

**Referenced by:** `J-ADM-03` step 2.

## M-07 — Applications are waiting

**Goes to:** reviewers · **Because:** the queue is not empty · **Arrives:** once daily, working hours

**It exists to:** make sure a pull-based queue is actually pulled from.

**Subject:** בקשות פטור ממתינות לבדיקה *(Exemption applications awaiting review)*

**In substance:** how many are waiting; how long the oldest has waited; how many have passed ten working
days; a link to the queue.

**Tone notes:** informational, not nagging. Not sent when the queue is empty — a daily message saying
"nothing to do" trains people to ignore the message that matters.

> **OPEN QUESTION Q-11 —** Should a new application notify reviewers individually rather than appearing
> in a daily digest?
> **Blocks:** whether `S-R-01` is a destination or an inbox.
> **This document assumes:** pull, with this digest and a visible ageing indicator. Per-application
> push creates a race between reviewers and an interruption culture for work that is not urgent by the
> hour.
> **Who decides:** whoever owns reviewer workload.

**Referenced by:** `J-REV-01` step 1.

## M-08 — We have not answered you in time

**Goes to:** the student · **Because:** ten working days passed without a decision · **Arrives:** on the
day the commitment is missed

**It exists to:** apologise before being asked. An institution that misses its own stated deadline and
says nothing has taught the student that the deadline was decorative.

**Subject:** בקשת הפטור שלך — עדיין בבדיקה *(Your exemption application — still under review)*

**In substance:** that the stated timeframe has passed; that the application is not lost and requires
nothing from them; a revised expectation if one can honestly be given; a reply invitation.

**Tone notes:** brief. A long apology is about the institution's feelings, not the student's problem.

**Referenced by:** `J-STU-01` "where it ends badly".

## M-09 — Your estimate is now a formal application

**Goes to:** a student who has just enrolled · **Because:** enrolment converted their estimate ·
**Arrives:** within a day of enrolment

**It exists to:** tell someone that something happened on their behalf.

**Subject:**
> ההערכה המקדימה שלך הפכה לבקשה רשמית
> *(Your preliminary estimate has become a formal application)*

**In substance:** that enrolment converted it automatically; that their evidence carried over and
nothing needs re-entering; that a reviewer will now decide, and **that the decision may differ from the
estimate**; the ten-working-day expectation as a date; a link.

**Tone notes:** the only message a student did not initiate, so it must establish immediately why it is
arriving. The line about the decision possibly differing is not fine print — it is the second sentence.

**Referenced by:** `J-PRO-01` step 7.

## M-10 — Your application has been withdrawn

**Goes to:** the student · **Because:** they withdrew · **Arrives:** immediately

**It exists to:** be the receipt for a destructive action the student took themselves.

**Subject:** בקשת הפטור שלך בוטלה *(Your exemption application has been withdrawn)*

**In substance:** confirmation, with the programme named; that nothing further will happen; that a new
application may be started at any time and will begin from scratch.

**Referenced by:** `J-STU-05` step 3.

## 7.8 Messages we deliberately do not send

| Not sent | Why |
|---|---|
| "A reviewer has started work on your application" | Starts a second clock the institution has not committed to, and invites "it's been three days since someone started" |
| "Your draft is still unfinished" after a few days | The student knows. Chasing someone who is gathering documents from a previous institution is unhelpful pressure |
| Any per-suggestion decision notice | A student would receive a dozen messages for one application and learn to ignore all of them |
| "Thank you for using the exemption portal" | Says nothing, costs attention |
| A survey | Not while the median user interacts with this product exactly once |

---

# §8 — Design language

## 8.0 Aesthetic direction

**Institutional, contemporary, and quiet.** The product should feel like a well-run office, not a
start-up and not a government form.

The reasoning is specific to the audience. The student using this is often anxious, frequently older
than a typical undergraduate, and making a decision with real financial weight. Playfulness reads as
not taking them seriously. But heavy institutional styling — dense forms, official-looking headers,
grey-on-grey — reads as bureaucracy, which is precisely what this product exists to replace.

The resolution is **generous space, restrained colour, and typography doing the work**. Confidence
comes from clarity rather than decoration. Nothing bounces, sparkles or celebrates. When a person is
approved, the product tells them clearly and gives them their document.

Rejected alternatives: a *warm, consumer* direction, which would trivialise a serious academic
decision; a *formal document* direction, which would make the product feel like the paperwork it
replaces.

## 8.1 Colour intent

Colour carries **meaning only**. It is never decorative, and never the sole carrier of information —
every colour-coded state also has words.

Five roles:

| Role | Means | Where |
|---|---|---|
| **Neutral** | Not yet submitted. Not an error, not a warning — simply not started | Draft states |
| **In progress** | Received, being handled, nothing required of you | Submitted, in review |
| **Resolved well** | Finished, and the outcome was favourable | Granted, confirmed |
| **Resolved badly** | Finished, and the outcome was not favourable | Refused, declined |
| **Provisional** | Real but not binding — distinct from all four above | Estimates (`R-07`) |

**These meanings are identical for students and staff.** The words differ by audience; the colours do
not. A reviewer and a student looking at the same application must never disagree about what they are
seeing.

*Provisional* is the addition this product needs and most do not: an estimate is neither in progress
nor resolved, and reusing either would misrepresent it.

**Light and dark are equals**, not a theme and a variant. Every meaning above must survive both, and
the semantic distance between *resolved well* and *resolved badly* must be legible without relying on
red/green discrimination.

## 8.2 Typography, Hebrew-first

The type system is chosen for Hebrew and must remain correct when Latin script and numerals appear
inside it — which is constantly, in course codes, grades, institution names and dates.

**Hierarchy is carried by size and weight, not by colour or case.** Hebrew has no letter case, so any
hierarchy built on capitalisation simply does not exist here.

**Numerals inside Hebrew text** must not break the reading order. Grades, credit values, dates and
counts appear mid-sentence throughout, and getting the bidirectional handling wrong produces text that
is subtly, maddeningly wrong to a native reader while looking fine to someone who does not read Hebrew.
This is a correctness requirement, not a polish item.

**Latin-script names** — foreign institutions, English course titles — appear unchanged, never
transliterated. Reading direction handles them; the product does not.

**Line length** is constrained for comfortable Hebrew reading. Reviewer-written reasons and rejection
text can run to paragraphs and must remain readable at that length.

## 8.3 Spacing and density

**Two densities, deliberately.**

The **student portal is calm**: generous spacing, one primary thing per screen, room around decisions.
Its user is anxious and unfamiliar and will use it once.

The **staff tool is dense**: more on screen, tighter rhythm, less breathing room. Its user is expert,
repeats the task, and is slowed rather than reassured by whitespace.

This does not make them different products. Type, colour meanings, iconography and interaction patterns
are shared. The density difference is a response to different users doing different work, and it should
read as the same institution speaking to two audiences.

## 8.4 Iconography

**Sparingly, and never alone.** An icon may reinforce a label; it may not replace one. This is partly
accessibility and partly that icon vocabularies are culturally learned, and this product's users span
forty years of software convention.

**Nothing irreversible is ever an icon-only control.** Withdrawing, declining, reopening and excluding
all carry words.

Status indicators pair a shape with a colour so that the five roles in §8.1 remain distinguishable
without colour discrimination.

## 8.5 Motion

**Motion communicates a state change, or it does not exist.** Permitted: something appearing or
disappearing, a step advancing, content loading. Not permitted: decoration, parallax, anything that
delays a user who knows where they are going.

Loading has two forms: **brief** (an unobtrusive indicator) and **slow** (an indicator plus words about
what is happening). The threshold matters — a spinner that runs for eight seconds with no explanation is
indistinguishable from a hang.

**Reduced-motion preferences are honoured completely**, not softened. When motion is suppressed, state
changes must still be perceivable — the product cannot rely on animation to communicate anything.

**Success is confirmed by state, not by celebration.** When an application is submitted, the screen
becomes the status screen. There is no interstitial, no animation, no congratulation.

---

# §9 — Universal screen contract

Everything true of every screen. Entries in §10 and §11 inherit all of it and state only deviations.

## 9.1 Arrival states

Every screen supports seven states. Most entries will say "as §9" for most of them.

| State | Means | Must always |
|---|---|---|
| **Loading** | Content is coming | Show something within a moment; explain itself if it exceeds a couple of seconds; never show an empty frame that looks finished |
| **Populated** | Normal | — |
| **Empty** | Loaded successfully, nothing to show | Say what would be here, why it is not, and what to do. Never look like a failure |
| **Partial** | Some content loaded, some failed | Show what succeeded, name what did not, offer to retry the missing part. Never silently show three of five items |
| **Error** | Could not load | Say so in words, never assign blame, always offer a way forward. **Never resemble the empty state** |
| **Not permitted** | Real, not yours | Say plainly that it is not available to this account. Never a blank screen or a technical refusal |
| **Stale** | Shown data may have changed underneath | Say when it was fetched and offer a refresh. Never silently update while someone is reading |

**Empty and error are the pair that matters most.** A student told "no suggestions were found" when the
truth is "we could not check" has been misinformed by their own institution. These two states must be
visually and verbally distinct on every screen without exception.

## 9.2 Validation and guardrails

**Validate on leaving a field, not on every keystroke.** Being corrected while still typing is
unpleasant and, for a slower typist, disruptive.

**Never block submission without saying what to fix.** An inactive submit control with no explanation
is a dead end. Either say what is missing, or let them submit and explain.

**Preserve input, always.** No error, timeout or navigation ever discards what someone typed.

**Irreversible actions require confirmation that names the consequence.** Not "Are you sure?" —
"Withdrawing this application cannot be undone. A new application will start from scratch." The
confirming action is labelled with the verb, never "OK".

**One primary action per screen.** Where several actions are available, one is visibly primary and the
others are not.

## 9.3 Orientation and navigation

Every screen answers three questions without being asked: **where am I**, **how did I get here**, and
**how do I leave without losing anything**.

Multi-step processes show total steps and current position throughout. Moving backward never discards
forward progress.

**Nothing interrupts a person mid-task** except something that would cause them to lose work.

The browser's back button behaves as the reader expects. A product that breaks it has broken the only
navigation control every user already knows.

## 9.4 The accessibility floor

Inherited by every screen and never restated. Entries mention accessibility only where a screen carries
an unusual burden.

- **Everything is reachable and operable by keyboard**, in a focus order matching the visual order in
  right-to-left reading.
- **Focus is always visible**, and never lost — when content appears or disappears, focus moves
  somewhere sensible and announced.
- **Every control has an accessible name** that matches its visible label.
- **State changes are announced**, not merely rendered. Submission, validation failure, arrival of
  content and session expiry all reach a screen reader without a visual cue.
- **Colour is never the only carrier** of meaning — see §8.1 and §8.4.
- **Contrast meets the target level** in both light and dark presentations.
- **Targets are large enough for touch**, with spacing between adjacent controls that have different
  consequences.
- **Content is usable at increased text size** without horizontal scrolling or clipping.
- **Motion preferences are honoured** — see §8.5.
- **Forms are properly labelled and grouped**, so a screen reader conveys structure rather than a
  stream of inputs.
- **Language is declared**, and declared correctly where Latin-script content appears inside Hebrew.

> **OPEN QUESTION Q-03 —** Which conformance level, and does it cover the staff tool?
> **Blocks:** the specific bar every screen is tested against.
> **This document assumes:** the Israeli standard and its WCAG 2.0 AA equivalence as the floor, WCAG 2.2
> AA as the target, applying to **both** surfaces — staff accessibility is an employment obligation, not
> a courtesy, and a reviewer who cannot use the tool cannot do their job.
> **Who decides:** the institution's accessibility coordinator.
---

# §10 — The student portal

## 10.0 Portal principles

**Calm, spacious, one thing at a time** (§8.3). The user is anxious, unfamiliar, using it once, and
often on a phone.

**How it differs from the staff tool.** Same institution, same type, same colour meanings, same
components — but the portal is airier, offers light and dark, and explains itself. The staff tool is
dense, fixed, and assumes expertise. A student should never feel they have been handed an internal
tool; a reviewer should never feel they are being walked through something.

**It explains before it asks.** Every constraint a student could trip over is stated before they can
trip — that documents cannot be replaced, that an estimate is not a grant, that withdrawal is
permanent. Constraints discovered after the fact feel like traps.

## S-P-01 — Sign in / כניסה

**Exists so that:** someone with no account, no password and possibly no relationship with the college
can get in.

**Reached from:** any entry point · **Leads to:** `S-P-02`

**On arrival:** as §9. This screen is essentially always populated.

**What's on it:** an email field; a single action to send a code; one sentence explaining that no
password is needed; a link to help (`S-P-13`). A quiet bot check runs here — see *Guardrails*.

**Words on the screen:**
> כניסה לבקשות פטור מקורסים
> *(Sign in to course exemption applications)*

> נשלח לך קוד חד-פעמי לכתובת הדוא"ל. אין צורך בסיסמה.
> *(We'll send a one-time code to your email address. No password needed.)*

**Guardrails:** the address is checked for obvious malformation only, never for whether it is "known" —
saying "no such user" would both leak information and be wrong, since prospective applicants have no
record. Requesting many codes in quick succession is slowed, with an explanation rather than a silent
failure.

**The bot check** is invisible to nearly everyone. It protects the unauthenticated act of sending mail
to an arbitrary address; it is not a test the student is meant to notice passing. If it fails, the
message is non-alarming and offers a retry and a human route — never "you appear to be a robot", which
insults the majority of people who see it.

**When things go wrong:**

| Situation | They see | Recovery |
|---|---|---|
| Malformed address | Inline, on leaving the field | Correct it |
| Too many requests | Plain explanation and when to retry | Wait, or contact a person |
| Bot check fails | Neutral wording, retry offered | Retry, or contact a person |
| Sending fails | Stated plainly as our problem | Retry, or contact a person |

**Referenced by:** `J-STU-01` step 1, `J-STU-02` step 2, `J-PRO-01` step 1.

## S-P-02 — Enter your code / הזנת קוד

**Exists so that:** the code completes sign-in with as little friction as possible.

**Reached from:** `S-P-01` · **Leads to:** `S-P-03`, or back to `S-P-01`

**What's on it:** the code field, focused on arrival; the address it was sent to, so a typo is visible;
how long the code lasts; a resend action, initially unavailable with a visible countdown; a way back to
correct the address.

**Words on the screen:**
> שלחנו קוד לכתובת {address}. הקוד תקף לעשר דקות.
> *(We've sent a code to {address}. The code is valid for ten minutes.)*

**Guardrails:** the field accepts a pasted code with surrounding whitespace. Resend is unavailable
briefly, with the wait visible rather than the control silently inert. Repeated wrong entries slow down
with an explanation.

**When things go wrong:** wrong code — stated without accusation, retry immediately. Expired — say so
distinctly from "wrong", since the recovery differs, and offer a new code in one action. Never arrived
— point to the address shown, to the spam folder, and to a person.

**Deviation from §9:** autofocus is deliberate here despite the general reluctance to move focus; the
screen has exactly one purpose.

**Referenced by:** `J-STU-01` step 2.

## S-P-03 — Dashboard / הבקשות שלי

**Exists so that:** a returning student sees everything they have with this process and what, if
anything, needs them.

**Reached from:** sign-in, every message link · **Leads to:** `S-P-04`, `S-P-09`, `S-P-10`, `S-P-11`,
`S-P-12`, or a draft in progress

**On arrival — four states:**

| State | They see |
|---|---|
| **Nothing yet** | One sentence explaining what this is for, and a single action to begin |
| **One application** | Its programme, its status in words, the date, and the one action that fits — continue, view, download |
| **Several** | Newest first. Anything needing them is visually first regardless of date |
| **Mixed, including estimates** | Estimates visually distinct (§8.1 *provisional*) and grouped apart from formal applications, so the two are never confused |

**What's on it:** one entry per application — programme, status in words, date, and at most one action.
An action to start a new application, subject to `R-09`.

**Words on the screen (empty):**
> עדיין לא הגשת בקשות. אפשר להתחיל בבקשה חדשה לפטור מקורסים שכבר למדת.
> *(You haven't submitted any applications yet. You can start a new application for exemption from
> courses you've already studied.)*

**Guardrails:** starting an application for a programme with a live one returns the student to it, with
a sentence saying so. Never a silent duplicate, and never a bare refusal (`R-09`).

**Deviation from §9:** the empty state here is the primary onboarding surface and carries more
explanation than an empty state usually would.

**Referenced by:** `J-STU-01` step 3, `J-STU-02` step 3, `J-STU-05` step 4.

## S-P-04 — Start an application / בקשה חדשה

**Exists so that:** the student chooses a programme and understands what they are entering.

**Reached from:** `S-P-03` · **Leads to:** `S-P-05`

**What's on it:** a searchable list of programmes; for a non-enrolled visitor, a clear statement that
the result will be a **preliminary estimate**; what will be needed (prior courses, certificates,
evidence); the ten-working-day expectation; any eligibility conditions (`Q-14`).

**Words on the screen (prospective):**
> עדיין לא נרשמת ללימודים, ולכן תקבל/י הערכה מקדימה בלבד — היא אינה מהווה אישור פטור.
> *(You are not yet enrolled, so you will receive a preliminary estimate only — it does not constitute
> an exemption approval.)*

**Guardrails:** the estimate framing appears **before** any effort is invested, not at submission.
Long programme lists are searchable rather than scrolled.

**Referenced by:** `J-STU-01` step 4, `J-PRO-01` step 2.

## S-P-05 — Prior study / לימודים קודמים

**Exists so that:** the student records what they have already completed. This is where the most effort
is spent and where abandonment is most likely.

**Reached from:** `S-P-04`, or resumed · **Leads to:** `S-P-06`

**What's on it:** a list of entered courses, each showing name, institution, grade and credit; an
action to add one; edit and remove per entry; a clear indication that everything is saved as entered;
navigation to the next step.

**Words on the screen:**
> הוסף/י את הקורסים שכבר למדת. הפרטים נשמרים אוטומטית — אפשר לצאת ולחזור בכל שלב.
> *(Add the courses you've already studied. Details are saved automatically — you can leave and return
> at any point.)*

**Guardrails:** every entry persists the moment it is made; there is no save action and no way to lose
work by leaving. Grades are validated for plausibility, not correctness. Adding several courses in
succession is optimised — after saving one, the form is ready for the next without re-navigation, which
is the single biggest determinant of whether `P-3` finishes.

**When things go wrong:** a save fails — the entry stays on screen with a clear retry; it is never
silently dropped. This is the most damaging possible failure on this screen and the state must be
unmistakable.

**Deviation from §9:** validation is deliberately permissive. An unusual grading scale from a foreign
institution must not be rejected by a form; the reviewer will interpret it.

**Referenced by:** `J-STU-01` step 5, `J-STU-02` step 1.

## S-P-06 — Certificates / תעודות

**Exists so that:** professional certificates are recorded as what they are — a different kind of claim
from coursework, with no grade and no credit hours.

**Reached from:** `S-P-05` · **Leads to:** `S-P-07`

**What's on it:** a list of added certificates; an action to add one, choosing a recognised type or
describing another; the issuing body and date; an empty state making clear this step is optional.

**Words on the screen (empty):**
> אין תעודות להצגה. אם יש בידך תעודה מקצועית רלוונטית, אפשר להוסיף אותה כאן.
> *(No certificates to show. If you hold a relevant professional certificate, you can add it here.)*

**Guardrails:** the separation from `S-P-05` is structural, not a dropdown, so a certificate cannot be
entered as a grade-less course and silently mis-assessed.

**Referenced by:** `J-STU-01` step 6.

## S-P-07 — Evidence / מסמכים

**Exists so that:** the reviewer can verify what the student has claimed.

**Reached from:** `S-P-06`, and reachable at every later stage (`R-08`) · **Leads to:** `S-P-08`

**What's on it:** attached files with names, sizes and dates; an action to add; the size limit stated
**before** anyone hits it; guidance on what is useful; **a plain statement that files cannot be removed
or replaced, only added**.

**Words on the screen:**
> אפשר להוסיף מסמכים בכל שלב, אך לא ניתן להסיר או להחליף מסמך שכבר הועלה. מומלץ לתת לקובץ שם ברור.
> *(You can add documents at any stage, but a document that has been uploaded cannot be removed or
> replaced. We recommend giving each file a clear name.)*

**Guardrails:** the constraint is stated up front, in neutral terms, with the practical mitigation
(clear filenames) attached — not as a warning and not as an apology. Oversized files are rejected with
the limit named and the actual size shown.

**When things go wrong:** upload fails — the file remains selected and retry is one action, never
requiring reselection. Wrong file uploaded — the guidance points to adding the correct one and, if the
application is not yet assigned, to withdrawal (`R-08`).

**Referenced by:** `J-STU-01` step 7, `J-STU-04` fork.

## S-P-08 — Review and submit / סיכום והגשה

**Exists so that:** the student sees everything they are about to submit, and learns what happens next
before committing.

**Reached from:** `S-P-07` · **Leads to:** `S-P-09` or `S-P-12`

**What's on it:** everything entered, grouped, each group with a way back to edit; **the ten-working-day
expectation, stated before submission**; for a prospective applicant, the estimate framing repeated;
the submit action.

**Words on the screen:**
> לאחר ההגשה לא ניתן לערוך את הבקשה. תשובה תישלח בתוך עשרה ימי עבודה.
> *(After submission the application cannot be edited. A response will be sent within ten working days.)*

**Guardrails:** submission requires at least one course or certificate; if nothing was entered, the
screen says which step is empty and links to it. The read-only consequence is stated before submitting,
not discovered after.

**Referenced by:** `J-STU-01` step 8, `J-STU-04` step 1, `J-PRO-01` step 4.

## S-P-09 — Application status / מצב הבקשה

**Exists so that:** a waiting student can answer "where is it?" without contacting anyone. It is
deliberately uneventful.

**Reached from:** `S-P-03`, `M-02` · **Leads to:** `S-P-07`, `S-P-10`, `S-P-11`

**What's on it:** the status in words; the date submitted; **the date a response is expected**; a
read-only summary; an action to add a document; **withdrawal, while the application is unassigned**; a
route to a person.

**Two student-visible statuses before a decision:**

| Status | Words | Withdrawal |
|---|---|---|
| Awaiting a reviewer | הבקשה התקבלה וממתינה לבדיקה *(received, awaiting review)* | Available |
| Under review | הבקשה בבדיקה *(under review)* | Not available |

> **BY DESIGN —** These two statuses are deliberately distinct, and this is a reversal of the instinct
> to hide internal workload from students.
>
> Withdrawal ends when a reviewer takes the case (`R-08`). That means the presence or absence of a
> withdrawal control *already* reveals whether someone has picked the application up. Given that the
> information is unavoidably disclosed, disclosing it honestly in words is better than disclosing it
> accidentally through a disappearing button — a control that vanishes without explanation reads as a
> malfunction, and a student who saw it yesterday will assume something broke.
>
> **Do not "fix" this by hiding the assignment status.** Doing so does not conceal anything; it only
> removes the explanation for why withdrawal disappeared, and makes an intentional design look like a
> bug. If withdrawal's cut-off ever moves, revisit this together — the two are one decision.
>
> Note the limit: the student learns *that* someone has the case, never *who*, never their position in
> any queue, and never anything about workload.

**Guardrails:** withdrawal confirms with the consequence named — permanent, and a new application starts
from scratch (§9.2). If the expected date passes, the screen says so itself rather than waiting for
`M-08` to be the only acknowledgement.

**Referenced by:** `J-STU-01` steps 10–11, `J-STU-05` step 1.

## S-P-10 — Outcome / תוצאת הבקשה

**Exists so that:** the student learns exactly what was decided and obtains their certificate.

**Reached from:** `S-P-03`, `M-03` · **Leads to:** the certificate, `S-P-13`

**What's on it:** what was waived, listed first and named as requirements the student recognises; what
was not, each with the reviewer's reason; the certificate download, prominent; the decision date;
evidence still viewable (`R-08`); a contact route.

**Words on the screen:**
> אושרו {n} פטורים מתוך {m} דרישות שנבדקו.
> *(Approved: {n} exemptions out of {m} requirements reviewed.)*

**Guardrails:** granted items appear before refused ones. No number, score or characterisation of
confidence appears anywhere (`R-03`, §2.2). A refused item without a reason is not renderable — if a reason is
missing the screen shows that something is wrong rather than an empty space, because a silent blank
reads as arbitrary refusal.

**Deviation from §9:** the certificate download is the single primary action even when most
requirements were refused.

**Referenced by:** `J-STU-01` step 13, `J-STU-03` step 2, `J-STU-04` step 4.

## S-P-11 — Application not approved / הבקשה נדחתה

**Exists so that:** a student whose whole application was declined understands why and knows the one
route available.

**Reached from:** `S-P-03`, `M-04`

**What's on it:** the outcome in the first line; **the reviewer's reason, verbatim, visually set apart
as their words**; a contact route with a named way to reach a person; evidence still viewable and
downloadable.

**Words on the screen:**
> הבקשה נבדקה ולא אושרה. להלן נימוק הבודק/ת:
> *(The application was reviewed and not approved. The reviewer's reason follows:)*

**Guardrails:** the reason is rendered as text and never interpreted as markup. It is the same text sent
in `M-04` — one source. **No resubmission or appeal control exists** (see the `BY DESIGN` note under
`M-04`).

**Deviation from §9:** this screen has no primary action in the usual sense. Its most important element
is text, and the contact route is secondary by placement but must be unmissable.

**Referenced by:** `J-STU-01` fork table, `J-STU-03` step 4.

## S-P-12 — Preliminary estimate / הערכה מקדימה

**Exists so that:** a prospective applicant gets a genuinely useful answer that cannot be mistaken for a
grant.

**Reached from:** `S-P-03`, `M-05`

**What's on it:** the *provisional* treatment throughout (§8.1); which requirements **would likely** be
waived; a statement that this grants nothing; **an explanation of what happens on enrolment** — it
becomes a formal application automatically, evidence carries over, a reviewer decides again; a contact
route. **No certificate, and no download of any kind.**

**Words on the screen:**
> זוהי הערכה מקדימה בלבד ואינה מהווה אישור פטור. עם ההרשמה ללימודים הבקשה תעבור לבדיקה רשמית, והבודק/ת
> יחליט/תחליט מחדש.
> *(This is a preliminary estimate only and does not constitute an exemption approval. On enrolment the
> application will move to formal review, and a reviewer will decide again.)*

**Guardrails:** the Hebrew term for exemption (§2.1) never describes this screen's contents. Counts are qualified ("would
likely"), never bare. The absence of any downloadable artefact is deliberate — a document would be
kept, forwarded and eventually waved at someone.

**Deviation from §9:** the primary action is not a task. It is understanding what happens next, so the
enrolment explanation occupies the position a primary action normally would.

**Referenced by:** `J-PRO-01` step 5.

## S-P-13 — Help and contact / עזרה ויצירת קשר

**Exists so that:** anyone stuck reaches a person.

**What's on it:** how to reach the exemption office and when to expect a reply; brief answers to what
an exemption is, how long it takes, what to do about a wrong document, and what an estimate means; the
sign-in help path for a code that never arrives.

**Guardrails:** it never promises a response time the office has not agreed to. See `Q-15` in §13 for
the routing that must be settled before this is used beyond the pilot.

**Referenced by:** `S-P-01`, `S-P-10`, `S-P-11`, `S-P-12`.

## S-P-14 — Session ended / תם תוקף החיבור

**Exists so that:** an expired session is a normal event, not a failure.

**What's on it:** a plain statement that the session ended for security; reassurance that nothing
entered was lost; one action to sign in again — **returning to where they were**, not to the dashboard.

**Words on the screen:**
> תם תוקף החיבור. הפרטים שהזנת נשמרו. יש להתחבר/ה מחדש כדי להמשיך.
> *(Your session has ended. The details you entered have been saved. Please sign in again to continue.)*

**Guardrails:** never presented as an error. Never loses in-progress input. Returning to the same step
is the requirement — dropping someone at the dashboard after re-authentication turns an interruption
into lost work.

**Referenced by:** `J-STU-02` fork.

## 10.9 Mobile and one-handed use

A significant share of students will do all of this on a phone, `P-3` almost certainly.

**Everything is available on a phone.** No capability is desktop-only, including evidence upload —
which on a phone often means photographing a paper transcript, and must therefore accept a camera
capture as naturally as a file.

**Primary actions are reachable one-handed.** Anything a student does repeatedly — adding a course
after a course on `S-P-05` — sits within thumb reach and does not require a precise tap near a screen
edge.

**The wizard is vertical.** Steps stack; nothing depends on a horizontal layout or a wide viewport.

**Text remains readable at the system's chosen size** without horizontal scrolling. Tables — the
outcome list on `S-P-10` in particular — reflow rather than scroll sideways.

**Nothing depends on hover.** Any information behind a hover on a large screen is directly visible or
one tap away on a small one.

## 10.10 Accessibility beyond the floor

Three places carry an unusual burden. Everywhere else, §9.4 is sufficient.

**The wizard (`S-P-05`–`S-P-08`).** Step changes are announced, not merely rendered. Position within the
sequence is available to a screen reader at any time, not only visually. Adding a course announces the
addition and returns focus ready for the next entry — the loop `P-3` performs thirty times must work
without sight.

**The outcome list (`S-P-10`).** Granted and refused must be distinguishable non-visually. A reviewer's
reason must be associated with its requirement in a way a screen reader conveys, so a student cannot
hear a list of refusals and a separate list of reasons and be left to pair them.

**The estimate (`S-P-12`).** Its provisional nature is carried by colour and layout for a sighted
reader. Non-visually it must be carried by **words**, early in the reading order — the first thing
announced on this screen states that it is an estimate.
---

# §11 — Staff surfaces

## 11.0 Principles

**Dense, fast, keyboard-first** (§8.3). The user is expert, repeats the task, and works in bursts.

**No theming and no language switching.** One appearance, one language. Configurability that helps an
anxious once-only student is friction for someone opening this for the ninth time today.

**Nothing decorative.** Every element earns its space by being read or used.

**Evidence is never behind a click** where a decision depends on it. This is the single most important
requirement in this section.

## S-R-01 — Work queue / תור הבדיקות

**Exists so that:** a reviewer sees what is waiting and picks the right thing next.

**Leads to:** `S-R-02`

**On arrival:**

| State | They see |
|---|---|
| Empty | Plainly, with no suggestion of failure — an empty queue is good news |
| Populated | Applications awaiting review, oldest first by default |
| Mine in progress | Cases this reviewer already holds, separated and first — resuming beats starting |

**What's on it:** per application — programme, submission date, **how long it has waited**, number of
suggestions, and whether it converted from an estimate. Sort and filter by programme, age and state.
Anything past ten working days is visually unmistakable (`R-05`).

**Guardrails:** taking a case makes it exclusively that reviewer's; another reviewer sees it as held and
by whom. A held case can be released back. **No control acts on more than one application** (`R-04`).

**Deviation from §9:** ageing is emphasised beyond ordinary sorting — with no calendar pressure and no
push notification (`Q-11`), this indicator is the only thing preventing an application from being
forgotten.

**Referenced by:** `J-REV-01` step 1.

## S-R-02 — Review workspace / בדיקת בקשה

**Exists so that:** a reviewer decides each suggestion with the evidence in front of them.

**Reached from:** `S-R-01` · **Leads to:** `S-R-03`, `S-R-04`, `S-R-05`

**What's on it, in order of importance:**

1. **The student's evidence, visible without navigating away.** Not a tab, not a modal, not a download.
   A decision taken without the transcript on screen is a guess, and the layout is what prevents it.
2. **Suggestions grouped by requirement**, each showing the proposed prior study, its grade and
   institution, the strength of the match, and **why it was proposed** (`R-02`).
3. **Folded near-misses per requirement**, with a count, expanding to all of them (`R-03`).
4. **Progress** — how many decided, how many remain.
5. **Context**: prior grants for this student in other programmes, labelled as another programme's
   decisions and not carried over (`R-09`); and, for a converted estimate, the estimate and its
   history, labelled non-binding (`R-07`).
6. What the student typed, beside what was proposed — the claim and the evidence together.

**Guardrails:** only the holding reviewer can decide. Decisions save as made; there is no save action
and no way to lose a session's work. Each decision is individual (`R-04`). An undo is available per
decision while the case is open (`R-06`). If evidence was added after work began, a banner says so —
it does not reopen or reset anything (`R-08`).

**When things go wrong:** evidence fails to load — **decision controls are disabled with the reason
stated**, because deciding blind is worse than waiting. Someone else holds the case — read-only, with
the holder named.

**Deviation from §9:** density is at its highest here, and evidence placement is a hard requirement
rather than a layout preference.

**Referenced by:** `J-REV-01` steps 3–7, `J-PRO-01` step 8.

## S-R-03 — Suggestion detail / פרטי ההתאמה

**Exists so that:** a reviewer can go deeper on one pairing without losing the case.

**Reached from:** `S-R-02`

**What's on it:** the requirement in full — its description and credit weight; the proposed prior study
in full; **what drove the match**, in plain language; the strength; grant and refuse actions; a reason
field, required on refusal and optional on grant.

**Words on the screen:**
> הנימוק שתכתוב/י כאן יוצג לסטודנט/ית כלשונו. יש לנסח אותו כהסבר לסטודנט/ית ולא כהערה פנימית.
> *(The reason you write here will be shown to the student exactly as written. Write it as an
> explanation for the student, not as an internal note.)*

**Guardrails:** that warning is not a footnote — it is adjacent to the field and visually weighted,
because internal shorthand written here is published to a student. Refusal without a reason is not
possible. Returning to `S-R-02` restores the reviewer's position in the list.

**Referenced by:** `J-REV-01` steps 4–5.

## S-R-04 — Finalise / אישור הבקשה

**Exists so that:** a reviewer completes a fully decided application and issues the certificate.

**Reached from:** `S-R-02`

**What's on it:** a summary of granted and refused; confirmation that all suggestions are decided; a
statement of what finalising does — issues the certificate, notifies the student, and ends the
reviewer's ability to change decisions; the confirm action.

**Guardrails:** unavailable while anything is undecided, and **says how many remain** rather than being
inertly disabled (`R-05`). The consequence is named in the confirmation (§9.2). The certificate is
produced before the student is notified (`M-03`).

**When things go wrong:** certificate production fails — finalisation does not silently half-complete.
The reviewer is told, the student is not notified, and the case is flagged for an administrator to
reissue. A student receiving a message linking to a certificate that does not exist is the worst
outcome available here.

**Referenced by:** `J-REV-01` steps 8–9.

## S-R-05 — Decline application / דחיית הבקשה

**Exists so that:** an application that should not proceed at all is closed with an explanation.

**Reached from:** `S-R-02`

**What's on it:** a mandatory reason field carrying the same student-visible warning as `S-R-03`; a
statement that declining closes the application, refuses any undecided suggestions, and notifies the
student; the confirm action.

**Guardrails:** the reason is mandatory and its audience stated. Declining is distinct from refusing
every suggestion individually, and the screen makes the difference explicit.

**Referenced by:** `J-REV-01` "where it can go differently".

## S-A-01 — Programmes and requirements / תוכניות לימודים ודרישות

**Exists so that:** an administrator maintains what each programme requires.

**What's on it:** programmes; per programme, its requirements with names, codes and credit weights; add,
edit and retire actions; an indication of which requirements are commonly exempted.

**Guardrails:** changes apply to applications submitted from now on. **Applications in flight are not
retroactively altered**, and the screen says so before a change is saved. Retiring a requirement never
deletes decisions made against it.

**Referenced by:** `J-ADM-01`.

## S-A-02 — Matching rules / כללי התאמה

**Exists so that:** institutional knowledge is encoded once rather than carried in reviewers' heads.

**What's on it:** rules per programme, each stated in plain language; the strength of each expressed as
a plain-language likelihood rather than a coefficient; create, edit and retire; and **a preview showing
what a change would have done to recent applications, before it takes effect**.

**Guardrails:** the preview is mandatory in the path, not an optional extra — `P-5`'s stated fear is a
silent change, and this is the answer to it. A rule can move a suggestion's strength within what is
already plausible; it cannot manufacture certainty from nothing, and the screen explains that limit in
those terms. Where several rules apply to one pairing, only the strongest counts — stated on screen, so
an administrator does not stack weak rules expecting them to add up.

**Referenced by:** `J-ADM-02` steps 1–2.

## S-A-03 — Active rule set / הגרסה הפעילה

**Exists so that:** an administrator controls which set of rules is currently in use.

**Guardrails:** activation applies going forward only. Applications already assessed keep the
suggestions they were given, and **every application shows which set produced its suggestions**, so a
decision made a year ago remains explicable.

**Referenced by:** `J-ADM-02` step 3.

## S-A-04 — Reopen an application / פתיחת בקשה מחדש

**Exists so that:** a finalised decision can be corrected.

**What's on it:** the finalised application; a mandatory reason; a statement of what reopening does —
returns it to the queue, notifies the student (`M-06`), and supersedes any certificate.

**Guardrails:** administrators only (`R-06`). The reason is mandatory and recorded as its own entry, so
repeated reopenings each retain their own explanation. The previous certificate is marked superseded,
never deleted.

**Referenced by:** `J-ADM-03` step 1.

## S-A-05 — Exclude a past decision / החרגת החלטה

**Exists so that:** a decision later found to be wrong stops influencing future suggestions, without
being erased.

**What's on it:** the decision in context; a mandatory reason; the exclusion action and its reversal.

**Guardrails:** operates on **one decision**, never a whole application — one bad call must not drag
every sound decision beside it out of use. Excluding never deletes: the decision stands as a historical
fact, and its exclusion is recorded alongside with its reason. Reversing an exclusion also requires a
reason.

**Referenced by:** §4 `R-02`.

## S-A-06 — Staff access / הרשאות צוות

**Exists so that:** administrators grant and remove reviewer and administrator access.

**Guardrails:** no self-service. Removing access never removes that person's decisions or their name
from them — the record of who decided what survives their departure.

---

# §12 — Cross-cutting concerns

## 12.1 Language

**Hebrew is the product's language.** Every screen, message and document is composed in Hebrew, and
right-to-left is the reading direction rather than a transformation.

**What is never translated:** course names, programme names, institution names, and — most importantly
— **anything a reviewer wrote**. A rejection reason exists in exactly one language: the one it was
written in. Translating it would put words in a named person's mouth on a document the student may
forward.

**Latin-script content appears as-is**, inside Hebrew sentences, correctly ordered. This is constant and
must be right (§8.2).

> **OPEN QUESTION Q-07 —** Is there a genuine non-Hebrew-reading applicant population?
> **Blocks:** whether the portal offers a language choice at all.
> **This document assumes:** Hebrew only. The obstacle is not the interface — it is that every piece of
> human-authored content is Hebrew-only, so a language toggle would translate the frame around
> untranslated substance and read as broken rather than bilingual. If a real population exists, the
> blocking problem to solve first is whether reviewers would write reasons in two languages.
> **Who decides:** the academic office, from admissions data.

## 12.2 The certificate as a document

The certificate is the **sole terminus** of this process. Nothing downstream receives the decision;
what the student can prove, they prove by holding this. That makes it a product surface, not an export
format.

**It must contain:** the student's full name and identifying number; the programme; each waived
requirement by its official name and code; the date; the institution's identification; and a statement
of what the document asserts — *these requirements are waived* — phrased so a reader who knows nothing
about this process understands its scope.

**It must not contain:** anything about how the decision was reached. No strength, no reasoning, no
mention of matching, no reference to prior study that was refused. The document states an outcome.

**Credibility to a third party.** It will be shown to people with no relationship to this process — a
future employer, another institution, an accreditation body. It must be verifiable as genuine and
must state its own issue date and version.

**A superseded certificate declares itself.** When an application is reopened and re-finalised, the new
document is issued and the previous one is marked superseded **on its face** — someone holding the old
copy must be able to tell. Neither is destroyed (`R-06`).

**It is a printed artefact as often as a screen one.** It will be printed, photocopied and scanned. It
must survive monochrome printing with no loss of meaning: nothing carried by colour alone, adequate
contrast, and a layout that does not depend on precise rendering.

## 12.3 How long things last

From the user's side, three questions matter: *can I still get my certificate?*, *what happened to the
documents I uploaded?*, and *how long will an unfinished application wait for me?*

**Unfinished drafts wait, and warn before they do not.** Nothing a student typed disappears without
notice — if drafts expire, a message arrives before it happens with a way to keep it.

**A certificate remains retrievable** for as long as it might reasonably be needed. Someone who
graduates and needs proof three years later should not have to ask.

**Uploaded evidence has a shorter life than the decision it supported.** A transcript is the most
sensitive thing this product holds and the least useful once a decision is made and explained.

> **OPEN QUESTION Q-04 —** What are the actual periods?
> **Blocks:** what §12.3 can promise; what `S-P-10` can offer years later.
> **This document assumes:** decision, reason and certificate for the degree's lifetime plus a tail;
> uploaded evidence until decision plus a grace period, then destroyed — the decision surviving without
> it, because the reviewer's written reasoning is what makes it defensible, not the file.
> **Who decides:** the institution's privacy owner (`Q-02`).

> **OPEN QUESTION Q-02 —** Which privacy regime governs, and who owns it?
> **Blocks:** retention (`Q-04`); whether a self-service data-access route is required.
> **This document assumes:** the Israeli privacy legislation as amended, with no EU-resident applicant
> population, and that a student can view, export and request correction of what is held about them.
> **Who decides:** the institution, on advice.

## 12.4 Getting help

**One route, staffed by a person.** Every terminal message invites a reply and every dead end names a
way to reach someone. There is no ticket number and no form, because at this volume a reply to an email
is faster for everyone.

**What it is for:** questions about a decision; a document uploaded in error; a code that never arrived;
anything the product refused to do.

**What it is not for:** appeals. The person receiving these can explain a decision and can escalate
through the institution's own academic process, but the product does not present itself as an appeals
channel it cannot honour (see `M-04`).

> **OPEN QUESTION Q-15 —** Who owns the exemption mailbox?
> **Blocks:** whether this product can serve students beyond a pilot.
> **This document assumes:** during the pilot, a single named member of staff. **This is not viable
> generally** — a named individual is not an institution, takes holidays, and eventually leaves. Before
> the product serves students at scale it must route to a team-owned address with a stated response
> expectation.
> **Who decides:** the academic office. **This is a gate, not a note** — it must be answered before
> general availability, not discovered afterwards.

---

# §13 — Open questions register

Seven open. Each carries the provisional answer the rest of this document uses, so nothing here blocks
reading or building — but each is a real decision someone must make.

| # | Question | Blocks | Assumed answer | Decided by |
|---|---|---|---|---|
| `Q-02` | Which privacy regime governs, and who owns it? | `Q-04`; data-access rights | Israeli legislation as amended; no EU population; self-service access to one's own data | Institution, on advice |
| `Q-03` | Accessibility conformance level, and does it cover the staff tool? | The bar every screen is tested against | Israeli standard / WCAG 2.0 AA floor, 2.2 AA target, **both** surfaces | Accessibility coordinator |
| `Q-04` | Retention periods | What §12.3 promises; long-term certificate access | Decision and certificate for the degree lifetime plus a tail; evidence destroyed after decision plus a grace period | Privacy owner |
| `Q-05` | Which success measure wins when they conflict? | How §4 balances speed against per-item human decision; queue design | Reviewer effort, then student wait, then consistency | Academic office |
| `Q-07` | Is there a genuine non-Hebrew-reading population? | Whether a language choice exists | Hebrew only | Academic office |
| `Q-11` | Push new work to reviewers, or keep pull? | Whether `S-R-01` is a destination or an inbox | Pull, plus a daily digest and visible ageing | Owner of reviewer workload |
| `Q-14` | Are there eligibility floors — age of prior study, minimum grade, accreditation? | Whether `S-P-04` states conditions before effort is invested | No floors; if any exist they belong on the entry screen | Academic office |
| `Q-15` | Who owns the exemption mailbox? | Whether this can serve students beyond a pilot | A named individual during the pilot; **must become a team address before general availability** | Academic office |

**Decisions already made** and stated as fact throughout, listed here so they are not mistaken for
omissions: preliminary estimates rather than pre-enrolment grants (`R-07`); ten working days (`R-05`);
withdrawal until assignment, evidence append-only (`R-08`); no confidence shown to students (`R-03`,
§2.2); no bulk actions (`R-04`); one application per programme with no carry-over (`R-09`).

---

# Appendix A — Coverage matrix

Every screen appears in at least one journey; every journey names screens. Orphans would be visible
here.

| Screen | Personas | Journeys |
|---|---|---|
| `S-P-01` sign in | P-1, P-2, P-3 | J-STU-01, J-STU-02, J-PRO-01 |
| `S-P-02` code entry | P-1, P-2, P-3 | J-STU-01 |
| `S-P-03` dashboard | P-1, P-2, P-3 | J-STU-01, J-STU-02, J-STU-05 |
| `S-P-04` start | P-1, P-2, P-3 | J-STU-01, J-PRO-01 |
| `S-P-05` prior study | P-1, P-2, P-3 | J-STU-01, J-STU-02, J-PRO-01 |
| `S-P-06` certificates | P-1, P-2 | J-STU-01, J-PRO-01 |
| `S-P-07` evidence | P-1, P-2, P-3 | J-STU-01, J-STU-04, J-PRO-01 |
| `S-P-08` review and submit | P-1, P-2, P-3 | J-STU-01, J-STU-04, J-PRO-01 |
| `S-P-09` status | P-1, P-3 | J-STU-01, J-STU-05 |
| `S-P-10` outcome | P-1, P-3 | J-STU-01, J-STU-03, J-STU-04 |
| `S-P-11` declined | P-1, P-3 | J-STU-01, J-STU-03 |
| `S-P-12` estimate | P-2 | J-PRO-01 |
| `S-P-13` help | all students | referenced from S-P-01, S-P-10, S-P-11, S-P-12 |
| `S-P-14` session ended | P-1, P-3 | J-STU-02 |
| `S-R-01` queue | P-4 | J-REV-01 |
| `S-R-02` workspace | P-4 | J-REV-01, J-PRO-01 |
| `S-R-03` suggestion detail | P-4 | J-REV-01 |
| `S-R-04` finalise | P-4 | J-REV-01 |
| `S-R-05` decline | P-4 | J-REV-01 |
| `S-A-01` programmes | P-5 | J-ADM-01 |
| `S-A-02` matching rules | P-5 | J-ADM-02 |
| `S-A-03` active rule set | P-5 | J-ADM-02 |
| `S-A-04` reopen | P-5 | J-ADM-03 |
| `S-A-05` exclude a decision | P-5 | R-02 |
| `S-A-06` staff access | P-5 | — administrative, outside the journeys |

| Message | Triggered in |
|---|---|
| `M-01` | J-STU-01, J-STU-02, J-PRO-01 |
| `M-02` | J-STU-01, J-STU-04 |
| `M-03` | J-STU-01, J-STU-03, J-STU-04 |
| `M-04` | J-STU-01 fork, J-REV-01 fork |
| `M-05` | J-PRO-01 |
| `M-06` | J-ADM-03 |
| `M-07` | J-REV-01 |
| `M-08` | J-STU-01 |
| `M-09` | J-PRO-01 |
| `M-10` | J-STU-05 |

# Appendix B — String index

Where each notable Hebrew string is specified. This is an index, not a copy.

| String | Owned by |
|---|---|
| כניסה לבקשות פטור מקורסים | `S-P-01` |
| נשלח לך קוד חד-פעמי… | `S-P-01` |
| שלחנו קוד לכתובת… | `S-P-02` |
| עדיין לא הגשת בקשות… | `S-P-03` |
| עדיין לא נרשמת ללימודים… | `S-P-04` |
| הוסף/י את הקורסים שכבר למדת… | `S-P-05` |
| אין תעודות להצגה… | `S-P-06` |
| אפשר להוסיף מסמכים בכל שלב… | `S-P-07` |
| לאחר ההגשה לא ניתן לערוך… | `S-P-08` |
| הבקשה התקבלה וממתינה לבדיקה / הבקשה בבדיקה | `S-P-09` |
| אושרו {n} פטורים… | `S-P-10` |
| הבקשה נבדקה ולא אושרה… | `S-P-11` |
| זוהי הערכה מקדימה בלבד… | `S-P-12` |
| תם תוקף החיבור… | `S-P-14` |
| הנימוק שתכתוב/י כאן… | `S-R-03` (also `S-R-05`) |
| Subject lines, all messages | §7, per message |
| Voice examples and do/don't pairs | §5.1 |
| Gender-inclusive form examples | §5.2 |
| Error-message examples | §5.4 |
