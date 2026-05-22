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
  },
];

export function getTaskById(id: string): Task | undefined {
  return TASKS.find((t) => t.id === id);
}
