import Renderer from './renderer';



function calculatePositions(notes, yDistancePerSecond) {
  return notes
    .filter(n => !n.done)
    .map(n => {
      return {
        x: -0.85 + (n.column * 0.5),
        y: -0.75 + (n.ms / 1000 * yDistancePerSecond)
      };
    });
}

function scoreHit(maxScorePerHit, tolerances, note, elapsedTime) {
  var diff = Math.abs(note.ms - elapsedTime);

  if (diff < tolerances.perfect) return { hit: 'perfect', score: maxScorePerHit };
  if (diff < tolerances.great) return { hit: 'great', score: maxScorePerHit * 0.75 };
  if (diff < tolerances.good) return { hit: 'good', score: maxScorePerHit * 0.45 };
  if (diff < tolerances.bad) return { hit: 'bad', score: 0 };

  return { hit: 'none', score: 0 };
}

function nearestNote(notes, tolerances, elapsedTime, column) {
  var minTime = elapsedTime - tolerances.bad;

  return notes.filter(n => n.column === column
                           && n.ms >= minTime
                           && !n.done)
              .sort((a, b) => a.ms - b.ms)[0];
}

function checkForMissedNotes(notes, tolerances, elapsedTime) {
  var minTime = elapsedTime - tolerances.bad;

  var newlyMissedNotes = notes.filter(n => !n.done && n.ms < minTime)
  newlyMissedNotes.forEach(n => n.done = true);

  return newlyMissedNotes.length;
}

(<any>window).main = function main() {
  const maxScorePerHit = 100; // score per hit, for perfect hits, less for being a little off
  const targetY = 0.25; // offset of targets from bottom of canvas

  // this means notes clear the visible area in 5 seconds
  // yDistance = (clipspace size - y offset of targets) / 5 seconds
  const yDistancePerSecond = (2 - targetY) / 5;

  const tolerances = {
    perfect: 100,
    great: 200,
    good: 300,
    bad: 500
  }

  const notes = [
    { column: 0, ms: 4000 },
    { column: 1, ms: 5000 },
    { column: 2, ms: 7000 },
    { column: 3, ms: 8000 },

    { column: 3, ms: 10000 },
    { column: 2, ms: 11000 },
    { column: 1, ms: 13000 },
    { column: 0, ms: 14000 }
  ];

  const canvas = <HTMLCanvasElement>document.querySelector("#gl-main");
  const gl = canvas.getContext("webgl");

  if (!gl) {
    alert("Unable to initialize WebGL. Your browser or machine may not support it.");
    return;
  }

  var scoreElement = document.getElementById("score");
  var hitElement = document.getElementById("hit");
  var comboElement = document.getElementById("combo");

  var scoreNode = document.createTextNode("0");
  var hitNode = document.createTextNode("");
  var comboNode = document.createTextNode("");

  scoreElement.appendChild(scoreNode);
  hitElement.appendChild(hitNode);
  comboElement.appendChild(comboNode);

  var vertexShaderSource = (<HTMLScriptElement>document.getElementById("vertex")).text;
  var fragmentShaderSource = (<HTMLScriptElement>document.getElementById("fragment")).text;

  var renderer = new Renderer(gl, yDistancePerSecond, targetY, vertexShaderSource, fragmentShaderSource);

  var score = 0;
  var combo = 0;
  var ticks = 0;

  function updateCombo(result) {
    if (result.hit === 'perfect' || result.hit === 'great') {
      combo += 1;
    } else {
      combo = 0;
    }

    scoreNode.nodeValue = score.toString();
    hitNode.nodeValue = result.hit;

    if (combo === 0) {
      comboNode.nodeValue = "";
    } else {
      comboNode.nodeValue = combo + " combo";
    }
  }

  document.addEventListener('keydown', (e) => {
    console.log('HIT');

    var column = -1;
    if (e.key === 'd') column = 0;
    if (e.key === 'f') column = 1;
    if (e.key === 'j') column = 2;
    if (e.key === 'k') column = 3;

    if (column < 0) return;

    var note = nearestNote(notes, tolerances, elapsed, column);
    if (!note) return;

    var result = scoreHit(maxScorePerHit, tolerances, note, elapsed);
    if (result.hit == 'none') return;

    note.done = true;
    score += result.score;

    updateCombo(result);
  });

  var start = performance.now();
  var elapsed = 0;

  function tick(time) {
    elapsed = time - start;

    var hasMissed = checkForMissedNotes(notes, tolerances, elapsed);
    if (hasMissed) {
      updateCombo({ hit: 'miss' });
    }

    var notePositions = calculatePositions(notes, yDistancePerSecond);
    renderer.render(notePositions, elapsed);
    requestAnimationFrame(tick);
  }

  requestAnimationFrame(tick);
}
