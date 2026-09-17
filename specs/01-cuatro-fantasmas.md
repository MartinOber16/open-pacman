# SPEC 01 — Cuatro fantasmas con personalidades propias

> **Estado:** Aprobado
> **Depende de:** —
> **Fecha:** 2026-09-17
> **Objetivo:** Sustituir los 2 fantasmas actuales por 4, cada uno con comportamiento, velocidad y color propios, incluido un perseguidor agresivo de PacMan.

## Scope

**In:**

- 4 fantasmas con comportamientos clásicos distintos: `chaser` (perseguidor agresivo), `ambusher` (emboscador), `brain` (cerebro), `shy` (tímido).
- Velocidad propia por fantasma, todas expresables como `1/k` celdas/frame (k entero) para no romper `aligned()`.
- Posiciones iniciales 2+2: `(13,11)` y `(14,11)` encima de la pen, `(13,14)` y `(14,14)` dentro.
- Color propio por fantasma y usarlo en el render.

**Fuera de alcance (futuros specs):**

- Energizantes y modo "asustado" (fantasmas azules): cambian colisión, dots y rendering.
- Ojos que vuelven a la pen en modo asustado.
- Cambios al formato del laberinto (`MAZE` no se toca).

## Data model

`maze.js`:

```js
const GHOST_STARTS = [
  { x: 13, y: 11, kind: 'chaser' },
  { x: 14, y: 11, kind: 'ambusher' },
  { x: 13, y: 14, kind: 'brain' },
  { x: 14, y: 14, kind: 'shy' },
];
```

`game.js`:

```js
// Velocidad en celdas/frame. 1/k con k entero -> celda alineada cada k frames.
const GHOST_SPECS = {
  chaser:   { speed: 1 / 8,  color: '#ff0000' },
  ambusher: { speed: 1 / 10, color: '#ffb8ff' },
  brain:    { speed: 1 / 9,  color: '#00ffff' },
  shy:      { speed: 1 / 12, color: '#ffb852' },
};
```

Objeto fantasma en `createGame()`: `{ x, y, dir, kind, speed, color }`, tomando `speed` y `color` de `GHOST_SPECS[ kind ]`.

## Implementation plan

1. `maze.js`: sustituir `GHOST_STARTS` por las 4 entradas anteriores (renombra `hunter`/`random`).
2. `game.js`: añadir `GHOST_SPECS`; en `createGame()` rellenar `speed` y `color` del fantasma desde su `kind`.
3. `game.js`: reescribir `decideGhost()` por tipo de objetivo:
   - `chaser` → objetivo = celda redondeada de PacMan (reutiliza la lógica greedy de `hunter`).
   - `ambusher` → objetivo = celda 4 pasos delante de PacMan según `p.dir`, clamp al rango del laberinto.
   - `brain` → objetivo = `P2 + (P2 − celda del chaser)`, con `P2` = celda 2 delante de PacMan; greedy manhattan al objetivo.
   - `shy` → si distancia Manhattan a PacMan > 8: persigue como `chaser`; si ≤ 8: errante aleatorio (sin U-turn).
4. `render.js`: usar `g.color` del fantasma; retirar `GHOST_COLORS` y el fallback por índice.
5. Abrir `src/index.html` y comprobar los criterios de aceptación.

## Acceptance criteria

- [ ] Al abrir `src/index.html` arranca sin errores de consola y hay exactamente 4 fantasmas en el mapa.
- [ ] El `chaser` reduce su distancia Manhattan a PacMan en cada decisión (persecución agresiva).
- [ ] El `ambusher` apunta a la celda 4 delante de PacMan (visible persiguiéndolo por un pasillo recto).
- [ ] El `brain` apunta a un objetivo calculado con la posición del chaser, distinto del del chaser.
- [ ] El `shy` persigue a PacMan a más de 8 celdas y deja de seguir (errante) a 8 o menos.
- [ ] Los 4 fantasmas se ven con colores distintos.
- [ ] Las velocidades difieren entre fantasmas y el `chaser` es el más rápido.
- [ ] Los 2 fantasmas de `(13,11)`/`(14,11)` entran al mapa desde encima de la pen y los 2 de dentro salen por la puerta.
- [ ] Comer dots suma puntos, la colisión resta una vida y ganar/perder funcionan como antes.
- [ ] El túnel de la fila 14 sigue envolviendo a los fantasmas.

## Decisions

- **Yes:** los 4 comportamientos clásicos (`chaser`/`ambusher`/`brain`/`shy`). Fidelidad al original, set conocido y fácil de verificar.
- **No:** mezcla simple (`perseguidor`/`aleatorio`/`huidor`). Aprovecha menos la geometría del nivel.
- **Yes:** velocidad por fantasma (decisión del usuario); restricción técnica: todo speed = `1/k` con k entero para conservar la alineación de celdas que exige `aligned()`.
- **Yes:** spawns 2 fuera + 2 dentro. Imita las salidas de Blinky/Pinky (fuera) e Inky/Clyde (dentro).
- **No:** energizantes / modo asustado. Toca colisión, dots y rendering; merece spec propia.
- **No:** modificar `MAZE`. El laberinto sigue intacto.
- **Yes:** el color pasa a ser dato del fantasma (`GHOST_SPECS`) y render usa `g.color`, retirando `GHOST_COLORS`.

## Risks

| Riesgo | Mitigación |
| ------ | ---------- |
| Velocidad no expresable como `1/k` rompe los giros (`aligned()` no alcanza enteros) | `GHOST_SPECS` solo admite `1/k` con k entero; documentado en el propio objeto |
| Objetivo del `ambusher` cae fuera del laberinto (PacMan cerca del borde) | Clamp de coordenadas al rango de `grid` |
| Oscilación del `shy` en el umbral de 8 celdas | El umbral se evalúa en cada decisión; al errar se aleja y vuelve a perseguir, sin histéresis necesaria |

## What is **not** in this spec

- Energizantes, modo asustado y ojos de regreso a la pen.
- Cambios de colisión más allá de lo actual (cualquier contacto = −1 vida).
- Modificación del laberinto (`MAZE`).

Cada uno de esos, si llega, va en su propia spec.