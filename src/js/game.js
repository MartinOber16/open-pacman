// game.js
// Estado y reglas. Depende de globals de maze.js: MAZE, TUNNEL_ROW,
// PACMAN_START, GHOST_STARTS.

const DIRS = {
  left: { x: -1, y: 0 },
  right: { x: 1, y: 0 },
  up: { x: 0, y: -1 },
  down: { x: 0, y: 1 },
};
const OPPOSITE = { left: 'right', right: 'left', up: 'down', down: 'up' };

const PACMAN_SPEED = 0.125; // 1/8 celda/frame -> alinea cada 8 frames
const GHOST_SPEED = 0.1;    // 1/10 celda/frame

// Velocidad en celdas/frame. 1/k con k entero -> celda alineada cada k frames.
const GHOST_SPECS = {
  chaser:   { speed: 1 / 8,  color: '#ff0000', release: 0 },
  ambusher: { speed: 1 / 10, color: '#ffb8ff', release: 0 },
  brain:    { speed: 1 / 9,  color: '#00ffff', release: 60 },
  shy:      { speed: 1 / 12, color: '#ffb852', release: 120 },
};

// Crea una partida nueva. Copia MAZE (pristino) a game.grid para poder comer
// dots sin destruir el original, y reiniciar.
function createGame() {
  const grid = MAZE.map( ( row ) => row.slice() );
  // La celda de inicio de Pacman arranca sin dot.
  grid[ PACMAN_START.y ][ PACMAN_START.x ] = 0;

  let dots = 0;
  for ( const row of grid ) for ( const v of row ) if ( v === 2 ) dots++;

  return {
    state: 'start',
    score: 0,
    lives: 3,
    dotsRemaining: dots,
    grid,
    pacman: {
      x: PACMAN_START.x,
      y: PACMAN_START.y,
      dir: 'left',
      nextDir: null,
      speed: PACMAN_SPEED,
    },
    ghosts: GHOST_STARTS.map( ( g ) => ( {
      x: g.x,
      y: g.y,
      dir: 'up',
      kind: g.kind,
      speed: GHOST_SPECS[ g.kind ].speed,
      color: GHOST_SPECS[ g.kind ].color,
      wait: GHOST_SPECS[ g.kind ].release,
    } ) ),
  };
}

function aligned( v ) {
  return Math.abs( v - Math.round( v ) ) < 1e-3;
}

// Una celda es muro para el actor dado?
//   pacman: bloqueado por pared (1) y puerta (3)
//   ghost:  bloqueado solo por pared (1)
function isWall( grid, x, y, actor ) {
  if ( y < 0 || y >= grid.length ) return true;
  if ( x < 0 || x >= grid[ 0 ].length ) return true;
  const v = grid[ y ][ x ];
  if ( v === 1 ) return true;
  if ( v === 3 && actor === 'pacman' ) return true;
  return false;
}

// Puede el actor avanzar desde (x,y) en la direccion dir?
function canMove( grid, x, y, dir, actor ) {
  const d = DIRS[ dir ];
  if ( !d ) return false;
  const tx = x + d.x;
  const ty = y + d.y;
  // Tunel: salir por un borde en la fila del tunel siempre es valido.
  if ( ty === TUNNEL_ROW && ( tx < 0 || tx >= grid[ 0 ].length ) ) return true;
  return !isWall( grid, tx, ty, actor );
}

function wrapTunnel( a, width ) {
  if ( Math.round( a.y ) === TUNNEL_ROW ) {
    if ( a.x < 0 ) a.x += width;
    else if ( a.x >= width ) a.x -= width;
  }
}

function movePacman( game ) {
  const p = game.pacman;
  const grid = game.grid;
  const width = grid[ 0 ].length;

  if ( aligned( p.x ) && aligned( p.y ) ) {
    p.x = Math.round( p.x );
    p.y = Math.round( p.y );

    // Aplicar giro pendiente si es posible.
    if ( p.nextDir && canMove( grid, p.x, p.y, p.nextDir, 'pacman' ) ) {
      p.dir = p.nextDir;
      p.nextDir = null;
    }
    // Comer dot.
    if ( grid[ p.y ][ p.x ] === 2 ) {
      grid[ p.y ][ p.x ] = 0;
      game.score += 10;
      game.dotsRemaining--;
    }
    // Si no puede seguir, se detiene en la celda.
    if ( !canMove( grid, p.x, p.y, p.dir, 'pacman' ) ) return;
  }

  const d = DIRS[ p.dir ];
  p.x += d.x * p.speed;
  p.y += d.y * p.speed;
  wrapTunnel( p, width );
}

// Celda objetivo del fantasma segun su tipo. Entre las variantes clasicas:
//   chaser    -> celda de PacMan (greedy directo)
//   ambusher  -> 4 pasos delante de PacMan segun su dir (clamp al laberinto)
//   brain     -> P2 + (P2 - celda del chaser), con P2 = 2 delante de PacMan
//   shy       -> celda de PacMan (persigue solo si esta lejos; se filtra arriba)
function ghostTarget( game, g ) {
  const grid = game.grid;
  const p = game.pacman;
  const px = Math.round( p.x );
  const py = Math.round( p.y );
  const W = grid[ 0 ].length;
  const H = grid.length;

  let tx = px;
  let ty = py;
  const d = DIRS[ p.dir ];
  if ( g.kind === 'ambusher' ) {
    tx = px + d.x * 4;
    ty = py + d.y * 4;
  } else if ( g.kind === 'brain' ) {
    const p2x = px + d.x * 2;
    const p2y = py + d.y * 2;
    const chaser = game.ghosts.find( ( gh ) => gh.kind === 'chaser' );
    const cx = Math.round( chaser.x );
    const cy = Math.round( chaser.y );
    tx = p2x + ( p2x - cx );
    ty = p2y + ( p2y - cy );
  }
  tx = Math.max( 0, Math.min( W - 1, tx ) );
  ty = Math.max( 0, Math.min( H - 1, ty ) );
  return { tx, ty };
}

function decideGhost( game, g ) {
  const grid = game.grid;

  const options = Object.keys( DIRS ).filter(
    ( dir ) => dir !== OPPOSITE[ g.dir ] && canMove( grid, g.x, g.y, dir, 'ghost' )
  );
  // Sin salida (callejon): permitir el giro de 180.
  const choices = options.length ? options : [ '' + OPPOSITE[ g.dir ] ];

  // shy: errante aleatorio (sin U-turn) si PacMan esta a 8 o menos celdas.
  const distance =
    Math.abs( Math.round( g.x ) - Math.round( game.pacman.x ) ) +
    Math.abs( Math.round( g.y ) - Math.round( game.pacman.y ) );
  if ( g.kind === 'shy' && distance <= 8 ) {
    g.dir = choices[ Math.floor( Math.random() * choices.length ) ];
    return;
  }

  // Greedy manhattan hacia la celda objetivo del tipo.
  const { tx, ty } = ghostTarget( game, g );
  let best = choices[ 0 ];
  let bestDist = Infinity;
  for ( const dir of choices ) {
    const d = DIRS[ dir ];
    const nx = g.x + d.x;
    const ny = g.y + d.y;
    const dist = Math.abs( nx - tx ) + Math.abs( ny - ty );
    if ( dist < bestDist ) {
      bestDist = dist;
      best = dir;
    }
  }
  g.dir = best;
}

// Región de la pen (cols 11-16, filas 13-15) mas la puerta en si
// (cols 13-14, fila 12). Deteccion re-disparable, sin flags.
function inPenExit( g ) {
  if ( g.x >= 11 && g.x <= 16 && g.y >= 13 && g.y <= 15 ) return true;
  return g.y === 12 && ( g.x === 13 || g.x === 14 );
}

function moveGhost( game, g ) {
  const grid = game.grid;
  const width = grid[ 0 ].length;

  // Congelado en la celda durante el retardo de salida de la pen.
  if ( g.wait > 0 ) {
    g.wait--;
    return;
  }

  if ( aligned( g.x ) && aligned( g.y ) ) {
    g.x = Math.round( g.x );
    g.y = Math.round( g.y );
    if ( inPenExit( g ) && g.wait === 0 ) {
      // Ruta forzada hacia la puerta: acercarse a las cols 13-14 y subir.
      if ( g.y >= 13 ) {
        if ( g.x < 13 ) g.dir = 'right';
        else if ( g.x > 14 ) g.dir = 'left';
        else g.dir = 'up';
      } else {
        g.dir = 'up';
      }
    } else {
      decideGhost( game, g );
    }
    if ( !canMove( grid, g.x, g.y, g.dir, 'ghost' ) ) return;
  }

  const d = DIRS[ g.dir ];
  g.x += d.x * g.speed;
  g.y += d.y * g.speed;
  wrapTunnel( g, width );
}

function resetPositions( game ) {
  const p = game.pacman;
  p.x = PACMAN_START.x;
  p.y = PACMAN_START.y;
  p.dir = 'left';
  p.nextDir = null;
  game.ghosts.forEach( ( g, i ) => {
    g.x = GHOST_STARTS[ i ].x;
    g.y = GHOST_STARTS[ i ].y;
    g.dir = 'up';
    g.wait = GHOST_SPECS[ g.kind ].release;
  } );
}

function collides( a, b ) {
  return Math.abs( a.x - b.x ) < 0.5 && Math.abs( a.y - b.y ) < 0.5;
}

function update( game ) {
  movePacman( game );
  game.ghosts.forEach( ( g ) => moveGhost( game, g ) );

  for ( const g of game.ghosts ) {
    if ( collides( game.pacman, g ) ) {
      game.lives--;
      if ( game.lives <= 0 ) {
        game.state = 'lost';
        return;
      }
      resetPositions( game );
      break;
    }
  }

  if ( game.dotsRemaining <= 0 ) game.state = 'won';
}

window.createGame = createGame;
window.update = update;
window.DIRS = DIRS;
