# Artículo Académico (Entregable 3) — Fuente LaTeX

Plantilla **IEEE conference** (`IEEEtran`) para el artículo del Entregable 3 de PF-3311.

## Archivos
- `main.tex` — documento principal con todas las secciones requeridas por el guideline
  (título/autores, abstract, introducción, trabajos relacionados, desarrollo del agente,
  metodología, resultados, análisis y discusión, conclusiones + trabajo futuro + proyección de
  publicación, referencias).
- `references.bib` — bibliografía (21 entradas: ≥15 fuentes del estado del arte + instrumentos
  y teoría de base).
- `figures/` — capturas del sistema (condiciones A y B, verificación con Pyodide).

## Marcadores pendientes
Los lugares que requieren los **datos reales del estudio** están marcados en rojo con
`\todo{...}` (resultados numéricos, n de la muestra, categorías cualitativas, conclusiones y la
declaración de proyección de publicación). Todo lo demás (intro, related work, arquitectura,
metodología, referencias) está redactado.

## Compilar

### Opción A — Overleaf (recomendada)
Sube la carpeta `paper/` a un proyecto nuevo en [Overleaf](https://www.overleaf.com) y compila
`main.tex` (compilador pdfLaTeX). Overleaf resuelve BibTeX automáticamente.

### Opción B — Local
Requiere una distribución TeX (TeX Live / MiKTeX):
```bash
cd paper
latexmk -pdf main.tex      # ejecuta pdflatex + bibtex las veces necesarias
# o, manualmente:
# pdflatex main && bibtex main && pdflatex main && pdflatex main
```
El resultado es `main.pdf`. Enlázalo desde el README del repositorio.

## Notas
- El idioma es español (`babel`). Revisa la ortografía antes de la entrega (el guideline rebaja
  0.25 pts por falta).
- No incluyas datos personales identificables de participantes (solo identificadores anónimos).
