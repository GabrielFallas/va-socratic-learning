import type { Task } from "@/shared/types/session";

// ============================================================
// Debugging Tasks for the Experiment
// Slot 1: Infinite loop (beginner) — variants v1/v2
// Slot 2: Algorithm complexity (intermediate) — variants v1/v2
//
// Code (identifiers, comments, docstrings, program output) is written in
// English for consistency. The participant-facing UI text (title/description),
// the tutor-facing errorDescription, and the pass/fail feedback (`detail`)
// remain in Spanish to match the study language.
// ============================================================

export const TASKS: Task[] = [
  {
    id: "task-1-infinite-loop",
    title: "Tarea 1: Depuración de Bucle",
    description:
      "El siguiente programa debería imprimir los números del 1 al 5, pero parece que nunca termina. Encuentra y explica el problema lógico sin modificar el código todavía.",
    language: "python",
    buggyCode: `def print_numbers():
    counter = 1
    while counter <= 5:
        print(f"Number: {counter}")
        # Why does this never stop?

print_numbers()`,
    errorDescription:
      "El contador 'counter' nunca se incrementa dentro del bucle while. La condición 'counter <= 5' siempre es verdadera porque counter permanece en 1. La corrección sería añadir 'counter += 1' antes de cerrar el while.",
    maxTimeSeconds: 600, // 10 min
    tests: {
      // If the loop is unfixed, the student's module-level print_numbers() call
      // hangs and the worker is killed by the runner timeout (= not resolved).
      harness: `
import io, contextlib, json
def __run_tests():
    try:
        buf = io.StringIO()
        with contextlib.redirect_stdout(buf):
            print_numbers()
        lines = [l for l in buf.getvalue().splitlines() if l.strip()]
        expected = [f"Number: {i}" for i in range(1, 6)]
        if lines == expected:
            return True, "Imprime los números del 1 al 5 y termina correctamente."
        return False, f"La salida no coincide. Obtuvo {len(lines)} líneas: {lines[:8]}"
    except NameError:
        return False, "No se encontró la función print_numbers()."
    except Exception as ex:
        return False, f"Error: {ex}"
__p, __d = __run_tests()
print("__TESTS__" + json.dumps({"passed": __p, "detail": __d}))
`.trim(),
    },
  },
  {
    id: "task-2-algorithm-complexity",
    title: "Tarea 2: Optimización Algorítmica",
    description:
      "Este algoritmo de búsqueda funciona correctamente pero es muy lento para listas grandes. Identifica por qué es ineficiente y qué estructura de datos podría mejorar el rendimiento.",
    language: "python",
    buggyCode: `def find_duplicates(numbers):
    """Find duplicate numbers in a list."""
    duplicates = []
    for i in range(len(numbers)):
        for j in range(i + 1, len(numbers)):
            if numbers[i] == numbers[j]:
                if numbers[i] not in duplicates:
                    duplicates.append(numbers[i])
    return duplicates

# Test with a large list
import random
big_list = [random.randint(1, 1000) for _ in range(10000)]
result = find_duplicates(big_list)
print(f"Duplicates found: {len(result)}")`,
    errorDescription:
      "El algoritmo tiene complejidad O(n³) en el peor caso: dos bucles anidados O(n²) más la búsqueda 'not in duplicates' O(n). La solución óptima usa un set para tracking O(n) total: iterar una vez, agregar a seen_set, si ya existe agregar a duplicates_set. Complejidad O(n) tiempo y espacio.",
    maxTimeSeconds: 600, // 10 min
    tests: {
      // Correctness on small lists + a performance gate on a large list. An
      // un-optimized O(n^2) solution either times out on the student's own
      // 10000-element module-level call or fails the 1.5s/40000 perf check.
      harness: `
import random, time, json
def __ref(nums):
    seen = set(); dup = set()
    for x in nums:
        if x in seen: dup.add(x)
        else: seen.add(x)
    return dup
def __run_tests():
    try:
        for _ in range(25):
            n = [random.randint(1, 12) for _ in range(40)]
            if set(find_duplicates(n)) != __ref(n):
                return False, "Resultado incorrecto en una lista pequeña."
        big = [random.randint(1, 5000) for _ in range(40000)]
        t = time.time()
        res = find_duplicates(big)
        elapsed = time.time() - t
        if set(res) != __ref(big):
            return False, "Resultado incorrecto en la lista grande."
        if elapsed > 1.5:
            return False, f"Correcto pero demasiado lento: {elapsed*1000:.0f} ms en 40000 elementos."
        return True, f"Correcto y eficiente: {elapsed*1000:.0f} ms en 40000 elementos."
    except NameError:
        return False, "No se encontró la función find_duplicates()."
    except Exception as ex:
        return False, f"Error: {ex}"
__p, __d = __run_tests()
print("__TESTS__" + json.dumps({"passed": __p, "detail": __d}))
`.trim(),
    },
  },

  // ── Second variants (block 2 of the crossover) ─────────────────────────
  // Same construct and difficulty as v1, different instance, so a participant
  // never solves the identical problem twice across the two condition blocks
  // (removes the practice/recall confound). Variant is tied to block position,
  // and condition order is counterbalanced, so variant difficulty stays balanced
  // across conditions A and B.
  {
    id: "task-1b-infinite-loop",
    title: "Tarea 1: Depuración de Bucle",
    description:
      "Esta cuenta regresiva debería imprimir de 5 a 1 y luego «Liftoff!», pero nunca termina. Encuentra y explica el problema lógico sin modificar el código todavía.",
    language: "python",
    buggyCode: `def countdown(n):
    # Should print from n down to 1, then "Liftoff!"
    while n > 0:
        print(n)
        n += 1  # Why does it never reach 0?
    print("Liftoff!")

countdown(5)`,
    errorDescription:
      "El contador 'n' se incrementa ('n += 1') en lugar de decrementarse, por lo que la condición 'n > 0' siempre es verdadera y el bucle no termina. La corrección es 'n -= 1' para que la cuenta avance hacia 0.",
    maxTimeSeconds: 600,
    tests: {
      harness: `
import io, contextlib, json
def __run_tests():
    try:
        buf = io.StringIO()
        with contextlib.redirect_stdout(buf):
            countdown(5)
        lines = [l for l in buf.getvalue().splitlines() if l.strip()]
        expected = [str(i) for i in range(5, 0, -1)] + ["Liftoff!"]
        if lines == expected:
            return True, "Cuenta de 5 a 1 y despega correctamente."
        return False, f"La salida no coincide. Obtuvo {len(lines)} líneas: {lines[:8]}"
    except NameError:
        return False, "No se encontró la función countdown()."
    except Exception as ex:
        return False, f"Error: {ex}"
__p, __d = __run_tests()
print("__TESTS__" + json.dumps({"passed": __p, "detail": __d}))
`.trim(),
    },
  },
  {
    id: "task-2b-algorithm-complexity",
    title: "Tarea 2: Optimización Algorítmica",
    description:
      "Esta función comprueba si existen dos números que sumen un valor objetivo. Funciona, pero es muy lenta para listas grandes. Identifica por qué es ineficiente y qué estructura de datos podría mejorar el rendimiento.",
    language: "python",
    buggyCode: `def has_pair_with_sum(numbers, target):
    """Are there two numbers (at distinct positions) that add up to 'target'?"""
    for i in range(len(numbers)):
        for j in range(i + 1, len(numbers)):
            if numbers[i] + numbers[j] == target:
                return True
    return False

# Test with a large list
import random
big_list = [random.randint(1, 1000000) for _ in range(40000)]
print(has_pair_with_sum(big_list, 1500000))`,
    errorDescription:
      "Los dos bucles anidados dan complejidad O(n²). Se puede resolver en O(n) recorriendo una sola vez y guardando los números vistos en un set: para cada x, comprobar si (target - x) ya está en el set; si no, agregar x. Complejidad O(n) en tiempo.",
    maxTimeSeconds: 600,
    tests: {
      harness: `
import random, time, json
def __ref(nums, target):
    seen = set()
    for x in nums:
        if (target - x) in seen:
            return True
        seen.add(x)
    return False
def __run_tests():
    try:
        for _ in range(25):
            n = [random.randint(1, 20) for _ in range(40)]
            t = random.randint(2, 40)
            if has_pair_with_sum(n, t) != __ref(n, t):
                return False, "Resultado incorrecto en una lista pequeña."
        big = [random.randint(1, 1000000) for _ in range(40000)]
        target = 1500000
        t0 = time.time()
        res = has_pair_with_sum(big, target)
        elapsed = time.time() - t0
        if res != __ref(big, target):
            return False, "Resultado incorrecto en la lista grande."
        if elapsed > 1.5:
            return False, f"Correcto pero demasiado lento: {elapsed*1000:.0f} ms en 40000 elementos."
        return True, f"Correcto y eficiente: {elapsed*1000:.0f} ms en 40000 elementos."
    except NameError:
        return False, "No se encontró la función has_pair_with_sum()."
    except Exception as ex:
        return False, f"Error: {ex}"
__p, __d = __run_tests()
print("__TESTS__" + json.dumps({"passed": __p, "detail": __d}))
`.trim(),
    },
  },
];

export function getTaskById(id: string): Task | undefined {
  return TASKS.find((t) => t.id === id);
}
