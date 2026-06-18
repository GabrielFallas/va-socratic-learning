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

# CSV columns (from export.ts sessionRow) → (human label, higher-is-better)
METRICS = [
    ("task1_resolved",            "T1 resuelta (0/1)",        True),
    ("task2_resolved",            "T2 resuelta (0/1)",        True),
    ("totalTurns",                "Turnos totales",           True),
    ("task1_timeSec",             "Tiempo T1 (s)",            False),
    ("task2_timeSec",             "Tiempo T2 (s)",            False),
    ("avgTtftMs",                 "TTFT medio (ms)",          False),
    ("pctTtftUnder1500",          "% TTFT < 1.5s",            True),
    ("avgThinkTimeMs",            "Think-time (ms)",          True),
    ("avgUserMsgWords",           "Palabras/mensaje",         True),
    ("voiceInputRatio",           "Ratio uso de voz",         True),
    ("q_sus_x_total",             "SUS (0-100)",              True),
    ("q_nasa-tlx_x_rawTlx",       "NASA-TLX (RTLX)",          False),
    ("q_pedsupport_post_total",   "Apoyo pedagógico (1-5)",   True),
    ("q_godspeed_x_overall",      "Godspeed global (1-5)",    True),
    ("q_godspeed_x_anthropomorphism", "Godspeed antropom.",   True),
    ("q_godspeed_x_likeability",  "Godspeed agrado",          True),
    ("q_godspeed_x_intelligence", "Godspeed intelig.",        True),
    ("q_panas-sf_post_positiveAffect", "PANAS afecto +",      True),
    ("q_panas-sf_post_negativeAffect", "PANAS afecto -",      False),
]


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

    # Exclude pilots; split by condition.
    rows = [r for r in rows if not str(r.get("sessionId", "")).upper().startswith("P-PILOT")]
    A = [r for r in rows if r.get("condition") == "A"]
    B = [r for r in rows if r.get("condition") == "B"]
    print(f"Participantes reales: n(A)={len(A)}  n(B)={len(B)}\n")
    if not A or not B:
        print("Se necesitan datos en ambas condiciones para comparar.")
        return

    header = f"{'Métrica':28} {'A media(DE) n':>20} {'B media(DE) n':>20}"
    if HAVE_SCIPY:
        header += f" {'U p':>10} {'cliffΔ':>8} {'d':>7}"
    print(header)
    print("-" * len(header))

    for col, label, _higher in METRICS:
        a = [v for v in (to_float(r.get(col)) for r in A) if v is not None]
        b = [v for v in (to_float(r.get(col)) for r in B) if v is not None]
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
