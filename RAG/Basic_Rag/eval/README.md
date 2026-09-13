# RAG Evaluation Harness — Milestone 1

Measures two things about the RAG Explorer pipeline, **without an LLM judge**
and **without touching the RAG code**.

| Suite | Question |
|---|---|
| Citation accuracy | When the model answers, does it cite chunks that were actually retrieved? |
| Refusal | When the answer is not in the corpus, does it decline instead of inventing? |

Both are deterministic — string comparison against the API response. No second
model, no labelling, no cost beyond the queries themselves.

---

## Run it

```bash
cd RAG/Basic_Rag/eval
pip install requests          # the only dependency

python run_eval.py                                  # both suites, live API
python run_eval.py --base-url http://localhost:8000 # against a local backend
python run_eval.py --suite refusal                  # one suite
python run_eval.py --keep                           # leave the workspace in place
```

Exit code `0` = no failures, `1` = something failed. Usable as a gate.

---

## What it does, in order

```
1. ingest    eval/corpus/*  ->  /api/upload   (visitor id: eval-harness-milestone-1)
2. suite 1   10 in-corpus questions   -> /api/query -> parse [Chunk #N] markers
3. suite 2   10 out-of-corpus questions -> /api/query -> check for a refusal
4. teardown  DELETE /api/sources                (removes ONLY this visitor's docs)
5. report    table to stdout + JSON to results/
```

Teardown runs in a `finally` block, so a Ctrl-C partway through still cleans up.

---

## Why a dedicated visitor id

Every request sends `X-Visitor-Id: eval-harness-milestone-1`. The backend scopes
all reads, writes and deletes by owner, so:

- the eval corpus is invisible to the seed corpus and to real visitors
- the teardown can only ever delete documents this harness created
- two eval runs cannot contaminate each other

---

## Suite 1 — citation accuracy

Four outcomes, kept separate because they mean different things:

| Status | Meaning |
|---|---|
| `PASS` | every cited chunk number was actually retrieved |
| `FAIL` | **phantom citation** — cited a chunk that was never returned |
| `WARN` | answer had no citation at all — the claim is untraceable |
| `ERROR` | retrieval returned nothing, so there was nothing to cite |

**`WARN` does not fail the run.** An uncited answer is worth knowing about; it is
not the same defect as a fabricated source. `FAIL` and `ERROR` fail the run.

`ERROR` is separate on purpose: zero chunks is a *retrieval* problem, and folding
it into a citation failure would hide it.

---

## Suite 2 — refusal / out-of-corpus

Ten questions the corpus cannot answer, in two kinds:

- **general** (3) — world knowledge the model certainly knows from training.
  The temptation to answer is strongest here.
- **plausible** (7) — sounds like it belongs in a login spec, but the corpus is
  silent. This is the harder case: the model must notice an *absence* rather
  than reject an obviously off-topic question.

`PASS` = it said the context does not cover this.
`FAIL` = it answered anyway.

---

## A bug this harness had, and why it is written down

The first version marked **six correct refusals as hallucinations.** Its phrase
list contained `does not contain` but not `does not mention`, `does not state`
or `does not describe` — which is what the model actually says.

The RAG app was behaving perfectly. The harness was wrong.

The phrase list was then rebuilt from real observed answers rather than from
imagination, and a small self-test in the docstring of `looks_like_refusal`
covers both directions — real refusals must pass, and genuine inventions plus
hedges ("I'm not sure, but the capital is Paris") must still fail.

Worth remembering when adding phrases: **a check that cries wolf trains you to
ignore it.** Widen the list only from answers you have actually seen.

---

## Files

```
eval/
  run_eval.py                 the runner — one file, no framework
  questions_citation.json     10 questions answerable from the corpus
  questions_refusal.json      10 questions that are not
  corpus/login-spec.md        the evaluation corpus (8 ACs)
  results/eval-<stamp>.json   one file per run, full answers included
  README.md                   this file
```

**Nothing in `app/` was modified.** The harness is a plain HTTP client. Delete
the `eval/` folder and the RAG app is byte-for-byte unchanged.

---

## Keep the corpus frozen

`corpus/login-spec.md` is deliberately small so every expected answer is
knowable — and the refusal suite depends on what is *absent* from it as much as
what is present.

Editing it silently changes what "out of corpus" means. Add a document and
`REF-04` (session timeout) might become answerable, turning a correct `PASS`
into a meaningless one.

---

## Known limits

- **Non-determinism.** The backend runs at `temperature=0.3`, so answers vary
  between runs. A single run is a sample, not a measurement. Large deltas are
  meaningful; one flipped `WARN` is not.
- **Refusal detection is phrase-based.** A refusal worded in a form not on the
  list reads as a failure. That is the bug above, and it can recur.
- **Free-tier flakiness.** A transient `500` from the backend shows as `ERROR`.
  Re-run before treating it as a defect — one was observed and did not reproduce.
- **Citation accuracy checks existence, not correctness.** It proves chunk #2
  was retrieved; it does not prove chunk #2 supports the claim. That needs a
  judge model and is deliberately out of scope for milestone 1.

---

# Milestone 2 — Retrieval Quality

Judges the **search**, not the answer. If retrieval hands the model the wrong
passages, no prompt tuning saves the output.

```bash
python run_retrieval_eval.py
python run_retrieval_eval.py --base-url http://localhost:8000
python run_retrieval_eval.py --keep
```

## The four metrics

| Metric | Question it answers |
|---|---|
| **Hit Rate@4** | did ANY relevant document appear in the top 4? |
| **Precision@4** | what share of returned chunks were relevant? |
| **RR** | 1/position of the first relevant hit — 1.0 if ranked first |
| **MRR** | mean RR across all questions |

Read together:

```
high hit rate + low MRR   -> right doc found, ranked low
high hit rate + low P@4   -> lots of irrelevant chunks come along
low hit rate              -> retrieval is missing the document
```

## Ground truth, and why it is trustworthy

`questions_retrieval.json` was labelled **by hand** from
`corpus_retrieval/*.md` before any query ran. Nothing was copied from RAG
output — labelling from output measures the retriever against itself and
always scores perfectly.

**Relevance is keyed on filename, not chunk number.** `chunk_number` in the
API response is the rank position (1..4) of that result, so it changes per
query. The filename is stable. Each corpus file is under `CHUNK_SIZE` (800)
and is one section, so **one file == one chunk**, and naming the file names
the chunk.

## Why a second corpus

Milestone 1's corpus is 1296 chars -> **2 chunks**. Every query returns both,
so Hit Rate@4 is always 1.0 and Precision@4 is a constant. The metrics would
be arithmetic, not measurement.

`corpus_retrieval/` has 8 single-chunk documents, so the top-4 is a real
selection out of 8 and the numbers mean something.

## Results (12 questions, 8 chunks)

```
Hit Rate@4         1.00     12/12 found a relevant doc
Mean Precision@4   0.29
MRR                1.00     relevant doc always ranked first
```

**Read Precision@4 = 0.29 correctly — it is not a failure.** Most questions
have exactly ONE relevant document out of 4 returned, so the ceiling is 0.25.
The two multi-answer questions score 0.50, which is their ceiling. The
retriever is at maximum on this set; the metric is bounded by `top_k`, not by
retrieval quality. It becomes informative when questions have more relevant
documents, or when `top_k` is tuned.

**A perfect MRR should make you suspicious, not satisfied.** Check the margins
before believing it:

```
RET-11  "What error message is shown for an invalid mobile number?"
  1. 01-mobile-validation.md   sim=0.7524  <- correct
  2. 07-error-messages.md      sim=0.7330  <- keyword lure, 0.019 behind
```

`07-error-messages.md` is full of the word "error" but only describes
placement and styling; the actual message string lives in the mobile document.
The retriever chose meaning over keyword — by a margin of **0.019**. That is a
genuine pass, and a narrow one. A chunking or model change could flip it.

`RET-06` (session expiry vs OTP expiry) cleared its distractor by 0.147, a
comfortable margin.

**What this run does not prove:** 12 questions on 8 documents is a small,
clean corpus. Scores will drop on real documents with overlapping content, and
that drop is information, not regression.

## Files added in milestone 2

```
run_retrieval_eval.py         the runner
questions_retrieval.json      12 questions, hand-labelled ground truth
corpus_retrieval/*.md         8 single-chunk documents
results/retrieval-<stamp>.json
```

Uses visitor id `eval-harness-milestone-2` — separate from milestone 1, so the
two corpora never pollute each other's retrieval.

---

# Milestone 3 — Grounding / Faithfulness

Asks: **is every factual claim in the answer actually present in the chunks the
model was given?**

Milestone 1 judged citations and refusals. Milestone 2 judged the search. This
judges the gap between them — the model had the right context, but did it stay
inside it?

```bash
python run_grounding_eval.py
python run_grounding_eval.py --base-url http://localhost:8000
```

## The four labels

| Label | Meaning | Score |
|---|---|---|
| `FULLY_GROUNDED` | every expected fact present, nothing invented | 1.00 |
| `CORRECT_REFUSAL` | corpus cannot answer, and the model said so | 1.00 |
| `PARTIALLY_GROUNDED` | some expected facts missing, nothing invented | partial |
| `UNGROUNDED` | invented a fact, or answered what it could not know | 0.00 |

## Why there is no LLM judge

The usual approach is a second model rating entailment. Deliberately not used:
the only strong model wired into this system is **the same Groq model that
wrote the answer**, and a model grading its own output shares its own blind
spots.

Grounding is checked deterministically instead. Each case names:

- **`expected_facts`** — values that must appear in the answer **and** in the
  retrieved chunks. Numbers, exact message strings, role names — things with
  one correct value that cannot be paraphrased away.
- **`forbidden_facts`** — plausible values that are *not* in the corpus. One
  appearing in the answer means the model filled a gap from training data.
  That is the hallucination signal, and it needs no judge.

**An expected fact must be in the answer AND in the context.** In the answer
alone it could have come from training data and merely happen to be right —
that case is labelled `UNGROUNDED`, not grounded.

## Results (12 cases, 8 chunks)

```
FULLY_GROUNDED     10
CORRECT_REFUSAL     2

OVERALL GROUNDING SCORE   1.00
```

**A perfect score needs checking, not celebrating.** Four cases were built as
traps, and the answers confirm they were handled genuinely rather than by luck:

```
GND-10  "What is the maximum password length allowed?"
        -> "The password field has no maximum length."
        The corpus says exactly that. Inventing "64 characters" was the
        expected failure; it did not.

GND-12  "How many login attempts per minute before rate limiting?"
        -> "...do not specify a per-minute limit... They only describe a
            lockout after five consecutive failed attempts."
        It distinguished the adjacent fact that IS in the corpus from the
        one asked for, instead of conflating them.

GND-05  forbidden "admin" (the intuitive answer), corpus says "auditor"
        -> answered "auditor". Chose the document over intuition.

GND-06  forbidden "15 minutes" and "10 minutes" — both real values elsewhere
        in the corpus (lockout, OTP). Cross-document fact bleed did not occur.
```

## What this does not measure

**Checkable facts, not full entailment.** An answer can carry a vague
unsupported sentence alongside correct numbers and still score as grounded.
Catching that requires a judge model and is out of scope here.

Two further limits:

- **Fact matching is substring-based** on normalised text (bold markers,
  non-breaking hyphens and smart quotes are flattened first, or correct
  answers would fail on typography).
- **The corpus is clean and small.** Real documents with overlapping content
  will score lower, and that drop is information, not regression.

## Files added in milestone 3

```
run_grounding_eval.py         the runner
questions_grounding.json      12 cases with expected/forbidden facts
results/grounding-<stamp>.json
```

Reuses `corpus_retrieval/` (milestone 2's 8 documents — they already contain
precise, checkable facts). Visitor id `eval-harness-milestone-3`.

---

# Running all three

```bash
python run_eval.py              # 1: citations + refusals
python run_retrieval_eval.py    # 2: retrieval quality
python run_grounding_eval.py    # 3: grounding
```

Each uses its own visitor id and clears its own workspace on exit, so they can
run in any order without interfering.

---

# Milestone 4 — Answer Quality

**A different axis from milestone 3.** M3 asked "is the answer true?" and scored
1.00. M4 asks "is it a *good* answer?" — because a grounded answer can still be
poor: it can miss half the question, volunteer facts nobody asked for, skip its
citations, or bury one sentence in a page of prose.

```bash
python run_answer_quality_eval.py
python run_answer_quality_eval.py --base-url http://localhost:8000
```

## The four dimensions

| Dimension | Rule | Scale |
|---|---|---|
| **Completeness** | fraction of the question's parts the answer covers | parts covered / parts asked |
| **Precision** | each off-topic fact volunteered costs 1/3 | 1.0 clean, 0.0 at 3 strays |
| **Citation discipline** | cited and real = 1.0; phantom or absent = 0.0 | binary |
| **Conciseness** | degrades linearly past a per-question word budget | 1.0 under, 0.0 at 2x |

Composite = mean of the four.

## How precision is measured without a judge

Each case lists **`off_topic_facts`** — facts that *are* in the corpus but were
*not* asked for. Milestone 3 scores those as perfectly grounded, because they
are true. Here they cost points, because the question did not ask.

That single idea is what makes over-answering detectable deterministically.

## Design notes

- **Conciseness strips citations before counting words.** `[Chunk #1, #3]` is
  machinery, not prose — counting it would penalise an answer for citing well.
- **Conciseness degrades, it does not cliff.** A hard fail at the boundary would
  make one extra clause look identical to three paragraphs of padding.
- **Status is driven by completeness, not the composite.** Missing part of the
  question is a defect; being wordy or uncited is a warning. Averaging them into
  one verdict would put a chatty complete answer and a terse incomplete one in
  the same bucket.

## Results (12 cases)

```
Completeness              1.00
Precision                 0.97
Citation discipline       0.25   <- the finding
Conciseness               1.00
--------------------------------
COMPOSITE ANSWER QUALITY  0.81

PASS 3 · WARN 9 · FAIL 0
```

**Citation discipline 0.25 is the real result of this milestone.** Nine of
twelve answers stated facts from the retrieved context with no `[Chunk #N]`
marker at all. Milestone 1 saw the same thing (6 of 10) and reported it as a
`WARN`; M4 quantifies it as a quality score.

The claims are correct and grounded — M3 proved that. They are simply not
traceable. For a system whose selling point is verifiable answers, that is the
gap worth closing, and it is a prompt change in `llm.py`, not a pipeline defect.

**Precision 0.97** — one stray, AQ-03. Asked only for the lockout duration, the
answer added "from the fifth failed attempt". True, grounded, not asked for.

## Three harness bugs found while building this

All three were **the harness being wrong, not the RAG app** — the same failure
mode as milestone 1's refusal list:

```
AQ-06  criteria had "below the field"; the model said "beneath"
AQ-03  criteria had "five failed";     the model said "fifth failed attempt"
AQ-08  criteria had "successful login"; the model said "successfully logs in"
```

The first two were caught by reading the actual answers before reporting a
failure. After the third, every criterion was re-checked against every answer
collected so far in one pass, rather than patching one at a time.

**A false FAIL is worse than a missed one** — it sends you debugging an
application that is behaving correctly.

## Limitations of this methodology

- **Substring matching, not understanding.** A criterion lists the phrasings a
  correct answer might use. A valid answer worded outside that list scores as a
  miss. Three such bugs are documented above; more are possible.
- **Precision only sees the strays it was told about.** An answer could wander
  into something not on the `off_topic_facts` list and still score 1.00.
- **The word budgets are judgement calls**, hand-set per question. They are
  reasonable, not derived.
- **Conciseness cannot see repetition.** A padded answer within budget scores
  1.00.
- **Non-determinism.** `temperature=0.3` means wording shifts between runs. The
  three criteria bugs above surfaced precisely because of that. Treat any single
  run as a sample.
- **"Good answer" is partly subjective.** These four dimensions are a defensible
  decomposition, not the only one. Relevance ordering, tone and formatting are
  not measured.

## Files added in milestone 4

```
run_answer_quality_eval.py        the runner
questions_answer_quality.json     12 hand-designed cases
results/answer-quality-<stamp>.json
```

Reuses `corpus_retrieval/` (milestones 2 and 3's 8 documents). Visitor id
`eval-harness-milestone-4`. Milestones 1-3 untouched.

---

# Milestone 5 — Evaluation Reliability

**Tests the harness, not the RAG app.** Milestones 1-4 measure the pipeline.
Nothing measured whether those measurements were correct.

```bash
python validate_harness.py             # all groups, offline, no API, no cost
python validate_harness.py --group A   # matcher correctness only
```

## Why this was needed

Every milestone matched facts with a plain substring check. That has two
failure modes, and neither announces itself — a scoring bug just quietly
reports the wrong number:

```
FALSE POSITIVE, number inside a number
  fact "8"       matched "18 characters"    -> wrong answer scored as correct
  fact "64"      matched "640 characters"   -> a hallucination went undetected
  fact "90 days" matched "900 days"

FALSE POSITIVE, negated statement
  fact "six"     matched "The OTP is NOT six digits."
  fact "90 days" matched "The spec does not mention 90 days."
  -> a denial scored as if the model had asserted the fact
```

**Six live criteria were vulnerable** to the first class (bare numbers in
`questions_answer_quality.json`), and **twelve** in
`questions_grounding.json` — including `"64"`, `"128"` and `"256"` as
forbidden facts, where a false positive means a real hallucination is missed.

## What changed

`matching.py` — one shared matcher, imported by M3 and M4:

- **word-boundary matching**, so `"8"` no longer matches inside `"18"`
- **a negation guard**: an occurrence within 40 characters after "not",
  "never", "unlike" etc. does not count as an assertion
- **`allow_negated=True`** for forbidden facts only — a value absent from the
  corpus is worth flagging even in a denial, because the model still
  introduced it

Milestones 1-4 keep their goals, criteria and scoring rules. Only the
primitive underneath changed.

## The bug this milestone caught in itself

Word-boundary matching broke `"invalidat"`, a deliberate stem written to cover
*invalidated / invalidates / invalidation*. Group C flagged it immediately:
**AQ-10 dropped 1.00 -> 0.50** under the new matcher.

The first fix — skip the trailing boundary for all alphabetic facts — then
reopened the false positive: `"six"` matched `"sixteen"`. Group A caught that
on the next run.

There is no reliable way to tell a stem from a complete word by looking at the
string, so stems are now declared explicitly in `WORD_STEMS`. Anything not on
that list gets both boundaries — the safe default, because **a false negative
gets investigated and a false positive does not**.

Two harness bugs, both found by the harness's own tests, neither by a failing
eval run.

## Results

```
GROUP A  matcher correctness      23 checks
GROUP B  criteria audit            2 checks  (148 criteria values scanned)
GROUP C  regression                1 check   (no drift)
-----------------------------------------------
         31 passed, 0 failed
```

Group B also reports two overlapping criteria — AQ-01 and AQ-07 have the
required part `"6"` sitting inside the off-topic fact `"60 seconds"`. Safe now
that matching is boundary-aware, and reported so the dependency stays visible.

**Score impact after wiring the matcher in:**

```
M3 grounding    1.00 -> 1.00   unchanged
M4 completeness 1.00 -> 1.00   unchanged
M4 precision    0.97 -> 0.97   unchanged
M4 conciseness  1.00 -> 1.00   unchanged
M4 citation     0.25 -> 0.17   moved (see below)
```

The citation move is **not** the matcher — citation scoring never used it. It
is `temperature=0.3`: one fewer answer happened to carry a `[Chunk #N]` marker
on that run. This is the clearest evidence yet that a single run is a sample,
not a measurement.

## Is the evaluation now trustworthy enough for an LLM-as-a-Judge milestone?

**For the deterministic parts, yes.** The matcher has 23 pinned edge cases
covering both error directions, the criteria files are audited, and a
regression test makes a silent rewrite of past results impossible. A judge
milestone can be compared against these numbers as a baseline.

**Three caveats that a judge milestone must handle:**

1. **Criteria are still hand-written phrasings.** The matcher is now correct;
   the criteria can still be incomplete. Four such bugs have been found so far
   (`beneath`, `fifth failed`, `successfully logs in`, `invalidat`). A judge
   would not have these — which is exactly why it is worth building, and also
   why its verdicts must be diffed against these deterministic ones rather
   than trusted outright.

2. **Non-determinism is unaddressed.** Citation discipline moved 0.25 -> 0.17
   between two runs with no code change. Before a judge run means anything,
   each question needs N samples and a reported spread.

3. **The judge must not be the Groq model under test.** Same model, same blind
   spots. A different provider, and its verdicts checked against group A's
   pinned cases first — a judge that fails those is not fit to grade anything.

## Files added in milestone 5

```
matching.py              shared matcher: boundaries, negation, stems
validate_harness.py      31 offline checks in three groups
```

Modified: `run_grounding_eval.py` and `run_answer_quality_eval.py` — each now
delegates its fact matching to `matching.py`. Goals, criteria and scoring
rules unchanged. M1 and M2 untouched; the RAG backend untouched.

---

# Milestone 6 — Stability and Repeatability

**Is one evaluation run a measurement, or a sample?**

M5 found the answer by accident: two M4 runs with no code change between them
gave citation discipline 0.25 and then 0.17. Every number reported in M1-M4
was a single sample presented as a fact.

```bash
python run_stability_eval.py             # 5 runs (the minimum)
python run_stability_eval.py --runs 10
```

## What it does

Runs the M4 suite N times against the same ingested corpus and reports mean,
min, max, range and stdev per metric. It **imports** `run()`, `score_answer()`
and `aggregate()` from the M4 runner rather than reimplementing them — a second
copy would drift, and the stability numbers would then describe a scorer nobody
uses.

The corpus is ingested **once**, not per run. Re-uploading would add retrieval
variance on top of generation variance and confound the two.

M5's `validate_harness.py` runs first as a pre-flight. Stability numbers from a
broken scorer are worse than none — they look authoritative and describe
nothing.

## Telling model variance apart from evaluator defects

A score that moves has two possible causes, and they are distinguished by
comparing the **answer text**, not just the score:

```
same text, same score        -> stable
different text, any score    -> model variance      (the model changed its answer)
SAME TEXT, different score   -> EVALUATOR DEFECT    (the scorer disagrees with itself)
```

The third is a bug and exits non-zero. Model variance is a finding, not a
failure — it is the thing this milestone set out to measure.

## Results — 5 runs, 12 cases, 60 answers

```
metric                 mean    min    max  range  stdev  verdict
completeness           1.00   1.00   1.00   0.00  0.000  stable
precision              0.97   0.97   0.97   0.00  0.000  stable
citation_discipline    0.27   0.17   0.42   0.25  0.091  UNSTABLE
conciseness            1.00   1.00   1.00   0.00  0.000  stable
composite              0.81   0.78   0.85   0.06  0.023  stable
```

**Citation discipline is the one unstable metric.** It swings 0.17-0.42 — a
range wider than the value itself. Whether the model attaches `[Chunk #N]` is
close to a coin flip per answer, and nothing in the harness or the corpus
changes between runs.

**Five of twelve cases changed grade** between runs (AQ-06, 08, 09, 10, 12) —
every one traced to model variance, none to the scorer.

**Zero evaluator defects.** No case produced identical text with different
scores.

## The criteria bug this milestone found

The first 5-run batch showed AQ-09 swinging PASS -> FAIL -> WARN, and
completeness varying 0.96-1.00. Reading the five answers showed why:

```
run 1  "there is no maximum length"          -> matched
run 2  "does not impose a maximum length"    -> MISSED
run 4  "does not impose a maximum length"    -> MISSED
```

Semantically identical, phrased differently. The criteria list lacked that
form. **The classifier was right that the text changed, but the FAIL was the
harness's fault, not the model's.**

This is the fifth criteria gap found across M1, M4 and M6 (`beneath`,
`fifth failed`, `successfully logs in`, `invalidat`, `does not impose`). After
fixing it, all 60 collected answers were re-audited in one pass — clean — and
completeness became perfectly stable at 1.00.

**Repetition is itself a criteria-coverage test.** One run exercises one
phrasing; five runs exercise five. Three of the five criteria bugs in this
project were found by looking at more samples, not by better thinking.

## Is one run sufficient?

**No, for citation discipline.** Its range (0.25) exceeds its mean (0.27). A
single run could report 0.17 or 0.42 for an unchanged system. Quote a mean
over >= 5 runs with its range.

**Yes, roughly, for the others.** Completeness, precision and conciseness held
a range of 0.00-0.04. Composite is stable at 0.81 +/- 0.03 because three of its
four inputs are.

**The operational rule:** treat any delta smaller than the metric's range as
noise. A citation score moving 0.25 -> 0.17 means nothing. Composite moving
0.81 -> 0.60 would.

## Implication for the future LLM-as-a-Judge milestone

M5 said a judge needs N samples with a reported spread. M6 quantifies N: **5
runs is enough to expose the instability, and the spread must be quoted, not
the point estimate.** A judge compared against a single-run baseline would be
measured against noise.

## Files added in milestone 6

```
run_stability_eval.py            the repeat runner
results/stability-<stamp>.json   per-run scores, per-case classification
```

Modified: `questions_answer_quality.json` — one `any_of` list widened for the
criteria gap above. Reuses M4's visitor id deliberately: a different id would
measure a different workspace.

M1-M5 goals, scoring rules and criteria are otherwise unchanged. The RAG
backend is untouched.

---

# Milestone 7 — LLM-as-a-Judge Benchmark

**Not a replacement for the deterministic evaluator.** The question is
narrower: does an independent judge agree with our hand-written criteria, and
where it disagrees, which one is wrong?

```bash
python run_judge_eval.py --calibrate    # calibration only
python run_judge_eval.py                # calibration + full benchmark
python run_judge_eval.py --runs 3       # N judge samples per case
```

## The independence rule is enforced in code

The RAG answers with Groq (`openai/gpt-oss-120b`). The judge is Gemini
(`gemini-3.6-flash`) — a different provider. `assert_independent()` exits 2 if
the judge resolves to the RAG's provider, and also if it cannot recognise the
provider at all.

Verified by test: a Groq judge is refused, an unrecognised model is refused,
Gemini is allowed. A warning would have been ignored; a non-zero exit is not.

Key lives in `eval/.env`, gitignored (`.gitignore:22`), never in code, and
never visible to the RAG backend.

## Calibration: is this judge fit to grade anything?

The judge is **not assumed correct**. Before scoring the real suite it grades
five cases with an objectively known answer:

```
PASS  perfect answer          completeness         2/2
PASS  perfect answer          citation_discipline  2/2
PASS  perfect answer          precision            2/2
PASS  hallucinated fact       factual_grounding    0/0
PASS  phantom citation        citation_discipline  0/0
PASS  incomplete two-parter   completeness         1/1
FAIL  over-answering          precision   got 1, expected 0

calibration: 6/7 (86%)
```

**The one miss is informative, not disqualifying.** On an answer that
volunteered three unrequested facts, the judge scored precision 1 ("mostly
focused") where the criteria expected 0 ("wanders well beyond"). It detected
the over-answering and disagreed about severity. That is a judgement call, and
it is exactly the kind of disagreement this milestone exists to surface.

The run refuses to proceed below 60% calibration.

## Results — 12 cases, 10 scored

```
cases compared        10      (AQ-11, AQ-12 hit the Gemini free-tier 429)
mean delta            +0.038   judge minus deterministic
largest disagreement  0.05
disagreements >= 0.20 0
judge scored higher   8/10
```

Per dimension, judge mean on a 0-2 scale:

```
completeness          2.00   (min 2, max 2)
factual_grounding     2.00   (min 2, max 2)
citation_discipline   0.40   (min 0, max 2)   <-- agrees with M4
precision             1.90   (min 1, max 2)
```

## The finding: two methods, one conclusion

**Deterministic citation discipline: 0.20/1. Judge citation discipline:
0.40/2 — the same 0.20.**

An independent model, given no knowledge of our scoring rules, reached the same
verdict on the same weak dimension. M4 said answers state facts without
`[Chunk #N]`; the judge says so too, unprompted.

That convergence is the useful output of this milestone. A single evaluator
finding a problem is a hypothesis; two independent methods finding the same
problem is a result.

## Agreements and disagreements

**Agreement is high and systematic.** Mean delta +0.038, largest 0.05, zero
disagreements above the 0.20 threshold. The judge scored slightly higher on 8
of 10 cases — a small consistent optimism, not noise.

**The +0.04 gap has a traceable cause.** The deterministic scorer includes
conciseness, which the judge does not score; and the judge collapses to a 0-10
integer overall, so it cannot express the fractional penalties the
deterministic precision rule produces (2/3 for one stray fact). Different
instruments, not contradictory readings.

**No case had a real disagreement**, which is itself a limitation: 12 clean
cases on an 8-document corpus is not enough to stress a judge. Disagreements
are where a judge earns its cost, and this suite produced none.

## Is the judge useful as a second signal?

**Yes, as corroboration. Not yet as an authority.**

What it demonstrably adds:

- **Independent confirmation.** It reached M4's citation finding without being
  told the criteria existed.
- **No criteria-phrasing blind spot.** Five deterministic bugs so far were
  correct answers scored as misses because of unanticipated wording
  (`beneath`, `fifth failed`, `successfully logs in`, `invalidat`,
  `does not impose`). The judge has none of these.

What must improve before relying on it:

1. **Rate limits make it unreliable.** 2 of 12 cases failed on the Gemini free
   tier. A benchmark that silently drops cases cannot gate anything.
2. **One sample per case.** M6 proved a single run is noise for the system
   under test; the same applies to the judge. `--runs 3` exists but was not
   used here, so judge variance is unmeasured.
3. **Calibration is 5 cases.** Enough to catch a badly broken judge, not
   enough to trust its fine-grained scores. M5 pins 23 checks for the
   deterministic matcher; the judge deserves comparable coverage.
4. **The corpus is too easy.** Zero disagreements on 12 clean cases proves
   little. A judge is worth its cost where the two methods diverge, and this
   suite never diverged.
5. **Judge optimism is unquantified.** +0.04 consistently higher, on a sample
   of 10. Whether that is instrument difference or leniency needs more data.

**Recommended use today:** run it alongside the deterministic suite and
investigate any case where they differ by more than 0.20. Do not let it gate a
release, and do not replace a deterministic check with it.

## Files added in milestone 7

```
run_judge_eval.py              judge harness, calibration, agreement analysis
.env                           GEMINI_API_KEY, JUDGE_MODEL (gitignored)
results/judge-<stamp>.json     per-case deterministic vs judge, full verdicts
```

Reuses `score_answer()` and `ask()` from the M4 runner rather than
reimplementing them. M1-M6 untouched. The RAG backend untouched.

---

# Milestone 7.1 — Hardening the Judge Against Rate Limits

M7 dropped **2 of 12 cases** to Gemini rate limits and reported "10 cases
compared" without saying why it was not 12. A benchmark that quietly loses
cases cannot be trusted to report agreement.

```bash
python test_judge_client.py     # 49 offline tests, no network, no key
python run_judge_eval.py        # now reports "N/12 evaluated, M unavailable"
```

## What M7 got wrong

Five defects in one function:

```
1. backoff was linear (8s, 16s), not exponential
2. Gemini's own retryDelay hint in the 429 body was ignored
3. retry count was hardcoded at 2
4. malformed JSON was never retried — one bad response killed the case
5. returned None for everything, so a 429, a 500 and a parse error
   were indistinguishable to the caller
```

Defect 5 is the one that made the report misleading: the runner could not say
*why* a case was missing, so it said nothing.

## What changed

`judge_client.py` — transport extracted so retry logic is testable offline.
Every call returns a `JudgeResult` with an explicit outcome:

| Outcome | Meaning | Retried? |
|---|---|---|
| `OK` | verdict parsed | — |
| `RATE_LIMITED` | 429 on every attempt; transient, re-runnable | yes |
| `BAD_JSON` | responded, never parseable | yes |
| `ERROR` | non-429 HTTP, network, timeout | 5xx yes, 4xx no |

**A 4xx that is not 429 stops immediately.** A malformed request will not fix
itself, and burning the retry budget on it delays the cases that would succeed.

## Backoff

```
attempt 0:  4s      base * 2^0
attempt 1:  8s
attempt 2: 16s
attempt 3: 32s
attempt 4: 60s      capped
```

Plus jitter, so repeated runs do not re-collide on the same quota boundary.

**Gemini's own hint wins when it is longer.** A real 429 from this key carried
`retryDelay: 25s` — verified live, not assumed. Guessing shorter burns another
429; guessing longer wastes time. The server knows its quota window.

## Unavailable is not zero

The rule that matters: **a case that exhausts its retries is excluded from the
statistics, never scored.**

```
AQ-11     0.75     --      --   UNAVAILABLE (RATE_LIMITED)
```

Assigning 0.0 to an unmeasured case would drag the mean delta toward the judge
looking worse than it is — corrupting the exact number the benchmark exists to
report. The summary now reads `10/12 evaluated, 2 unavailable`, and agreement
is computed over evaluated cases only.

## Configuration — environment, not code

```
JUDGE_MAX_RETRIES    default 4     bounded, never infinite
JUDGE_BACKOFF_BASE   default 4.0   seconds, doubles per attempt
JUDGE_BACKOFF_CAP    default 60.0  ceiling on any single wait
JUDGE_TIMEOUT        default 120   seconds per HTTP call
```

All read from `eval/.env` (gitignored) or the real environment, which wins.
`--max-retries` overrides for one run. No keys in code.

## Tests — 49 offline, all passing

The bug this fixes only appeared under a live rate limit, the hardest
condition to reproduce on demand. Injecting the transport and the sleep
function reproduces it every time, in under a second:

```
1.  success on first try                  no retries, no waiting
2.  429 then recovery                     the M7 bug, now handled
3.  429 never clears                      RATE_LIMITED, no score invented
4.  malformed JSON then success           retried (M7 gave up here)
5.  malformed JSON every time             BAD_JSON, distinct from 429
6.  a 400 is not retried                  stops after 1 call
7.  a 503 is retried                      transient
8.  network error is retried
9.  backoff doubles 4/8/16/32, caps at 60
10. server retryDelay parsed from a real 429 body
11. verdict extraction: fenced, prose-prefixed, malformed
12. config from env, junk falls back to defaults
3b. daily quota stops immediately, no retries
3c. telling a daily cap from a burst limit
```

**One test was wrong and the code was right.** An early assertion expected the
two waits in test 2 to differ. They correctly did not: the 429 body's 25s
server hint exceeds that test's 0.05s cap, so both clamp to the cap. Growth is
proven in test 9 against a realistic config; test 2 now asserts what it should
— that the server hint was honoured at all.

That is the fourth time in this project a failing check turned out to be the
check's fault rather than the code's.

## The live re-run found something the tests could not

The hardened benchmark was run against the real API. It did NOT produce a
12/12 result — it produced a better finding:

```
retry 1/4 after 14.2s (429, server hint 13s)
retry 2/4 after 59.1s (429, server hint 58s)
retry 3/4 after 56.7s (429, server hint 56s)
retry 4/4 after 60.3s (429, server hint 59s)
RATE_LIMITED  perfect answer
```

Every retry behaved exactly as designed — exponential backoff, server hint
honoured, bounded at 4, no invented score. And it still could not succeed,
because the limit was not a burst:

```
quotaId: GenerateRequestsPerDayPerProjectPerModel-FreeTier
limit:   20 requests PER DAY
```

**The M7 run plus this calibration exhausted the daily free-tier cap.** No
retry policy can clear a per-day quota; it resets at midnight Pacific.

### The fix that finding produced

A daily cap and a burst limit are both HTTP 429 and need opposite handling.
`is_daily_quota()` now reads the `quotaId` from the violation:

```
burst limit  ->  RATE_LIMITED     retried with backoff
daily cap    ->  QUOTA_EXHAUSTED  stops immediately, run aborts
```

Retrying a daily cap spends four minutes to arrive at the same 429. The run
now stops at the first one, marks the remaining cases `NOT_ATTEMPTED_QUOTA`,
and says when the quota resets.

**This is why the milestone was worth doing even though the benchmark did not
complete.** M7 would have reported "10 cases compared" and hidden both the
rate limit and the quota exhaustion behind a silent `None`.

## Benchmark: before vs after

```
BEFORE (M7)   10/12 evaluated, 2 dropped with no reason given
AFTER (M7.1)  0/12 evaluated — daily quota exhausted, reported explicitly,
              remaining cases marked NOT_ATTEMPTED_QUOTA, no scores invented
```

**The "after" number is not a regression in the harness.** It is the harness
correctly refusing to fabricate results from an API that cannot answer. The
agreement figures from the M7 run (mean delta +0.038 over 10 cases) remain the
most recent real measurement; re-run after the quota resets to get 12/12.

## Regression

```
M5 matcher validation      31 passed, 0 failed
M7.1 retry tests           49 passed, 0 failed
deterministic scoring      completeness 1.00 · precision 0.667
                           citation 1.00 · conciseness 1.00  (unchanged)
RAG backend                untouched
```

## Files

```
judge_client.py            transport, retry policy, outcome types
test_judge_client.py       49 offline tests
run_judge_eval.py          MODIFIED — uses judge_client, reports unavailable
.env                       MODIFIED — retry knobs documented
```

M1-M6 goals, criteria and scoring rules unchanged. The M5 matcher is untouched.

---

# Milestone 8 — Provider-Independent Judge

M7.1 hardened the transport but hardcoded Gemini: its URL, its auth header, its
response shape. Swapping judges meant editing code, and a fallback was
impossible.

```bash
python test_judge_providers.py    # 39 offline tests
python run_judge_eval.py --calibrate
```

## Provider is now configuration

```
JUDGE_PROVIDER=gemini
JUDGE_MODEL=gemini-3.6-flash
JUDGE_FALLBACK_PROVIDER=      # optional
JUDGE_FALLBACK_MODEL=
RAG_PROVIDER=groq             # excluded from the chain
```

Five providers supported: `gemini`, `anthropic`, `openai`, `deepseek`, `xai`.
A sixth, `groq`, is defined **only so the guard can recognise and reject it** —
listing it makes the refusal explicit rather than falling through to "unknown".

Retries, backoff, quota detection and outcome types were already
provider-agnostic in `judge_client.py` and did not change.

## The rule now binds on the fallback too

**A fallback is exactly how the RAG's own provider could creep back in.** The
run would look successful and mean nothing.

`resolve_chain()` filters the RAG's provider out before anything is called, and
reports what it dropped:

```
note   fallback: groq is the RAG's own provider - EXCLUDED.
       A model grading its own output shares its blind spots.
```

Three ways a Groq judge is caught:

```
named directly       JUDGE_FALLBACK_PROVIDER=groq        -> excluded
named by model only  JUDGE_FALLBACK_MODEL=gpt-oss-120b   -> inferred, excluded
mismatched pair      provider=gemini model=grok-2        -> ambiguous, skipped
```

**The ordering trap that makes this non-trivial:** the RAG's model is
`openai/gpt-oss-120b`, running on Groq. A naive "does it contain gpt" check
reads that as OpenAI and lets it through. `MODEL_HINTS` checks `gpt-oss` before
`gpt-`, and there is a pinned test for it.

An unrecognised model resolves to `None` and is **skipped, never assumed
independent**. Guessing is how a Groq model slips past.

## Fallback behaviour

Falls through only on `QUOTA_EXHAUSTED` or `ERROR` — conditions the next
provider might not share. A `BAD_JSON` or a persistent burst limit does **not**
fall through: burning the backup's quota on a case the primary already answered
badly wastes the only reserve.

## Tests — 39 offline, all passing

```
1. inferring a provider from a model name  (incl. the gpt-oss trap)
2. THE FALLBACK MUST NOT BE THE RAG'S PROVIDER  - 4 checks
3. chain resolution: keyless, mismatched, unknown
4. each provider builds its own url, auth and payload
5. calling through a resolved target
6. fallback takes over when the primary is exhausted
7. an unavailable case is never given a score
```

Group 2 is the one that matters. The rest is plumbing.

## Live run: NOT COMPLETED — quota exhausted

Attempted, and the harness reported it correctly rather than fabricating a
result:

```
RAG provider    groq  (excluded from the judge chain)
primary         gemini/gemini-3.6-flash
independence    OK - 1 judge(s), none is groq

QUOTA_EXHAUSTED  perfect answer: daily free-tier quota exhausted; resets at midnight PT
QUOTA_EXHAUSTED  hallucinated fact: ...
QUOTA_EXHAUSTED  phantom citation: ...
QUOTA_EXHAUSTED  incomplete, two-part question: ...
QUOTA_EXHAUSTED  over-answering: ...

calibration: 0/7
```

**This is the M7.1 improvement working.** Each case failed *instantly* with no
retries burned — M7.1 spent four minutes per case backing off against a daily
cap that cannot clear.

```
BENCHMARK   0 of 12 evaluated, 12 unavailable (QUOTA_EXHAUSTED)
```

No scores invented. The last real measurement remains M7's: mean delta +0.038
over 10 evaluated cases.

**Gemini free tier is 20 requests/day.** Calibration alone needs 5-7; a full
benchmark needs 12 more. One tier does not cover one full run.

## Gemini vs Grok: NOT RUN — no key

The comparison was requested "only if Grok is not the RAG provider". Grok is
not — the RAG is Groq (a different company; the names are confusingly similar).
So the comparison is permitted.

It could not run for a simpler reason: **there is no `XAI_API_KEY` on this
machine.** Checked, not assumed.

The fallback slot is left empty rather than filled with something unsuitable:

```
XAI_API_KEY        absent
ANTHROPIC_API_KEY  present, but "credit balance is too low"
OPENAI / DEEPSEEK  absent
```

`xai` is registered as a provider, so adding `XAI_API_KEY` plus
`JUDGE_FALLBACK_PROVIDER=xai` enables the comparison with no code change. That
is the point of the milestone.

## Files

```
judge_providers.py           provider specs, chain resolution, independence filter
test_judge_providers.py      39 offline tests
judge_client.py              MODIFIED - accepts a target; Gemini path kept as
                             the default so all 49 M7.1 tests pass unchanged
run_judge_eval.py            MODIFIED - resolve_judges(), call_with_fallback()
.env                         MODIFIED - JUDGE_PROVIDER, fallback slots
```

## Regression

```
M5  matcher validation     31 passed, 0 failed
M7.1 retry tests           49 passed, 0 failed
M8  provider tests         39 passed, 0 failed
                          119 total
deterministic scoring      1.000 / 0.667 / 1.0 / 1.0  unchanged
RAG backend                untouched
```

---

# Milestone 8 — Final Validation Report

## Test results

```
validate_harness.py        31 passed, 0 failed   M5 matcher (unchanged)
test_judge_client.py       49 passed, 0 failed   M7.1 retry behaviour
test_judge_providers.py    39 passed, 0 failed   M8 provider + fallback
verify_m8_behaviour.py     26 passed, 0 failed   end-to-end, simulated provider
------------------------------------------------
                          145 passed, 0 failed
```

`verify_m8_behaviour.py` was added because the live quota is exhausted and the
real API cannot demonstrate these paths. It proves the **code paths** are
correct; only a live run proves the judge is **useful**. Both are reported
rather than conflated.

## Reliability behaviour — verified

| Behaviour | Evidence |
|---|---|
| Independence enforced on primary AND fallback | groq excluded 3 ways; xai permitted |
| Exponential backoff | 4/8/16/32, capped at 60 |
| Provider retry hints honoured | 25s hint beats a computed 4s; ignored when shorter |
| Retries bounded | stops at 1 + max_retries, never infinite |
| Daily quota detected | **one call, no retries**, distinct from a burst limit |
| No score invented | `verdict is None` on every failure path |
| Unavailable reported with reason | "4 of 12 evaluated, 8 unavailable (QUOTA_EXHAUSTED)" |
| Calibration gates the benchmark | an unusable judge stops the run |

## Live run: 0 of 12 evaluated, 12 unavailable

```
RAG provider    groq  (excluded from the judge chain)
primary         gemini/gemini-3.6-flash
independence    OK - 1 judge(s), none is groq
retries         4 max, backoff 4.0s doubling, cap 60.0s

QUOTA_EXHAUSTED  perfect answer ... and 4 more, all instant

calibration: 0/7
Judge failed calibration badly. Stopping.
```

**Reason: `GenerateRequestsPerDayPerProjectPerModel-FreeTier`, limit 20/day.**

Two things went right here, and both are the milestone working:

1. **Each case failed instantly.** No retries burned against a cap that cannot
   clear inside a retry window. M7.1 spent four minutes per case doing exactly
   that.
2. **The calibration gate stopped the benchmark.** A judge that cannot grade
   known-answer cases is not fit to grade real ones, so no 12-case run was
   attempted and no numbers were produced. The alternative — running anyway and
   reporting 0/12 with scores — would have been fiction.

The last real measurement remains M7's: **mean delta +0.038 across 10
evaluated cases**.

## Gemini vs xAI: NOT TESTED

The comparison is **permitted** — xAI (Grok) is not the RAG provider. The RAG
uses **Groq**, a different company with a confusingly similar name, and the
guard distinguishes them.

It could not run because no key exists. Checked, not assumed:

```
XAI_API_KEY         absent
OPENAI_API_KEY      absent
DEEPSEEK_API_KEY    absent
OPENROUTER_API_KEY  absent
ANTHROPIC_API_KEY   present, but "credit balance is too low"
```

**No comparison is reported, because no comparison was made.** Inventing one
from a single provider's numbers would be exactly the failure this harness
exists to prevent.

`xai` is registered and its request shape is covered by tests. Setting
`XAI_API_KEY` and `JUDGE_FALLBACK_PROVIDER=xai` enables the comparison with no
code change.

## M8 verdict: PASS, with the live benchmark outstanding

**PASS on what M8 asked for:**

- provider-independent judge via configuration, 5 providers
- fallback supported, subject to the same independence rule
- exponential backoff with provider hints, bounded
- daily quota explicitly detected and handled differently from a burst limit
- no score ever invented for an unavailable case
- unavailable cases reported with reasons
- calibration runs before the benchmark and gates it
- keys from the environment, never in code
- 145 tests passing; M5 matcher, deterministic scoring and the RAG backend
  untouched

**OUTSTANDING, and not claimable:**

- a live 12/12 benchmark — blocked by a 20/day free-tier quota
- a Gemini-vs-xAI comparison — blocked by the absence of any second key

The correct reading: **the harness is production-grade; the account is not
provisioned to exercise it.** Re-run after the quota resets (midnight PT) for
calibration plus a partial benchmark, or add any second provider key for a full
one.

---

# M8 — Final Validation (live attempt, existing Gemini config)

Run with the existing configuration. No provider added, no new key requested.

## 1. Implementation status: COMPLETE

```
judge_providers.py    242 lines   provider specs, chain resolution, independence filter
judge_client.py       296 lines   retries, backoff, quota detection, outcome types
run_judge_eval.py     560 lines   calibration gate, benchmark, agreement analysis
```

Nothing was changed this run. Inspection first, as instructed, found the
implementation already complete.

## 2. Offline test results: 145 / 145

```
validate_harness.py        31 passed, 0 failed   M5 matcher
test_judge_client.py       49 passed, 0 failed   M7.1 retry behaviour
test_judge_providers.py    39 passed, 0 failed   M8 provider + fallback
verify_m8_behaviour.py     26 passed, 0 failed   M8 end-to-end (simulated)
------------------------------------------------
                          145 passed, 0 failed
```

## 3. Configuration verified, secrets not exposed

```
GEMINI_API_KEY            SET, 53 chars, prefix AQ.A...
JUDGE_PROVIDER            'gemini'
JUDGE_MODEL               'gemini-3.6-flash'
JUDGE_FALLBACK_PROVIDER   (empty)
RAG_PROVIDER              'groq'
JUDGE_MAX_RETRIES         '4'
JUDGE_BACKOFF_BASE        '4.0'
JUDGE_BACKOFF_CAP         '60.0'
JUDGE_TIMEOUT             '120'

resolved chain -> primary: gemini/gemini-3.6-flash
                  RAG provider groq EXCLUDED
```

Only length and a 4-character prefix are ever printed.

## 4. Live calibration: FAILED — Gemini unavailable

```
CALIBRATION
  QUOTA_EXHAUSTED  perfect answer: daily free-tier quota exhausted; resets at midnight PT
  QUOTA_EXHAUSTED  hallucinated fact: ...
  QUOTA_EXHAUSTED  phantom citation: ...
  QUOTA_EXHAUSTED  incomplete, two-part question: ...
  QUOTA_EXHAUSTED  over-answering: ...

  calibration: 0/7 dimension checks correct
  Judge failed calibration badly. Stopping.
  exit code 1
```

**Exact reason, read from the API response, not inferred:**

```
HTTP 429 RESOURCE_EXHAUSTED
quotaId : GenerateRequestsPerDayPerProjectPerModel-FreeTier
limit   : 20 requests/day
```

The daily free-tier allowance was consumed by the M7 benchmark and earlier
calibration runs. It resets at midnight Pacific.

## 5. Live benchmark: NOT RUN — correctly gated

The benchmark was **not attempted**, because calibration failed. That is the
designed behaviour: a judge that cannot grade cases with known answers cannot
produce interpretable verdicts on real ones.

```
0 of 12 evaluated, 12 unavailable (QUOTA_EXHAUSTED)
```

No metrics are reported. No scores were assigned to unavailable cases. The last
valid measurement remains M7's: **mean delta +0.038 across 10 evaluated cases**.

## 6. Reliability mechanisms — observed live

Each mechanism was exercised by this run, not merely unit-tested:

| Mechanism | Observed |
|---|---|
| Daily quota detected immediately | 1 attempt, **0.0s waited**, no retries |
| Not confused with a burst limit | `QUOTA_EXHAUSTED`, not `RATE_LIMITED` |
| Bounded retries | never entered; retry budget untouched |
| Structured outcome | every case carries a reason string |
| No invented scores | `verdict is None` on all 5 calibration cases |
| Independence enforced | groq excluded before any call |
| Calibration gates benchmark | run stopped, exit 1 |

The instant failure is the M7.1/M8 improvement working. M7.1's earlier version
spent roughly four minutes per case backing off against a cap that cannot clear
inside any retry window.

## 7. Regression: none

```
RAG backend        all .py dated Aug 29 - Sep 1; nothing today
M5 matcher         6 pinned checks, all correct
                   ("18" != "8", negation, "640" != "64", stems)
deterministic      completeness 1.000 | precision 0.667
                   citation 1.0 | conciseness 1.0   -- unchanged
```

## 8. VERDICT

**M8 implementation: PASS. Live validation: BLOCKED by quota, not by defect.**

Every M8 requirement is implemented and verified by 145 passing tests plus an
observed live failure that behaved exactly as specified. The one thing that
could not be produced — a 12-case benchmark — was blocked by a 20 requests/day
free-tier limit, and the harness reported that precisely rather than
fabricating numbers.

**The harness is finished. The account is not provisioned to exercise it.**

To complete the live benchmark, re-run after midnight Pacific:

```
python run_judge_eval.py --runs 1
```

Calibration needs 5-7 requests and the benchmark 12, so a single day's 20-request
allowance covers roughly one full run with no margin.

---

# M8.1 — Free fallback provider (Mistral)

Gemini stays primary. Mistral is added as a **free** fallback so an exhausted
daily quota does not stop a benchmark, and does not cost anything to continue.

## Why Mistral and not one of the others

| Provider | Free? | Independent of the RAG? | Verdict |
|---|---|---|---|
| gemini | yes | yes | primary, unchanged |
| **mistral** | **yes, no card** | **yes** | **added as fallback** |
| groq | yes | NO - is `RAG_PROVIDER` | permanently excluded |
| anthropic / openai / deepseek / xai | no | yes | not added (paid) |

Mistral's API is OpenAI-shaped, so it reuses `_openai_style_payload` and the
existing retry, backoff and quota machinery with no changes to either.

## Files changed

```
judge_providers.py     +21   "mistral" provider + MODEL_HINTS entry
run_judge_eval.py       +1   MISTRAL_API_KEY added to the env allowlist
.env                   +14   MISTRAL_API_KEY slot (empty) + enable instructions
test_mistral_fallback.py   NEW, 47 checks
```

No change to the RAG backend, the M5 matcher, or deterministic scoring.

## Enabling it

The key is NOT in code. Get a free one at https://console.mistral.ai/api-keys,
then in `eval/.env`:

```
MISTRAL_API_KEY=<your key>
JUDGE_FALLBACK_PROVIDER=mistral
JUDGE_FALLBACK_MODEL=mistral-small-latest
```

`resolve_chain()` picks it up. No code change needed.

Until then the chain is Gemini-only, and that is **reported** rather than
silently assumed — a keyless fallback is dropped with the note
`fallback: MISTRAL_API_KEY not set - skipped`.

## Offline suite: 192 / 192

```
validate_harness           31 passed, 0 failed
test_judge_client          49 passed, 0 failed
test_judge_providers       39 passed, 0 failed
verify_m8_behaviour        26 passed, 0 failed
test_mistral_fallback      47 passed, 0 failed   <- new
--------------------------------------------------
                          192 passed, 0 failed
```

The 145 pre-existing checks are unchanged: adding a provider did not perturb
any of them.

## The eight required scenarios

| # | Scenario | Result |
|---|---|---|
| 1 | Gemini succeeds | OK, one call, fallback untouched |
| 2 | Burst 429 | retried, recovers, non-zero wait |
| 3 | Daily quota | ONE call, 0.0s wasted, `QUOTA_EXHAUSTED` |
| 4 | Fallback to Mistral | Mistral answers on `api.mistral.ai` |
| 5 | All providers down | both exhausted, no verdict, no false OK |
| 6 | Malformed fallback response | `BAD_JSON`, retried, truncation not half-parsed |
| 7 | No invented scores | `verdict is None` on all 5 failure paths |
| 8 | Unavailable reporting | 3 of 12 evaluated, 9 unavailable, all accounted |

Scenario 9 additionally proves the independence rule still binds on the new
provider: with `RAG_PROVIDER=mistral`, the Mistral fallback is EXCLUDED exactly
as Groq is. A free fallback did not buy an exemption.

## Live test

**Not run — no `MISTRAL_API_KEY` is present on this machine.** Connectivity
cannot be verified against an endpoint there is no credential for, and no key
was invented or requested. Gemini's own quota also remains exhausted
(`QUOTA_EXHAUSTED`, 1 attempt, 0.0s), so live calibration and the 12-case
benchmark did not run either.
