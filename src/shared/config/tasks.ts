import type { Task } from "@/shared/types/session";

// ============================================================
// Debugging Tasks for the Experiment
// Task 1: Infinite loop (beginner)
// Task 2: Algorithm complexity (intermediate)
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
        print(f"Número: {counter}")
        # ¿Por qué nunca termina?

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
        expected = [f"Número: {i}" for i in range(1, 6)]
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
    """Encuentra números duplicados en una lista."""
    duplicates = []
    for i in range(len(numbers)):
        for j in range(i + 1, len(numbers)):
            if numbers[i] == numbers[j]:
                if numbers[i] not in duplicates:
                    duplicates.append(numbers[i])
    return duplicates

# Test con lista grande
import random
big_list = [random.randint(1, 1000) for _ in range(10000)]
result = find_duplicates(big_list)
print(f"Duplicados encontrados: {len(result)}")`,
    errorDescription:
      "El algoritmo tiene complejidad O(n³) en el peor caso: dos bucles anidados O(n²) más la búsqueda 'not in duplicates' O(n). La solución óptima usa un set para tracking O(n) total: iterar una vez, agregar a seen_set, si ya existe agregar a duplicates_set. Complejidad O(n) tiempo y espacio.",
    maxTimeSeconds: 600, // 10 min
    tests: {
      // Correctness on small lists + a performance gate on a large list. An
      // un-optimized O(n²) solution either times out on the student's own
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
];

export function getTaskById(id: string): Task | undefined {
  return TASKS.find((t) => t.id === id);
}
