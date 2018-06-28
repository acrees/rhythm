import { createShader, createProgram } from './gl'

export default class Renderer {
  constructor(private gl:WebGLRenderingContext, private yDistancePerSecond, private targetY, vertexShaderSource:string, fragmentShaderSource:string) {
    let program = this.createProgram(vertexShaderSource, fragmentShaderSource);
    this.gl.useProgram(program);

    this.colorUniformLocation = gl.getUniformLocation(program, "u_color");
    this.translationUniformLocation = gl.getUniformLocation(program, "u_translation");

    this.positionAttributeLocation = gl.getAttribLocation(program, "a_position");
    this.positionBuffer = gl.createBuffer();

    this.init();
  }

  render(notePositions, elapsed:number) {
    this.gl.clearColor(0.0, 0.0, 0.0, 1.0);
    this.gl.clear(this.gl.COLOR_BUFFER_BIT);

    this.drawTargets();
    this.drawNotes(notePositions, elapsed);
  }

  private bufferSquare(len:number) {
    this.gl.bufferData(this.gl.ARRAY_BUFFER, new Float32Array([
      0, 0,
      len, 0,
      len, len,
      0, 0,
      0, len,
      len, len
    ]), this.gl.STATIC_DRAW);
  }

  private drawTargets() {
    let yPos = this.targetY - 1; // bottom of clipspace is -1

    for (var i = 0; i < 4; i++) {
      this.gl.uniform4f(this.colorUniformLocation, 255, 255, 255, 0.25);
      this.gl.uniform2f(this.translationUniformLocation, -0.85 + (i * 0.5), yPos);

      this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.positionBuffer);

      this.bufferSquare(0.25);

      var size = 2;          // 2 components per iteration
      var type = this.gl.FLOAT;   // the data is 32bit floats
      var normalize = false; // don't normalize the data
      var stride = 0;        // 0 = move forward size * sizeof(type) each iteration to get the next position
      var offset = 0;        // start at the beginning of the buffer
      this.gl.vertexAttribPointer(this.positionAttributeLocation, size, type, normalize, stride, offset)

      var primitiveType = this.gl.TRIANGLES;
      var offset = 0;
      var count = 6;
      this.gl.drawArrays(primitiveType, offset, count);
    }
  }

  private drawNotes(notePositions, elapsedTime:number) {
    for (var note of notePositions) {
      this.gl.uniform4f(this.colorUniformLocation, 0, 0, 255, 1);

      var y = note.y - (elapsedTime / 1000 * this.yDistancePerSecond);
      this.gl.uniform2f(this.translationUniformLocation, note.x, y);

      this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.positionBuffer);

      this.bufferSquare(0.25);

      var size = 2;          // 2 components per iteration
      var type = this.gl.FLOAT;   // the data is 32bit floats
      var normalize = false; // don't normalize the data
      var stride = 0;        // 0 = move forward size * sizeof(type) each iteration to get the next position
      var offset = 0;        // start at the beginning of the buffer
      this.gl.vertexAttribPointer(this.positionAttributeLocation, size, type, normalize, stride, offset)

      var primitiveType = this.gl.TRIANGLES;
      var offset = 0;
      var count = 6;
      this.gl.drawArrays(primitiveType, offset, count);
    }
  }

  private createProgram(vertexShaderSource:string, fragmentShaderSource: string) {
    var vertexShader = createShader(this.gl, this.gl.VERTEX_SHADER, vertexShaderSource);
    var fragmentShader = createShader(this.gl, this.gl.FRAGMENT_SHADER, fragmentShaderSource);
    return createProgram(this.gl, vertexShader, fragmentShader);
  }

  private init() {
    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.positionBuffer);

    this.gl.viewport(0, 0, this.gl.canvas.width, this.gl.canvas.height);
    this.gl.enableVertexAttribArray(this.positionAttributeLocation);

    this.gl.enable(this.gl.BLEND);
    this.gl.blendFunc(this.gl.SRC_ALPHA, this.gl.ONE_MINUS_SRC_ALPHA);
  }

  private colorUniformLocation: WebGLUniformLocation;
  private translationUniformLocation: WebGLUniformLocation;
  private positionAttributeLocation: number;
  private positionBuffer: WebGLBuffer;
}