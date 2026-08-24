# Business Rules — <PRODUCT>

> **Bug-vs-intended oracle.** A rule here is authoritative truth. If observed behavior violates a `BR-xx`, it is a **Confirmed** defect — cite the rule ID. If behavior is unusual but matches a rule, it is NOT a bug.
>
> **Every rule must cite a real source** (Epic AC, filed bug, or observed+verified). Never invent.

| ID | Rule | Source | Severity if violated |
|----|------|--------|----------------------|
| BR-01 | <what is allowed / forbidden / enforced> | Epic <KEY> AC line N | P2 |

## Conflict handling
If a session's requirements contradict a rule here, flag the contradiction in analysis output — do not silently pick one.
