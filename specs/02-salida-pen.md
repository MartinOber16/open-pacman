# SPEC 02 — Salida determinista de los fantasmas encerrados en la pen

> **Estado:** Aprobado
> **Depende de:** SPEC 01
> **Fecha:** 2026-09-17
> **Objetivo:** Garantizar que los fantasmas que inician encerrados en la pen (brain en (13,14) y shy en (14,14)) salen por la puerta de forma determinista, escalonada y re-aplicada en cada reinicio de posiciones.

## Scope

**In:**

- Ruta forzada hacia la puerta para cualquier fantasma dentro de la región de la pen: acercarse a las columnas 13-14 y subir por la puerta hasta la fila 11.
- Retardo escalonado por fantasma (`brain` 60 frames, `shy` 120) antes de empezar a salir; durante la espera el fantasma queda congelado en su celda.
- El retardo y la ruta forzada se re-aplican en cada `resetPositions()` (pérdida de vida).
- La ruta forzada se mantiene activa siempre que un fantasma esté dentro de la pen (re-disparable), no solo tras el spawn.

**Fuera de alcance (futuros specs):**

- Animación o estado visual de "espera" dentro de la pen.
- Energizantes, modo asustado y ojos de regreso.
- Cambios a `MAZE` o a los spawns de SPEC 01.

## Data model

`game.js` — se extiende `GHOST_SPECS` con `release` (frames de espera dentro de la pen; 0 = sin espera):

```js
const GHOST_SPECS = {
	chaser: { speed: 1 / 8, color: '#ff0000', release: 0 },
	ambusher: { speed: 1 / 10, color: '#ffb8ff', release: 0 },
	brain: { speed: 1 / 9, color: '#00ffff', release: 60 },
	shy: { speed: 1 / 12, color: '#ffb852', release: 120 },
};
```

Objeto fantasma en `createGame()`: `{ x, y, dir, kind, speed, color, wait }`, con `wait = GHOST_SPECS[ kind ].release`.

Región de la pen y puerta (detección re-disparable, sin flags):

```js
function inPenExit(g) {
	if (g.x >= 11 && g.x <= 16 && g.y >= 13 && g.y <= 15) return true;
	return g.y === 12 && (g.x === 13 || g.x === 14);
}
```

## Implementation plan

1. `game.js`: añadir `release` a `GHOST_SPECS` y `wait` al fantasma en `createGame()`.
2. `game.js`: en `moveGhost()`, si `g.wait > 0` decrementar y no moverse (congelado).
3. `game.js`: en la decisión alineada de `moveGhost()`, si `inPenExit( g )` y `wait === 0`, forzar paso hacia la puerta (derecha/izquierda para llegar a cols 13-14, luego arriba) en lugar de `decideGhost()`.
4. `game.js`: `resetPositions()` reinicia `wait` desde `GHOST_SPECS[ kind ].release`.
5. Abrir `src/index.html` y comprobar los criterios de aceptación.

## Acceptance criteria

- [ ] El juego arranca sin errores de consola y con los 4 fantasmas en sus spawns.
- [ ] brain y shy permanecen congelados en (13,14) y (14,14) hasta cumplir su retardo (≈60 y ≈120 frames).
- [ ] brain y shy salen por la puerta (cols 13-14, fila 12) y alcanzan la fila 11.
- [ ] chaser y ambusher (que inician fuera) no esperan y su comportamiento no cambia.
- [ ] Tras perder una vida, brain y shy vuelven a la pen, se congelan y salen de nuevo respetando el retardo.
- [ ] Si un fantasma vuelve a entrar en la región de la pen, sale de nuevo por la ruta forzada (no queda errante dentro).
- [ ] Comer dots, las colisiones y ganar/perder funcionan como antes.
- [ ] El túnel de la fila 14 sigue envolviendo a los fantasmas.

## Decisions

- **Yes:** ruta forzada hacia la puerta. Determinista y simple; no toca la IA de persecución.
- **No:** arreglar el greedy dentro de la pen. El pasillo de salida es de 2 celdas; el greedy local no garantiza la salida.
- **Yes:** `release` por `kind` en `GHOST_SPECS` (brain 60, shy 120). Orden natural: el del medio sale primero.
- **Yes:** congelar en la celda durante la espera. Sin estados extra, visualmente claro.
- **No:** idle vertical en la pen. Añade estado sin ganancia funcional.
- **Yes:** detección por región re-disparable. El `resetPositions` vuelve a poner `wait`; la ruta se reactiva sola si un fantasma vuelve a entrar.

## Risks

| Riesgo                                                                                       | Mitigación                                                                                                                               |
| -------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| La ruta forzada solo decide en celdas alineadas; las velocidades pueden romper la alineación | Las velocidades siguen siendo `1/k` con k entero (SPEC 01); no cambian aquí                                                              |
| Fantasma que cruza la puerta y el greedy lo empuja de vuelta a la pen                        | Al alcanzar la fila 11 deja de estar en `inPenExit`; si reentra, la ruta forzada se redispara (sin histéresis, como el umbral del `shy`) |
| Retardos en frames con rAF de ~60fps no exacto                                               | Validación visual por comportamiento, no por tiempo real estricto                                                                        |

## What is **not** in this spec

- Estado visual / animación de espera en la pen.
- Energizantes, modo asustado y ojos de regreso.
- Modificación del laberinto (`MAZE`) o de los spawns.

Cada uno de esos, si llega, va en su propia spec.
