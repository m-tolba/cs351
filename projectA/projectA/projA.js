
// requirements
// atleast 2 dif rigid 3d parts more complex than a rectangle or cube(>12vertices), eachmade by drawing from contents of a Vertex Buffer Object (VBO).
// (HINT:Make your own drawing fcns, e.g.drawHexa(), drawRobot(), drawBicycle(),...)

// Rasterized per-vertex colors-everywhere: All vertices for all rigid 3D parts must be stored in the VBO
// all must include position attributes and RGB color attributes( Chapter 5)
// In each rigid 3D part, one or more triangles must have 3 obviously-different vertex colors (not just 2!). 
//  No colors change with position of the part or the assembly (e.g. no lighting effects!).

// Traveling Assembly: At least one entire assembly is not stationary –it ‘travels’ continuously on-screen w/o requiring any user interactions 
// (e.g; a butterfly continually moves among a set of flowers)

// Flexing/Spinning Joints: All joint-angles of atleast one assembly must continually change, keeping its rigid 3D parts moving smoothly and continually.
//  Joints may spin (e.g. always-growing rotation angle) or flex (rotation angle grows then shrinks cyclically) or move in other ways too.

// KINDS: Two or more obviously-different kinds of assemblies of rigid 3D parts.  Each kind has a different/dissimilar scene-graph shape(thus differentjointsequences); 
// each kinddrawseach of its rigid 3Dpartsusingdissimilarmatrix transforms(causingobviously different movements)
// and these movements are obviously notsynchronized (e.g. visibly different cycle times forperiodic movements).


// At least one kind of assembly must have two or more sequential, moving joints, with the two sequential joints at different 3D locations. 
// (e.g. robot head that turns, nods, and tilts is still just 1 joint; arm that rotates at shoulder and elbow is 2 joints at different 3D locations). 

// KeyboardInteraction: One or more on-screen part(s)or assembly(ies) changevisibly & obviouslyin response tovariouskeyboard inputs.

// Mouse-Drag Interaction: One or more on-screen part(s) or assembly(ies) make on-screen movements that match mouse-drag amounts. For example, translate an assembly by the amounts of mouse-drag (see ControlMulti starter code for rotate).



// -------------------------------------------------------vertex shader----------------------------------------------------------------
var VSHADER_SOURCE = 
  'uniform mat4 u_ModelMatrix;\n' +
  'attribute vec4 a_Position;\n' +
  'attribute vec4 a_Color;\n' +
  'varying vec4 v_Color;\n' +
  'void main() {\n' +
  '  gl_Position = u_ModelMatrix * a_Position;\n' +
  '  gl_PointSize = 10.0;\n' +
  '  v_Color = a_Color;\n' +
  '}\n';

// -------------------------------------------------------fragment shader----------------------------------------------------------------
var FSHADER_SOURCE = 
  'precision mediump float;\n' +
  'varying vec4 v_Color;\n' +
  'void main() {\n' +
  '  gl_FragColor = v_Color;\n' +
  '}\n';

// -------------------------------------------------------global vars---------------------------------------------------------------
//For WebGL
var gl;           // webGL Rendering Context. Set in main(), used everywhere.
var g_canvas = document.getElementById('webgl');     // our HTML-5 canvas object that uses 'gl' for drawing.
                  
// For tetrahedron & its matrix
var g_vertsMax = 0;                 // number of vertices held in the VBO 
var g_modelMatrix = new Matrix4();  // Construct 4x4 matrix; contents get sent to the GPU/Shaders as a 'uniform' var.
var g_modelMatLoc;                  // that uniform's location in the GPU

//For Animation
var g_isRun = true;                 // run/stop for animation; used in tick().
var g_lastMS = Date.now();    		// Timestamp for most-recently-drawn image in milliseconds; used by 'animate()' fcn 
                                    // (now called 'timerAll()' ) to find time
                                    // elapsed since last on-screen image.
var g_angle01 = 0;                  // initial rotation angle
var g_angle01Rate = 45.0;           // rotation speed, in degrees/second 

var g_angle02 = 0;                  // initial rotation angle
var g_angle02Rate = 40.0;           // rotation speed, in degrees/second 

//For mouse click-and-drag:
var g_isDrag=false;		// mouse-drag: true when user holds down mouse button
var g_xMclik=0.0;			// last mouse button-down position (in CVV coords)
var g_yMclik=0.0;   
var g_xMdragTot=0.0;	// total (accumulated) mouse-drag amounts (in CVV coords).
var g_yMdragTot=0.0; 
var g_digits=5;			// DIAGNOSTICS: # of digits to print in console.log (
									//    console.log('xVal:', xVal.toFixed(g_digits)); // print 5 digits
								 

// --------------------------------------------------------------------------------------------------------------------------------------------------

function main() {

  // Get gl, the rendering context for WebGL, from our 'g_canvas' object
  gl = getWebGLContext(g_canvas);
  if (!gl) {
    console.log('Failed to get the rendering context for WebGL');
    return;
  }

  // Initialize shaders
  if (!initShaders(gl, VSHADER_SOURCE, FSHADER_SOURCE)) {
    console.log('Failed to intialize shaders.');
    return;
  }

  // Initialize a Vertex Buffer in the graphics system to hold our vertices
  g_maxVerts = initVertexBuffer(gl);  
  if (g_maxVerts < 0) {
    console.log('Failed to set the vertex information');
    return;
  }

	// Register the Keyboard & Mouse Event-handlers------------------------------

  	// KEYBOARD:
  	// The 'keyDown' and 'keyUp' events respond to ALL keys on the keyboard
	window.addEventListener("keydown", myKeyDown, false);
	window.addEventListener("keyup", myKeyUp, false);

	// MOUSE:
	window.addEventListener("mousedown", myMouseDown); 
  	window.addEventListener("mousemove", myMouseMove); 
	window.addEventListener("mouseup", myMouseUp);	
	window.addEventListener("click", myMouseClick);				
	window.addEventListener("dblclick", myMouseDblClick);
	// END Keyboard & Mouse Event-Handlers---------------------------------------
	
  	// Specify the color for clearing <canvas>
  	gl.clearColor(0.3, 0.3, 0.3, 1.0);

	// Enable 3D depth-test when drawing: don't over-draw at any pixel unless new Z value is closer to the eye than the old one..
	// gl.depthFunc(gl.LESS); 
	gl.enable(gl.DEPTH_TEST);   
	gl.clearDepth(0.0); 
	gl.depthFunc(gl.GREATER); // draw a pixel only if its depth value is GREATER than the depth buffer's stored value.
	  

	var spinnyAngle = 0.0;
	
  	// Get handle to graphics system's storage location of u_ModelMatrix
  	g_modelMatLoc = gl.getUniformLocation(gl.program, 'u_ModelMatrix');
  	if (!g_modelMatLoc) { 
    	console.log('Failed to get the storage location of u_ModelMatrix');
    return;
  }

// ------------------------------------------------------------------------------------ANIMATION TEXT--------------------------------------------------------
  var tick = function() {
	// var now = Date.now();
	// spinnyAngle = animateSpin(spinnyAngle, now);
	// g_last = now;
	// animateSpin(spin);
    animate();   // Update the rotation angle
	drawAll();
    // drawAll(spinnyAngle, g_modelMatrix);   // Draw all parts
//    console.log('g_angle01=',g_angle01.toFixed(g_digits)); // put text in console.

	//Show some always-changing text in the webpage :  
	document.getElementById('CurAngleDisplay').innerHTML= 'g_angle01= '+g_angle01.toFixed(g_digits);
	//display our current mouse-dragging state:
	document.getElementById('Mouse').innerHTML= 'Mouse Drag totals (CVV coords):\t'+ g_xMdragTot.toFixed(5)+', \t'+g_yMdragTot.toFixed(g_digits);	
    requestAnimationFrame(tick, g_canvas);  // Request that the browser re-draw the webpage so webpage endlessly re-draw itself)
  };
  tick();							// start (and continue) animation: draw current image
	
}

// ========================================================================================VERTEX BUFFER======================================================================================
function initVertexBuffer() {

	var c30 = Math.sqrt(0.75);					// == cos(30deg) == sqrt(3) / 2
	var sq2	= Math.sqrt(2.0);						 

  	var colorShapes = new Float32Array([
  	// Vertex coordinates(x,y,z,w) and color (R,G,B) for a color tetrahedron:

	 //3d L
	//  //front 
	0.0 , 0.0, 0.0, 1.0, 	1.0, 0.0, 0.0,	// Node 2
	0.0, 1.0, 0.0, 1.0,  	0.0,0.28,0.73,	// Node 1
	0.25, 0.0, 0.0, 1.0, 	0.13,1.0,0.0,	// Node 3
	
	0.0, 1.0, 0.0, 1.0,  	0.0,0.28,0.73,	// Node 1
	0.25, 1.0, 0.0, 1.0, 	1.00,0.57,0.01,	// Node 7	
	0.25, 0.0, 0.0, 1.0, 	0.13,1.0,0.0,	// Node 3
	
	0.25, 0.0, 0.0, 1.0, 	0.13,1.0,0.0,	// Node 3
	0.25, 0.25, 0.0, 1.0, 	0.23,0.48,0.34,	// Node 6
	0.75, 0.0, 0.0, 1.0, 	0.40,0.50,1.00,	// Node 4

	0.25, 0.25, 0.0, 1.0, 	0.23,0.48,0.34,	// Node 6
	0.75, 0.25, 0.0, 1.0, 	0.95,0.61,0.73,	// Node 5
	0.75, 0.0, 0.0, 1.0, 	0.40,0.50,1.00,	// Node 4
	

	//right
	0.75, 0.25, 0.0, 1.0, 	0.95,0.61,0.73,	// Node 5
	0.75, 0.0, 0.0, 1.0, 	0.40,0.50,1.00,	// Node 4
	0.75, 0.0, -0.25, 1.0, 	1.00,0.40,0.40,	// Node 12

	0.75, 0.0, -0.25, 1.0, 	1.00,0.40,0.40,	// Node 12
	0.75, 0.25, 0.0, 1.0, 	0.95,0.61,0.73,	// Node 5
	0.75, 0.25, -0.25, 1.0, 	1.00,0.55,0.10,	// Node 13

	//Back
	0.75, 0.25, -0.25, 1.0, 	1.00,0.55,0.10,	// Node 13
	0.25, 0.25, -0.25, 1.0, 	1.00,0.70,0.70,	// Node 14
	0.75, 0.0, -0.25,  1.0,	1.00,0.40,0.40,		// Node 12

	0.75, 0.0, -0.25,  1.0,	11.00,0.40,0.40,		// Node 12
	0.25, 0.0, -0.25,  1.0,	1.00,0.85,0.70,// Node 11
	0.25, 0.25, -0.25, 1.0, 	1.0, 1.0, 1.0,	// Node 14
	
// //-----
	

	0.0, 1.0, -0.25, 1.0, 	0.40,1.00,0.40,	// Node 9
	0.0, 0.0, -0.25,  1.0,	0.70,1.00,1.00,	// Node 10
	0.25, 0.0, -0.25, 1.0, 	1.00,0.85,0.70,	// Node 11

	0.25, 0.0, -0.25, 1.0, 	1.00,0.85,0.70,	// Node 11
	0.0, 1.0, -0.25, 1.0, 	1.0, 1.0, 1.0,	// Node 9
	0.25, 1.0, -0.25,  1.0,	1.00,0.00,1.00,	// Node 8
	

	0.25, 0.0, -0.25, 1.0, 	1.00,0.85,0.70,// Node 11
	0.25, 0.25, -0.25, 1.0, 	1.00,0.70,0.70,		// Node 14
	0.75, 0.0, -0.25, 1.0, 	1.00,0.40,0.40,		// Node 12

	0.75, 0.0, -0.25,  1.0,	1.00,0.40,0.40,		// Node 12
	0.25, 0.25, -0.25, 1.0, 	1.0, 1.0, 1.0,// Node 14
	0.75, 0.25, -0.25, 1.0, 	1.00,0.55,0.10,	// Node 13
	

	//top
	0.0, 1.0, 0.0,  1.0, 	0.0,0.28,0.73,	// Node 1
	0.0, 1.0, -0.25, 1.0, 	0.40,1.00,0.40,	// Node 9
	0.25, 1.0, 0.0,  1.0,	1.00,0.57,0.01,	// Node 7

	0.25, 1.0, 0.0, 1.0, 	1.00,0.57,0.01,	// Node 7
	0.0, 1.0, -0.25, 1.0, 	0.40,1.00,0.40,	// Node 9
	0.25, 1.0, -0.25, 1.0, 	1.00,0.00,1.00,	// Node 8

	//right
	0.25, 1.0, 0.0, 1.0, 	1.00,0.57,0.01,	// Node 7
	0.25, 0.25, 0.0, 1.0, 	0.23,0.48,0.34,	// Node 6
	0.25, 0.25, -0.25, 1.0, 	1.00,0.70,0.70,	// Node 14

	0.25, 0.25, -0.25, 1.0, 	1.00,0.70,0.70,	// Node 14
	0.25, 1.0, 0.0, 1.0, 	1.00,0.57,0.01,	// Node 7
	0.25, 1.0, -0.25,  1.0,	1.00,0.00,1.00,	// Node 8
	

	//top
	0.25, 0.25, 0.0,  1.0,	0.23,0.48,0.34,	// Node 6
	0.25, 0.25, -0.25, 1.0, 	1.00,0.70,0.70,	// Node 14
	0.75, 0.25, 0.0, 1.0, 	0.95,0.61,0.73,	// Node 5

	0.75, 0.25, 0.0, 1.0, 	0.95,0.61,0.73,	// Node 5
	0.25, 0.25, -0.25,  1.0,	1.00,0.70,0.70,	// Node 14
	0.75, 0.25, -0.25, 1.0, 	1.00,0.55,0.10,	// Node 13
	
	//bottom
	0.75, 0.0, -0.25, 1.0, 	1.00,0.40,0.40,	// Node 12
	0.0, 0.0, -0.25, 1.0, 	0.70,1.00,1.00,	// Node 10
	0.75, 0.0, 0.0,  1.0,	0.40,0.50,1.00,	// Node 4

	0.75, 0.0, 0.0,  1.0,	0.40,0.50,1.00,	// Node 4
	0.0, 0.0, -0.25,  1.0,	0.70,1.00,1.00,	// Node 10
	0.0 , 0.0, 0.0,  1.0,	1.0, 0.0, 0.0,	// Node 2

	//left
	0.0 , 0.0, 0.0,  1.0,	1.0, 0.0, 0.0,	// Node 2
	0.0, 1.0, 0.0,  1.0, 	0.0,0.28,0.73,	// Node 1
	0.0, 0.0, -0.25,  1.0,	0.70,1.00,1.00,	// Node 10

	0.0, 0.0, -0.25,  1.0,	0.70,1.00,1.00,	// Node 10
	0.0, 1.0, 0.0, 1.0,  	0.0,0.28,0.73,	// Node 1
	0.0, 1.0, -0.25,  1.0,	0.40,1.00,0.40,	// Node 9

	//-------66

	//hexagonal pyramid
	-0.5, 0.0, 0.0,1.0, 	0.13,1.00,0.00, // Node 1
	0.5, 0.0, 0.0,  1.0,	1.00,0.55,0.10, // Node 2
	0.0, 2.0, -0.75,1.0, 	0.70,1.00,1.00, // Node 7

	0.0, 2.0, -0.75,1.0, 	0.70,1.00,1.00, // Node 7
	0.5, 0.0, 0.0,  1.0,	1.00,0.55,0.10, // Node 2
	1.0, 0.0, -0.75,1.0,  	0.40,1.00,0.40, // Node 3

	1.0, 0.0, -0.75,1.0,  	0.40,1.00,0.40, // Node 3
	0.0, 2.0, -0.75,1.0, 	0.70,1.00,1.00, // Node 7
	0.5, 0.0, -1.5, 1.0, 	0.23,0.48,0.34, // Node 4

	0.5, 0.0, -1.5, 1.0, 	0.23,0.48,0.34, // Node 4
	0.0, 2.0, -0.75,1.0, 	0.70,1.00,1.00, // Node 7
	-0.5, 0.0, -1.5, 1.0, 	1.00,0.40,0.40, // Node 5

	-0.5, 0.0, -1.5, 1.0, 	1.00,0.40,0.40, // Node 5
	0.0, 2.0, -0.75,1.0, 	0.70,1.00,1.00, // Node 7
	-1.0, 0.0, -0.75, 1.0,	1.00,0.93,0.00, // Node 6

	-1.0, 0.0, -0.75, 1.0,	1.00,0.93,0.00, // Node 6
	0.0, 2.0, -0.75,1.0, 	0.70,1.00,1.00, // Node 7
	-0.5, 0.0, 0.0,1.0, 	0.13,1.00,0.00, // Node 1

	//---18 (or 84)

//base of hexagonal pyramid
	-0.5, 0.0, 0.0,1.0, 	0.13,1.00,0.00, // Node 1
	-1.0, 0.0, -0.75, 1.0,	1.00,0.93,0.00, // Node 6
	-0.5, 0.0, -1.5, 1.0, 	1.00,0.40,0.40, // Node 5

	-0.5, 0.0, -1.5, 1.0, 	1.00,0.40,0.40, // Node 5
	0.5, 0.0, -1.5, 1.0, 	0.23,0.48,0.34, // Node 4
	-0.5, 0.0, 0.0,1.0, 	0.13,1.00,0.00, // Node 1

	-0.5, 0.0, 0.0,1.0, 	0.13,1.00,0.00, // Node 1
	0.5, 0.0, 0.0,  1.0,	1.00,0.55,0.10, // Node 2
	0.5, 0.0, -1.5, 1.0, 	0.23,0.48,0.34, // Node 4

	0.5, 0.0, -1.5, 1.0, 	0.23,0.48,0.34, // Node 4
	1.0, 0.0, -0.75,1.0,  	0.40,1.00,0.40, // Node 3
	0.5, 0.0, 0.0,  1.0,	1.00,0.55,0.10, // Node 2
 //-- 12 (96)-------------------------------------------------------------------------------

 //hexagonal prism

 	//side 1
	 -0.5, 2.0, 0.0, 1.0, 	0.00,0.28,0.73, // Node 1
	 -0.5, 0.0, 0.0, 1.0,		1.00,0.93,0.00, // Node 3
	 0.5, 0.0, 0.0, 1.0, 	0.13,1.00,0.00,// Node 4
 
	 -0.5, 2.0, 0.0, 1.0, 	0.00,0.28,0.73, // Node 1
	 0.5, 2.0, 0.0, 1.0	,	1.0, 0.0, 0.0,	// Node 2
	 0.5, 0.0, 0.0, 1.0, 	0.13,1.00,0.00,// Node 4
 
	 //side 2
	 0.5, 2.0, 0.0, 1.0,		1.0, 0.0, 0.0,	// Node 2
	 0.5, 0.0, 0.0, 1.0, 	0.13,1.00,0.00,// Node 4
	 1.0, 0.0, -0.75, 1.0, 	0.95,0.61,0.73, // Node 6
 
	 1.0, 0.0, -0.75, 1.0, 	0.95,0.61,0.73, // Node 6
	 0.5, 2.0, 0.0, 1.0	,	1.0, 0.0, 0.0,	// Node 2
	 1.0, 2.0, -0.75, 1.0, 	0.40,0.50,1.00, // Node 5
 
	 //side3
	 1.0, 2.0, -0.75, 1.0, 	0.40,0.50,1.00, // Node 5
	 1.0, 0.0, -0.75, 1.0, 	0.95,0.61,0.73, // Node 6
	 0.5, 0.0, -1.5, 1.0, 	1.00,0.57,0.01, // Node 8
 
	 0.5, 0.0, -1.5, 1.0, 	1.00,0.57,0.01, // Node 8
	 1.0, 2.0, -0.75, 1.0, 	0.40,0.50,1.00, // Node 5
	 0.5, 2.0, -1.5, 1.0, 	0.23,0.48,0.34, // Node 7
 // side 4
	 0.5, 2.0, -1.5, 1.0, 	0.23,0.48,0.34, // Node 7
	 0.5, 0.0, -1.5, 1.0, 	1.00,0.57,0.01, // Node 8
	 -0.5, 2.0, -1.5, 1.0, 	1.00,0.00,1.00, // Node 9
 
	 -0.5, 2.0, -1.5, 1.0, 	1.00,0.00,1.00, // Node 9
	 0.5, 0.0, -1.5, 1.0, 	1.00,0.57,0.01, // Node 8
	 -0.5, 0.0, -1.5, 1.0, 	0.40,1.00,0.40, // Node 10
 //side 5
	 -0.5, 0.0, -1.5, 1.0, 	0.40,1.00,0.40, // Node 10
	 -0.5, 2.0, -1.5, 1.0, 	1.00,0.00,1.00, // Node 9
	 -1.0, 2.0, -0.75, 1.0, 	0.70,1.00,1.00, // Node 11
 
	 -1.0, 2.0, -0.75, 1.0, 	0.70,1.00,1.00, // Node 11
	 -0.5, 0.0, -1.5, 1.0, 	0.40,1.00,0.40, // Node 10
	 -1.0, 0.0, -0.75, 1.0, 	1.00,0.85,0.70, // Node 12
 //side 6
	 -1.0, 0.0, -0.75, 1.0, 	1.00,0.85,0.70, // Node 12
	 -1.0, 2.0, -0.75, 1.0, 	0.70,1.00,1.00, // Node 11
	 -0.5, 0.0, 0.0, 1.0,		1.00,0.93,0.00, // Node 3
 
	 -0.5, 0.0, 0.0, 1.0,		1.00,0.93,0.00, // Node 3
	 -0.5, 2.0, 0.0, 1.0, 	0.00,0.28,0.73, // Node 1
	 -1.0, 2.0, -0.75, 1.0, 	0.70,1.00,1.00, // Node 11
 
	 //top
	 -1.0, 2.0, -0.75, 1.0, 	0.70,1.00,1.00, // Node 11
	 -0.5, 2.0, -1.5, 1.0, 	1.00,0.00,1.00, // Node 9
	 -0.5, 2.0, 0.0, 1.0, 	0.00,0.28,0.73, // Node 1
 
	 -0.5, 2.0, 0.0, 1.0, 	0.00,0.28,0.73, // Node 1
	 0.5, 2.0, 0.0, 1.0	,	1.0, 0.0, 0.0,	// Node 2
	 -0.5, 2.0, -1.5, 1.0, 	1.00,0.00,1.00, // Node 9
 
	 -0.5, 2.0, -1.5, 1.0, 	1.00,0.00,1.00, // Node 9
	 0.5, 2.0, -1.5, 1.0, 	0.23,0.48,0.34, // Node 7
	 0.5, 2.0, 0.0, 1.0	,	1.0, 0.0, 0.0,	// Node 2
 
	 0.5, 2.0, 0.0, 1.0	,	1.0, 0.0, 0.0,	// Node 2
	 1.0, 2.0, -0.75, 1.0, 	0.40,0.50,1.00, // Node 5
	 0.5, 2.0, -1.5, 1.0, 	0.23,0.48,0.34, // Node 7
	
		////// 48 vertices so total of 144

	//BOTTOM
	-1.0, 0.0, -0.75, 1.0, 	1.00,0.85,0.70, // Node 12
	-0.5, 0.0, -1.5, 1.0, 	0.40,1.00,0.40, // Node 10
	 -0.5, 0.0, 0.0, 1.0,		1.00,0.93,0.00, // Node 3
 
	 -0.5, 0.0, 0.0, 1.0,		1.00,0.93,0.00, // Node 3
	 0.5, 0.0, 0.0, 1.0, 	0.13,1.00,0.00,// Node 4
	 -0.5, 0.0, -1.5, 1.0, 	0.40,1.00,0.40, // Node 10

	-0.5, 0.0, -1.5, 1.0, 	0.40,1.00,0.40, // Node 10
	0.5, 0.0, -1.5, 1.0, 	1.00,0.57,0.01, // Node 8
	0.5, 0.0, 0.0, 1.0, 	0.13,1.00,0.00,// Node 4
 
	 0.5, 0.0, 0.0, 1.0, 	0.13,1.00,0.00,// Node 4
	 1.0, 0.0, -0.75, 1.0, 	0.95,0.61,0.73, // Node 6
	 0.5, 0.0, -1.5, 1.0, 	1.00,0.57,0.01, // Node 8

	 //60 VERT	

	 //----------------------------------------------------------------

	
	 //----------------------------------------------------------------

  ]);

  g_vertsMax = 156;		// 12 tetrahedron vertices. // we can also draw any subset of these we wish,such as the last 3 vertices.(onscreen at upper right)
	
  // Create buffer object
  var shapeBufferHandle = gl.createBuffer();  
  if (!shapeBufferHandle) {
	  console.log('Failed to create the shape buffer object');
	  return false;
  }

  // Bind buffer object to target:
  gl.bindBuffer(gl.ARRAY_BUFFER, shapeBufferHandle);

  // Transfer data from Javascript array colorShapes to Graphics system VBO
  gl.bufferData(gl.ARRAY_BUFFER, colorShapes, gl.STATIC_DRAW);

  var FSIZE = colorShapes.BYTES_PER_ELEMENT; // bytes per stored value
    
  //Get graphics system's handle for our Vertex Shader's position-input variable: 
  var a_Position = gl.getAttribLocation(gl.program, 'a_Position');
  if (a_Position < 0) {
    console.log('Failed to get the storage location of a_Position');
    return -1;
  }
  // Use handle to specify how to retrieve position data from our VBO:
  gl.vertexAttribPointer(
  		a_Position, 	// choose Vertex Shader attribute to fill with data
  		4, 						// how many values? 1,2,3 or 4.  (we're using x,y,z,w)
  		gl.FLOAT, 		// data type for each value: usually gl.FLOAT
  		false, 				// did we supply fixed-point data AND it needs normalizing?
  		FSIZE * 7, 		// Stride -- how many bytes used to store each vertex?
  									// (x,y,z,w, r,g,b) * bytes/value
  		0);						// Offset -- now many bytes from START of buffer to the
  									// value we will actually use?
  gl.enableVertexAttribArray(a_Position);  
  									// Enable assignment of vertex buffer object's position data

  // Get graphics system's handle for our Vertex Shader's color-input variable;
  var a_Color = gl.getAttribLocation(gl.program, 'a_Color');
  if(a_Color < 0) {
    console.log('Failed to get the storage location of a_Color');
    return -1;
  }
  // Use handle to specify how to retrieve color data from our VBO:
  gl.vertexAttribPointer(
  	a_Color, 				// choose Vertex Shader attribute to fill with data
  	3, 							// how many values? 1,2,3 or 4. (we're using R,G,B)
  	gl.FLOAT, 			// data type for each value: usually gl.FLOAT
  	false, 					// did we supply fixed-point data AND it needs normalizing?
  	FSIZE * 7, 			// Stride -- how many bytes used to store each vertex?
  									// (x,y,z,w, r,g,b) * bytes/value
  	FSIZE * 4);			// Offset -- how many bytes from START of buffer to the
  									// value we will actually use?  Need to skip over x,y,z,w
  									
  gl.enableVertexAttribArray(a_Color);  // Enable assignment of vertex buffer object's position data

	//--------------------------------DONE!
  
	// Unbind the buffer object 
 	gl.bindBuffer(gl.ARRAY_BUFFER, null);

}

//==============================================================================DRAW HELPERS!! ==========================================================================
function drawTetra(g_modelMatrix){
	//Use matrix to transform & draw 1st set of vertices stored in VBO:
	gl.uniformMatrix4fv(g_modelMatLoc, false, g_modelMatrix.elements);
	// Draw triangles: start at vertex 0 and draw 12 vertices
	gl.drawArrays(gl.TRIANGLES, 66, 30);
}

// function drawWedge(g_modelMatrix){
// 	// matrix used to transform +draw a dif. set of vertices in VBO
// 	gl.uniformMatrix4fv(g_modelMatLoc, false, g_modelMatrix.elements);
// 	// Draw last 2 triangles: start at vertex 6, draw 6 vertices
//   	gl.drawArrays(gl.TRIANGLES, 6,6);
// }

function drawPart1(g_modelMatrix){
	// matrix used to transform +draw a set of vertices in VBO
	gl.uniformMatrix4fv(g_modelMatLoc, false, g_modelMatrix.elements);
	gl.drawArrays(gl.TRIANGLES, 0,66);
}

function drawPart2(g_modelMatrix){
	// matrix used to transform +draw a set of vertices in VBO
	gl.uniformMatrix4fv(g_modelMatLoc, false, g_modelMatrix.elements);
	gl.drawArrays(gl.TRIANGLES, 96, 60);
}

function drawSet(g_modelMatrix){
	g_modelMatrix.setTranslate(0.4, 0.2, 0.0);
    g_modelMatrix.scale(0.15, 0.15, 0.15);
	var dist = Math.sqrt(g_xMdragTot*g_xMdragTot + g_yMdragTot*g_yMdragTot); // rotate on axis perpendicular to the mouse-drag direction:
	g_modelMatrix.rotate(dist*120.0, -g_yMdragTot+0.0001, g_xMdragTot+0.0001, 0.0);
	// gl.uniformMatrix4fv(g_modelMatLoc, false, g_modelMatrix.elements);
	drawPart2(g_modelMatrix);
	// pushMatrix(g_modelMatrix);
	// g_modelMatrix.translate(0.2, 2.5, 0.0);
	// var dist = Math.sqrt(g_xMdragTot*g_xMdragTot + g_yMdragTot*g_yMdragTot); // rotate on axis perpendicular to the mouse-drag direction:
	// g_modelMatrix.rotate(dist*120.0, -g_yMdragTot+0.0001, g_xMdragTot+0.0001, 0.0);
	// g_modelMatrix.rotate(g_angle02, 0, 1, 0);  // Make new drawing axes that
    // g_modelMatrix.rotate(-90, 0, 0, 1);
	// drawTetra(g_modelMatrix);
	// g_modelMatrix = popMatrix();
    // pushMatrix(g_modelMatrix);
	// g_modelMatrix.translate(0.2, -0.5, 0.0);
	// var dist = Math.sqrt(g_xMdragTot*g_xMdragTot + g_yMdragTot*g_yMdragTot); // rotate on axis perpendicular to the mouse-drag direction:
	// g_modelMatrix.rotate(dist*120.0, -g_yMdragTot+0.0001, g_xMdragTot+0.0001, 0.0);
	// g_modelMatrix.rotate(180, 0, 0, 1);
	// g_modelMatrix.rotate(g_angle01, 0, 1, 0);  // Make new drawing axes that
	// modelMatrix.rotate(currentAngle, 1, 1, 0);
	// drawTetra(g_modelMatrix);
	// var dist = Math.sqrt(g_xMdragTot*g_xMdragTot + g_yMdragTot*g_yMdragTot); // rotate on axis perpendicular to the mouse-drag direction:
	// g_modelMatrix.rotate(dist*120.0, -g_yMdragTot+0.0001, g_xMdragTot+0.0001, 0.0);
}

//==============================================================================DRAW ALL==========================================================================

// object 1 -- hexagonal cylinder with the hexagon pyramids stacked on top getting smaller and smaller
function drawCircus(gl, n, currentAngle, modelMatrix, u_ModelMatrix){

}

function drawAll() {
	// Clear <canvas>  colors AND the depth buffer
	gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
  
	clrColr = new Float32Array(4);
	clrColr = gl.getParameter(gl.COLOR_CLEAR_VALUE);
	
  //SPINNING TETRAHEDRON 
  g_modelMatrix.setTranslate(0.5,-1.0, 0.0);  // 'set' means DISCARD old matrix,
  						// (drawing axes centered in CVV), and then make new
  						// drawing axes moved to the lower-left corner of CVV. 
  g_modelMatrix.scale(1,1,-1); // convert to left-handed coord sys to match WebGL display canvas.
  g_modelMatrix.scale(0.3, 0.3, 0.3); //Ensures tetra stays inside CVV
  var dist = Math.sqrt(g_xMdragTot*g_xMdragTot + g_yMdragTot*g_yMdragTot); // rotate on axis perpendicular to the mouse-drag direction:
  g_modelMatrix.rotate(dist*120.0, -g_yMdragTot+0.0001, g_xMdragTot+0.0001, 0.0);
//   g_modelMatrix.rotate(g_angle01, 0, 1, 0);  // Make new drawing axes that
//   g_modelMatrix.rotate(g_angle02, 1, 0, 0);  // Make new drawing axes that

//   DRAW TETRA:
	drawTetra(g_modelMatrix);

//   // Make different drawing axes,
//   g_modelMatrix.setTranslate(0.4, 0.4, 0.0);  // 'set' = DISCARD old matrix,
//   g_modelMatrix.scale(1,1,-1); // convert to left-handed coord sys
//   g_modelMatrix.scale(0.3, 0.3, 0.3); // Make smaller.
  
//   // Mouse-Drag to rotat
//   var dist = Math.sqrt(g_xMdragTot*g_xMdragTot + g_yMdragTot*g_yMdragTot); // rotate on axis perpendicular to the mouse-drag direction:
//   g_modelMatrix.rotate(dist*120.0, -g_yMdragTot+0.0001, g_xMdragTot+0.0001, 0.0); //adding 0.001 to avoid divide by zero in cases where user didnt drag mouse

	// DRAW 2 TRIANGLES/ WEDGE:	
	// drawWedge(g_modelMatrix);

	//Make different drawing axes,
	g_modelMatrix.setTranslate(-0.5, -0.5, 0.0);  // 'set' = DISCARD old matrix,
	g_modelMatrix.scale(1,1,-1); // convert to left-handed coord sys
	g_modelMatrix.scale(0.6, 0.6, 0.6); // Make smaller.
	g_modelMatrix.rotate(-90, 0,0,1);
	  // Mouse-Drag to rotat
  var dist = Math.sqrt(g_xMdragTot*g_xMdragTot + g_yMdragTot*g_yMdragTot); // rotate on axis perpendicular to the mouse-drag direction:
  g_modelMatrix.rotate(dist*120.0, -g_yMdragTot+0.0001, g_xMdragTot+0.0001, 0.0); //adding 0.001 to avoid divide by zero in cases where user didnt drag mouse
	// g_modelMatrix.rotate(g_angle01, 0, 1, 0);  // Make new drawing axes that
	// g_modelMatrix.rotate(g_angle02, 1, 0, 0);  // Make new drawing axes that
	
	// DRAW PART 1 OF PROJ A
	drawPart1(g_modelMatrix);
	//DRAW PART 2 OF PROJ A

	g_modelMatrix.setTranslate(-0.4, 0.4, 0.0);  // 'set' = DISCARD old matrix,
	g_modelMatrix.scale(1,1,-1); // convert to left-handed coord sys
	g_modelMatrix.scale(0.2, 0.2, 0.2); // Make smaller.
	var dist = Math.sqrt(g_xMdragTot*g_xMdragTot + g_yMdragTot*g_yMdragTot); // rotate on axis perpendicular to the mouse-drag direction:
  g_modelMatrix.rotate(dist*120.0, -g_yMdragTot+0.0001, g_xMdragTot+0.0001, 0.0); //adding 0.001 to avoid divide by zero in cases where user didnt drag mouse
	// g_modelMatrix.rotate(g_angle01, 0, 1, 0);  // Make new drawing axes that
	// g_modelMatrix.rotate(g_angle02, 1, 0, 0);  // Make new drawing axes that
	drawPart2(g_modelMatrix);


	g_modelMatrix.setTranslate(0.4, 0.0, 0.0);
	var dist = Math.sqrt(g_xMdragTot*g_xMdragTot + g_yMdragTot*g_yMdragTot); // rotate on axis perpendicular to the mouse-drag direction:
  g_modelMatrix.rotate(dist*120.0, -g_yMdragTot+0.0001, g_xMdragTot+0.0001, 0.0); //adding 0.001 to avoid divide by zero in cases where user didnt drag mouse
	drawSet(g_modelMatrix)


}

// Last time that this function was called:  (used for animation timing)
var g_last = Date.now();

//============================================================================== ANIMATE FUNCTION ==========================================================================

function animate() {
	// Calculate the elapsed tim
	var now = Date.now();
	var elapsed = now - g_last;
	g_last = now;
  
  // Update the current rotation angle (adjusted by the elapsed time)
  //  limit the angle to move smoothly between +120 and -85 degrees:
//  if(angle >  120.0 && g_angle01Rate > 0) g_angle01Rate = -g_angle01Rate;
//  if(angle <  -85.0 && g_angle01Rate < 0) g_angle01Rate = -g_angle01Rate;
  
g_angle01max = 180.0;
  g_angle01min = 0.0;

  g_angle01 = g_angle01 + (g_angle01Rate * elapsed) / 1000.0;
  if(g_angle01 > 180.0) g_angle01 = g_angle01 - 360.0;
  if(g_angle01 <-180.0) g_angle01 = g_angle01 + 360.0;

	g_angle02 = g_angle02 + (g_angle02Rate * elapsed) / 1000.0;
  if(g_angle02 > 180.0) g_angle02 = g_angle02 - 360.0;
  if(g_angle02 <-180.0) g_angle02 = g_angle02 + 360.0;
  
  g_angle02max = 180.0;
  g_angle02min = 0.0;

  if(g_angle02 > g_angle02max && g_angle02Rate > 0) g_angle02Rate *= -1.0;
  if(g_angle02 < g_angle02min  && g_angle02Rate < 0) g_angle02Rate *= -1.0;

  if(g_angle01 > g_angle01max && g_angle01Rate > 0) g_angle01Rate *= -1.0;
  if(g_angle01 < g_angle01min  && g_angle01Rate < 0) g_angle01Rate *= -1.0;
 
}

function animateSpin(angle, now) {
    //==============================================================================
    // Calculate the elapsed time

    var elapsed = now - g_last;
	var newAngle = angle + (20.0 * elapsed) / 1000.0;
    return newAngle %= 360;
}


//==================HTML Button Callbacks======================

function angleSubmit() {
// Called when user presses 'Submit' button on our webpage
//		HOW? Look in HTML file (e.g. ControlMulti.html) to find
//	the HTML 'input' element with id='usrAngle'.  Within that
//	element you'll find a 'button' element that calls this fcn.

// Read HTML edit-box contents:
	var UsrTxt = document.getElementById('usrAngle').value;	
// Display what we read from the edit-box: use it to fill up
// the HTML 'div' element with id='editBoxOut':
  document.getElementById('EditBoxOut').innerHTML ='You Typed: '+UsrTxt;
  console.log('angleSubmit: UsrTxt:', UsrTxt); // print in console, and
  g_angle01 = parseFloat(UsrTxt);     // convert string to float number 
};

function clearDrag() {
// Called when user presses 'Clear' button in our webpage
	g_xMdragTot = 0.0;
	g_yMdragTot = 0.0;
}

function spinUp() {
// Called when user presses the 'Spin >>' button on our webpage.
// ?HOW? Look in the HTML file (e.g. ControlMulti.html) to find
// the HTML 'button' element with onclick='spinUp()'.
  g_angle01Rate += 25; 
}

function spinDown() {
// Called when user presses the 'Spin <<' button
 g_angle01Rate -= 25; 
}

function runStop() {
// Called when user presses the 'Run/Stop' button
  if(g_angle01Rate*g_angle01Rate > 1) {  // if nonzero rate,
    myTmp = g_angle01Rate;  // store the current rate,
    g_angle01Rate = 0;      // and set to zero.
  }
  else {    // but if rate is zero,
  	g_angle01Rate = myTmp;  // use the stored rate.
  }
}

//===================Mouse and Keyboard event-handling Callbacks

function myMouseDown(ev) {
//==============================================================================
// Called when user PRESSES down any mouse button;
// 									(Which button?    console.log('ev.button='+ev.button);   )
// 		ev.clientX, ev.clientY == mouse pointer location, but measured in webpage 
//		pixels: left-handed coords; UPPER left origin; Y increases DOWNWARDS (!)  

// Create right-handed 'pixel' coords with origin at WebGL canvas LOWER left;
  var rect = ev.target.getBoundingClientRect();	// get canvas corners in pixels
  var xp = ev.clientX - rect.left;									// x==0 at canvas left edge
  var yp = g_canvas.height - (ev.clientY - rect.top);	// y==0 at canvas bottom edge
//  console.log('myMouseDown(pixel coords): xp,yp=\t',xp,',\t',yp);
  
	// Convert to Canonical View Volume (CVV) coordinates too:
  var x = (xp - g_canvas.width/2)  / 		// move origin to center of canvas and
  						 (g_canvas.width/2);			// normalize canvas to -1 <= x < +1,
	var y = (yp - g_canvas.height/2) /		//										 -1 <= y < +1.
							 (g_canvas.height/2);
//	console.log('myMouseDown(CVV coords  ):  x, y=\t',x,',\t',y);
	
	g_isDrag = true;											// set our mouse-dragging flag
	g_xMclik = x;													// record where mouse-dragging began
	g_yMclik = y;
	// report on webpage
	document.getElementById('MouseAtResult').innerHTML = 
	  'Mouse At: '+x.toFixed(g_digits)+', '+y.toFixed(g_digits);
};


function myMouseMove(ev) {
//==============================================================================
// Called when user MOVES the mouse with a button already pressed down.
// 									(Which button?   console.log('ev.button='+ev.button);    )
// 		ev.clientX, ev.clientY == mouse pointer location, but measured in webpage 
//		pixels: left-handed coords; UPPER left origin; Y increases DOWNWARDS (!)  

	if(g_isDrag==false) return;				// IGNORE all mouse-moves except 'dragging'

	// Create right-handed 'pixel' coords with origin at WebGL canvas LOWER left;
  var rect = ev.target.getBoundingClientRect();	// get canvas corners in pixels
  var xp = ev.clientX - rect.left;									// x==0 at canvas left edge
	var yp = g_canvas.height - (ev.clientY - rect.top);	// y==0 at canvas bottom edge
//  console.log('myMouseMove(pixel coords): xp,yp=\t',xp,',\t',yp);
  
	// Convert to Canonical View Volume (CVV) coordinates too:
  var x = (xp - g_canvas.width/2)  / 		// move origin to center of canvas and
  						 (g_canvas.width/2);		// normalize canvas to -1 <= x < +1,
	var y = (yp - g_canvas.height/2) /		//									-1 <= y < +1.
							 (g_canvas.height/2);
//	console.log('myMouseMove(CVV coords  ):  x, y=\t',x,',\t',y);

	// find how far we dragged the mouse:
	g_xMdragTot += (x - g_xMclik);			// Accumulate change-in-mouse-position,&
	g_yMdragTot += (y - g_yMclik);
	// Report new mouse position & how far we moved on webpage:
	document.getElementById('MouseAtResult').innerHTML = 
	  'Mouse At: '+x.toFixed(g_digits)+', '+y.toFixed(g_digits);
	document.getElementById('MouseDragResult').innerHTML = 
	  'Mouse Drag: '+(x - g_xMclik).toFixed(g_digits)+', ' 
	  					  +(y - g_yMclik).toFixed(g_digits);

	g_xMclik = x;											// Make next drag-measurement from here.
	g_yMclik = y;
};

function myMouseUp(ev) {
//==============================================================================
// Called when user RELEASES mouse button pressed previously.
// 									(Which button?   console.log('ev.button='+ev.button);    )
// 		ev.clientX, ev.clientY == mouse pointer location, but measured in webpage 
//		pixels: left-handed coords; UPPER left origin; Y increases DOWNWARDS (!)  

// Create right-handed 'pixel' coords with origin at WebGL canvas LOWER left;
  var rect = ev.target.getBoundingClientRect();	// get canvas corners in pixels
  var xp = ev.clientX - rect.left;									// x==0 at canvas left edge
	var yp = g_canvas.height - (ev.clientY - rect.top);	// y==0 at canvas bottom edge
//  console.log('myMouseUp  (pixel coords):\n\t xp,yp=\t',xp,',\t',yp);
  
	// Convert to Canonical View Volume (CVV) coordinates too:
  var x = (xp - g_canvas.width/2)  / 		// move origin to center of canvas and
  						 (g_canvas.width/2);			// normalize canvas to -1 <= x < +1,
	var y = (yp - g_canvas.height/2) /		//										 -1 <= y < +1.
							 (g_canvas.height/2);
	console.log('myMouseUp  (CVV coords  ):\n\t x, y=\t',x,',\t',y);
	
	g_isDrag = false;											// CLEAR our mouse-dragging flag, and
	// accumulate any final bit of mouse-dragging we did:
	g_xMdragTot += (x - g_xMclik);
	g_yMdragTot += (y - g_yMclik);
	// Report new mouse position:
	document.getElementById('MouseAtResult').innerHTML = 
	  'Mouse At: '+x.toFixed(g_digits)+', '+y.toFixed(g_digits);
	console.log('myMouseUp: g_xMdragTot,g_yMdragTot =',
		g_xMdragTot.toFixed(g_digits),',\t',g_yMdragTot.toFixed(g_digits));
};

function myMouseClick(ev) {
//=============================================================================
// Called when user completes a mouse-button single-click event 
// (e.g. mouse-button pressed down, then released)
// 									   
//    WHICH button? try:  console.log('ev.button='+ev.button); 
// 		ev.clientX, ev.clientY == mouse pointer location, but measured in webpage 
//		pixels: left-handed coords; UPPER left origin; Y increases DOWNWARDS (!) 
//    See myMouseUp(), myMouseDown() for conversions to  CVV coordinates.

  // STUB
	console.log("myMouseClick() on button: ", ev.button); 
}	

function myMouseDblClick(ev) {
//=============================================================================
// Called when user completes a mouse-button double-click event 
// 									   
//    WHICH button? try:  console.log('ev.button='+ev.button); 
// 		ev.clientX, ev.clientY == mouse pointer location, but measured in webpage 
//		pixels: left-handed coords; UPPER left origin; Y increases DOWNWARDS (!) 
//    See myMouseUp(), myMouseDown() for conversions to  CVV coordinates.

  // STUB
	console.log("myMouse-DOUBLE-Click() on button: ", ev.button); 
}	

function myKeyDown(kev) {
//===============================================================================
// Called when user presses down ANY key on the keyboard;
//
// For a light, easy explanation of keyboard events in JavaScript,
// see:    http://www.kirupa.com/html5/keyboard_events_in_javascript.htm
// For a thorough explanation of a mess of JavaScript keyboard event handling,
// see:    http://javascript.info/tutorial/keyboard-events
//
// NOTE: Mozilla deprecated the 'keypress' event entirely, and in the
//        'keydown' event deprecated several read-only properties I used
//        previously, including kev.charCode, kev.keyCode. 
//        Revised 2/2019:  use kev.key and kev.code instead.
//
// Report EVERYTHING in console:
  console.log(  "--kev.code:",    kev.code,   "\t\t--kev.key:",     kev.key, 
              "\n--kev.ctrlKey:", kev.ctrlKey,  "\t--kev.shiftKey:",kev.shiftKey,
              "\n--kev.altKey:",  kev.altKey,   "\t--kev.metaKey:", kev.metaKey);

// and report EVERYTHING on webpage:
	document.getElementById('KeyDownResult').innerHTML = ''; // clear old results
  document.getElementById('KeyModResult' ).innerHTML = ''; 
  // key details:
  document.getElementById('KeyModResult' ).innerHTML = 
        "   --kev.code:"+kev.code   +"      --kev.key:"+kev.key+
    "<br>--kev.ctrlKey:"+kev.ctrlKey+" --kev.shiftKey:"+kev.shiftKey+
    "<br>--kev.altKey:"+kev.altKey +"  --kev.metaKey:"+kev.metaKey;
 
	switch(kev.code) {
		case "KeyP":
			console.log("Pause/unPause!\n");                // print on console,
			document.getElementById('KeyDownResult').innerHTML =  
			'myKeyDown() found p/P key. Pause/unPause!';   // print on webpage
			if(g_isRun==true) {
			  g_isRun = false;    // STOP animation
			  }
			else {
			  g_isRun = true;     // RESTART animation
			  tick();
			  }
			break;
		//------------------WASD navigation-----------------
		case "KeyA":
			console.log("a/A key: Strafe LEFT!\n");
			document.getElementById('KeyDownResult').innerHTML =  
			'myKeyDown() found a/A key. Strafe LEFT!';
			break;
    case "KeyD":
			console.log("d/D key: Strafe RIGHT!\n");
			document.getElementById('KeyDownResult').innerHTML = 
			'myKeyDown() found d/D key. Strafe RIGHT!';
			break;
		case "KeyS":
			console.log("s/S key: Move BACK!\n");
			document.getElementById('KeyDownResult').innerHTML = 
			'myKeyDown() found s/Sa key. Move BACK.';
			break;
		case "KeyW":
			console.log("w/W key: Move FWD!\n");
			document.getElementById('KeyDownResult').innerHTML =  
			'myKeyDown() found w/W key. Move FWD!';
			break;
		//----------------Arrow keys------------------------
		case "ArrowLeft": 	
			console.log(' left-arrow.');
			// and print on webpage in the <div> element with id='Result':
  		document.getElementById('KeyDownResult').innerHTML =
  			'myKeyDown(): Left Arrow='+kev.keyCode;
			break;
		case "ArrowRight":
			console.log('right-arrow.');
  		document.getElementById('KeyDownResult').innerHTML =
  			'myKeyDown():Right Arrow:keyCode='+kev.keyCode;
  		break;
		case "ArrowUp":		
			console.log('   up-arrow.');
  		document.getElementById('KeyDownResult').innerHTML =
  			'myKeyDown():   Up Arrow:keyCode='+kev.keyCode;
			break;
		case "ArrowDown":
			console.log(' down-arrow.');
  		document.getElementById('KeyDownResult').innerHTML =
  			'myKeyDown(): Down Arrow:keyCode='+kev.keyCode;
  		break;	
    default:
      console.log("UNUSED!");
  		document.getElementById('KeyDownResult').innerHTML =
  			'myKeyDown(): UNUSED!';
      break;
	}
}

function myKeyUp(kev) {
//===============================================================================
// Called when user releases ANY key on the keyboard; captures scancodes well

	console.log('myKeyUp()--keyCode='+kev.keyCode+' released.');
}
