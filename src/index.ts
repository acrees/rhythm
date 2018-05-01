function createShader(gl, type, source) {
  var shader = gl.createShader(type);
  gl.shaderSource(shader, source);
  gl.compileShader(shader);

  var success = gl.getShaderParameter(shader, gl.COMPILE_STATUS);
  if (success) {
    return shader;
  }
 
  console.log(gl.getShaderInfoLog(shader));
  gl.deleteShader(shader);
}

function createProgram(gl, vertexShader, fragmentShader) {
  var program = gl.createProgram();
  gl.attachShader(program, vertexShader);
  gl.attachShader(program, fragmentShader);
  gl.linkProgram(program);

  var success = gl.getProgramParameter(program, gl.LINK_STATUS);
  if (success) {
    return program;
  }
 
  console.log(gl.getProgramInfoLog(program));
  gl.deleteProgram(program);
}

function bufferSquare(gl, len) {
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
    0, 0,
    len, 0,
    len, len,
    0, 0,
    0, len,
    len, len
  ]), gl.STATIC_DRAW);
}

function drawTargets(gl, colorUniformLocation, translationUniformLocation, positionAttributeLocation, positionBuffer, targetBottomOffsetY) {
  var targetY = targetBottomOffsetY - 1; // bottom of clipspace is -1

  for (var i = 0; i < 4; i++) {
    gl.uniform4f(colorUniformLocation, 255, 255, 255, 0.25);
    gl.uniform2f(translationUniformLocation, -0.85 + (i * 0.5), targetY);

    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);

    bufferSquare(gl, 0.25);

    var size = 2;          // 2 components per iteration
    var type = gl.FLOAT;   // the data is 32bit floats
    var normalize = false; // don't normalize the data
    var stride = 0;        // 0 = move forward size * sizeof(type) each iteration to get the next position
    var offset = 0;        // start at the beginning of the buffer
    gl.vertexAttribPointer(positionAttributeLocation, size, type, normalize, stride, offset)

    var primitiveType = gl.TRIANGLES;
    var offset = 0;
    var count = 6;
    gl.drawArrays(primitiveType, offset, count);
  }
}

function drawNotes(gl, colorUniformLocation, translationUniformLocation, positionAttributeLocation, positionBuffer, notePositions, yDistancePerSecond, elapsedTime) {
  for (note of notePositions) {
    gl.uniform4f(colorUniformLocation, 0, 0, 255, 1);

    y = note.y - (elapsedTime / 1000 * yDistancePerSecond);
    gl.uniform2f(translationUniformLocation, note.x, y);

    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);

    bufferSquare(gl, 0.25);

    var size = 2;          // 2 components per iteration
    var type = gl.FLOAT;   // the data is 32bit floats
    var normalize = false; // don't normalize the data
    var stride = 0;        // 0 = move forward size * sizeof(type) each iteration to get the next position
    var offset = 0;        // start at the beginning of the buffer
    gl.vertexAttribPointer(positionAttributeLocation, size, type, normalize, stride, offset)

    var primitiveType = gl.TRIANGLES;
    var offset = 0;
    var count = 6;
    gl.drawArrays(primitiveType, offset, count);
  }
}


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

function main() {
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

  const canvas = document.querySelector("#gl-main");
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

  var vertexShaderSource = document.getElementById("vertex").text;
  var fragmentShaderSource = document.getElementById("fragment").text;
   
  var vertexShader = createShader(gl, gl.VERTEX_SHADER, vertexShaderSource);
  var fragmentShader = createShader(gl, gl.FRAGMENT_SHADER, fragmentShaderSource);

  var program = createProgram(gl, vertexShader, fragmentShader);

  gl.useProgram(program);

  var colorUniformLocation = gl.getUniformLocation(program, "u_color");
  var translationUniformLocation = gl.getUniformLocation(program, "u_translation");

  var positionAttributeLocation = gl.getAttribLocation(program, "a_position");
  var positionBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);

  gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
  gl.enableVertexAttribArray(positionAttributeLocation);

  gl.enable(gl.BLEND);
  gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

  var score = 0;
  var combo = 0;
  var ticks = 0;

  function updateCombo(result) {
    if (result.hit === 'perfect' || result.hit === 'great') {
      combo += 1;
    } else {
      combo = 0;
    }

    scoreNode.nodeValue = score;
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

    gl.clearColor(0.0, 0.0, 0.0, 1.0);
    gl.clear(gl.COLOR_BUFFER_BIT);

    drawTargets(gl, colorUniformLocation, translationUniformLocation, positionAttributeLocation, positionBuffer, targetY);
    drawNotes(gl, colorUniformLocation, translationUniformLocation, positionAttributeLocation, positionBuffer, notePositions, yDistancePerSecond, elapsed);

    requestAnimationFrame(tick);
  }

  requestAnimationFrame(tick);
}
