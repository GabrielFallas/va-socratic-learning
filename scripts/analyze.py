#!/usr/bin/env python3
"""
analyze.py — A-vs-B analysis for the Sonic Socratic-tutor study (Entregable 3).

Reads the per-participant CSV exported from /admin (or /api/export?format=csv)
and prints, per outcome metric, descriptive statistics by condition plus — when
SciPy is available — a Mann-Whitney U test (non-parametric; appropriate for the
small, non-normal samples typical of a class pilot), Cliff's delta and Cohen's d
effect sizes. Pilot rows (P-PILOT-*) are excluded automatically.

Why non-parametric + effect sizes: with a small N, p-values are underpowered and
self-report scales rarely reach significance (self-report and behavioral measures
are weakly correlated). Report effect sizes and lean on behavioral + qualitative
evidence in the paper's Discussion.

Usage:
    python scripts/analyze.py sessions-YYYY-MM-DD.csv
    python scripts/analyze.py            # defaults to the newest sessions-*.csv in CWD

No third-party packages are required for descriptives. Install scipy for the
inferential tests:  pip install scipy
(Equivalent analyses can also be run in jamovi or R; this script just provides a
zero-setup baseline.)
"""
import csv
import glob
import math
import os
import sys

# Force UTF-8 stdout so Spanish accents / Greek symbols print on Windows (cp1252).
try:
    sys.stdout.reconfigure(encoding="utf-8")  # type: ignore[attr-defined]
except Exception:
    pass

try:
    from scipy.stats import mannwhitneyu  # type: ignore
    HAVE_SCIPY = True
except Exception:  # pragma: no cover - scipy optional
    HAVE_SCIPY = False

# ── Metrics, design-agnostic ──────────────────────────────────────────────
# Each metric is keyed by a normalized name; observations() pulls the right CSV
# column for each per-condition observation (crossover vs between-subjects).
#
# Task-level outcome/behavioral metrics (per condition).  (key, label, higher?)
TASK_METRICS = [
    ("resolved",   "Tarea resuelta (0/1)", True),
    ("turns",      "Turnos (tarea)",       True),
    ("timeSec",    "Tiempo tarea (s)",     False),
    ("avgTtftMs",  "TTFT medio (ms)",      False),
]
# Questionnaire metrics: (instrument, score, label, higher?)
QUEST_METRICS = [
    ("sus",       "total",            "SUS (0-100)",            True),
    ("nasa-tlx",  "rawTlx",           "NASA-TLX (RTLX)",        False),
    ("pedsupport", "total",           "Apoyo pedagógico (1-5)", True),
    ("godspeed",  "overall",          "Godspeed global (1-5)",  True),
    ("godspeed",  "anthropomorphism", "Godspeed antropom.",     True),
    ("godspeed",  "likeability",      "Godspeed agrado",        True),
    ("godspeed",  "intelligence",     "Godspeed intelig.",      True),
    ("panas-sf",  "positiveAffect",   "PANAS afecto +",         True),
    ("panas-sf",  "negativeAffect",   "PANAS afecto -",         False),
]
# Ordered (key, label, higher?) used for the output table.
METRICS = (
    [(k, lbl, hi) for k, lbl, hi in TASK_METRICS]
    + [(f"{inst}.{score}", lbl, hi) for inst, score, lbl, hi in QUEST_METRICS]
)


def _quest_value(row, inst, score, condition, design):
    """Per-condition questionnaire score, handling crossover vs legacy columns."""
    if design == "crossover":
        return to_float(row.get(f"q_{inst}_{condition}_{score}"))
    # Legacy between-subjects: phase tag was "x" (godspeed/sus/nasa-tlx) or
    # "post" (pedsupport/panas-sf). Try both.
    for tag in ("x", "post"):
        v = to_float(row.get(f"q_{inst}_{tag}_{score}"))
        if v is not None:
            return v
    return None


def _cond_metrics(row, c, design):
    """Outcome + questionnaire metrics for one condition, from the per-condition
    aggregate columns (cond{A,B}_*) plus the condition's questionnaire battery."""
    m = {
        "resolved":  to_float(row.get(f"cond{c}_resolutionRate")),
        "turns":     to_float(row.get(f"cond{c}_turns")),
        "timeSec":   to_float(row.get(f"cond{c}_avgTimeSec")),
        "avgTtftMs": to_float(row.get(f"cond{c}_avgTtftMs")),
    }
    for inst, score, _lbl, _hi in QUEST_METRICS:
        m[f"{inst}.{score}"] = _quest_value(row, inst, score, c, design)
    return m


def observations(row):
    """Expand a participant row into per-condition observations.

    Crossover sessions contribute one observation per condition (both tasks of
    that condition aggregated + that condition's questionnaire battery).
    Between-subjects sessions contribute a single observation (their one
    condition). Both pool into the same A-vs-B comparison.
    """
    design = (row.get("design") or "between").strip() or "between"
    if design == "crossover":
        return [(c, _cond_metrics(row, c, design)) for c in ("A", "B")]
    c = row.get("condition")
    return [(c, _cond_metrics(row, c, design))]


def to_float(v):
    try:
        return float(v)
    except (ValueError, TypeError):
        return None


def mean(xs):
    return sum(xs) / len(xs) if xs else float("nan")


def sd(xs):
    if len(xs) < 2:
        return float("nan")
    m = mean(xs)
    return math.sqrt(sum((x - m) ** 2 for x in xs) / (len(xs) - 1))


def cliffs_delta(a, b):
    """Non-parametric effect size in [-1, 1]; |d|: .11 small, .28 medium, .43 large."""
    if not a or not b:
        return float("nan")
    gt = sum(1 for x in a for y in b if x > y)
    lt = sum(1 for x in a for y in b if x < y)
    return (gt - lt) / (len(a) * len(b))


def cohens_d(a, b):
    if len(a) < 2 or len(b) < 2:
        return float("nan")
    na, nb = len(a), len(b)
    sp2 = ((na - 1) * sd(a) ** 2 + (nb - 1) * sd(b) ** 2) / (na + nb - 2)
    if sp2 <= 0:
        return float("nan")
    return (mean(a) - mean(b)) / math.sqrt(sp2)


def fmt(x):
    return "  n/a" if x is None or (isinstance(x, float) and math.isnan(x)) else f"{x:7.2f}"


def main():
    path = sys.argv[1] if len(sys.argv) > 1 else None
    if not path:
        candidates = sorted(glob.glob("sessions-*.csv"), key=os.path.getmtime)
        if not candidates:
            sys.exit("No CSV given and no sessions-*.csv found. "
                     "Export from /admin first, then: python scripts/analyze.py <file.csv>")
        path = candidates[-1]
    print(f"# Analysis of {path}\n")

    with open(path, newline="", encoding="utf-8") as f:
        rows = list(csv.DictReader(f))

    # Exclude pilots; expand into per-condition observations (handles both the
    # within-subjects crossover and legacy between-subjects designs, pooled).
    rows = [r for r in rows if not str(r.get("sessionId", "")).upper().startswith("P-PILOT")]
    obs = [o for r in rows for o in observations(r)]
    A = [m for c, m in obs if c == "A"]
    B = [m for c, m in obs if c == "B"]
    n_cross = sum(1 for r in rows if (r.get("design") or "between") == "crossover")
    print(f"Participantes reales: {len(rows)} (crossover={n_cross}, entre-sujetos={len(rows)-n_cross})")
    print(f"Observaciones por condición: n(A)={len(A)}  n(B)={len(B)}\n")
    if not A or not B:
        print("Se necesitan datos en ambas condiciones para comparar.")
        return

    header = f"{'Métrica':28} {'A media(DE) n':>20} {'B media(DE) n':>20}"
    if HAVE_SCIPY:
        header += f" {'U p':>10} {'cliffΔ':>8} {'d':>7}"
    print(header)
    print("-" * len(header))

    for key, label, _higher in METRICS:
        a = [v for v in (m.get(key) for m in A) if v is not None]
        b = [v for v in (m.get(key) for m in B) if v is not None]
        cell_a = f"{fmt(mean(a))}({fmt(sd(a)).strip()}) {len(a)}" if a else "       — 0"
        cell_b = f"{fmt(mean(b))}({fmt(sd(b)).strip()}) {len(b)}" if b else "       — 0"
        line = f"{label:28} {cell_a:>20} {cell_b:>20}"
        if HAVE_SCIPY and len(a) >= 2 and len(b) >= 2:
            try:
                _, p = mannwhitneyu(a, b, alternative="two-sided")
                line += f" {p:10.3f} {cliffs_delta(a, b):8.2f} {cohens_d(a, b):7.2f}"
            except ValueError:
                line += f" {'—':>10} {'—':>8} {'—':>7}"
        print(line)

    if not HAVE_SCIPY:
        print("\n(Instala scipy para tests inferenciales: pip install scipy)")
    print("\nNota: con N pequeño, prioriza tamaños de efecto (cliffΔ/d) y la "
          "evidencia conductual + cualitativa sobre los valores p.")


if __name__ == "__main__":
    main()
