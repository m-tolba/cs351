// User instructions
// Two canvases side by side
// Full screen width, 70% height
// Keyboard controls for camera direction (rotate L, R, tilt up, down) [w,a,s,d]
// Different keyboard controls to move camera forward, backward, side to side(w/o changing camera’s direction) [arrow keys]
// Grid floor plane in x,y directions. 
// World-space +z points UP
//  At least 1 animated assembly
// With at least THREE joints
// At least 4 parts connected sequentially by joints (p1 to p2 to p3 ….. NOT p1 to (p2, p3, p4, p5) all separately and on different joints on p1)
// Joints animated
// Joints can be controlled by user interaction
// 3D axes drawn on world (red = x, green = y, blue = z)
// At least 2 3D axis drawn on different joints


// -------------------------------------------------------vertex shader----------------------------------------------------------------
var VSHADER_SOURCE = `
  attribute vec4 a_Position;
  attribute vec4 a_Color; 
  attribute vec4 a_Normal; 

  uniform mat4 u_ViewMatrix; 
  uniform mat4 u_NormalMatrix; 

  varying vec4 v_Color; 

  uniform mat4 u_ProjMatrix; 

  void main() { 
    gl_Position = u_ProjMatrix * u_ViewMatrix * a_Position; 
    vec3 normal = normalize(vec3(u_NormalMatrix*a_Normal)); 
    v_Color = a_Color;
  }`;

// -------------------------------------------------------fragment shader----------------------------------------------------------------
var FSHADER_SOURCE = `
  #ifdef GL_ES 
  precision mediump float; 
  #endif 
  varying vec4 v_Color; 
  void main() { 
    gl_FragColor = v_Color; 
  }`;

// ----------------------------------------------------------global vars---------------------------------------------------------------

var floatsPerVertex = 9;  // # of Float32Array elements used for each vertex

//Rotation steps
var ANGLE_STEP = 45.0;


var g_last = 0.0;


var camX = 0, camY = 6, camZ = 3.00;

var moveX = 0.0, moveY = 0.0, moveZ = 0.0;

//increase step size for turning up and down on camera direction angle 
// increase sttep sixe for moving camera l,r, up and down.
currentAngle = 0.0;


var theta = 0;

flag = -1;

var viewMatrix = new Matrix4();
var projMatrix = new Matrix4();

var qNew = new Quaternion(0,0,0,1); // mouse drag rotation
var qcurr = new Quaternion(0,0,0,1); // curr orientation 
var quatMatrix = new Matrix4();     // rotation matrix, from qcurr
var g_isDrag=false;		// mouse-drag: true when user holds down mouse button
var g_xMclik=0.0;			// last mouse button-down position (in CVV coords)
var g_yMclik=0.0;   
var g_xMdragTot=0.0;	// total (accumulated) mouse-drag amounts (in CVV coords).
var g_yMdragTot=0.0; 
var r = 1;
var g = 1;
var b = 1;


// ---------------------------------------------------------MAIN-----------------------------------------------------------------------------------------


function main() {

    // Retrieve <canvas> element
    var canvas = document.getElementById('webgl');
    canvas.width = innerWidth;
    canvas.height = innerWidth * 0.70 / 2;

    // Get the rendering context for WebGL
    var gl = getWebGLContext(canvas);
    if (!gl) {
        console.log('Failed to get the rendering context for WebGL');
        return;
    }

    // Initialize shaders
    if (!initShaders(gl, VSHADER_SOURCE, FSHADER_SOURCE)) {
        console.log('Failed to intialize shaders.');
        return;
    }

    //  gl.depthFunc(gl.LESS);       // WebGL default setting:
    gl.enable(gl.DEPTH_TEST);

    // Set the vertex coordinates and color (the blue triangle is in the front)
    var n = initVertexBuffers(gl);

    if (n < 0) {
        console.log('Failed to specify the vertex information');
        return;
    }

    // Specify the color for clearing <canvas>
    gl.clearColor(0.0, 0.0, 0.0, 1);

    // Get the graphics system storage locations of
    // the uniform variables u_ViewMatrix and u_ProjMatrix.
    var u_ViewMatrix = gl.getUniformLocation(gl.program, 'u_ViewMatrix');
    var u_ProjMatrix = gl.getUniformLocation(gl.program, 'u_ProjMatrix');
    var u_NormalMatrix = gl.getUniformLocation(gl.program, 'u_NormalMatrix');


    if (!u_ViewMatrix || !u_ProjMatrix) {
        console.log('Failed to get u_ViewMatrix or u_ProjMatrix');
        return;
    }


    // Create a JavaScript matrix to specify the view transformation
    var viewMatrix = new Matrix4();
    var projMatrix = new Matrix4();
    var normalMatrix = new Matrix4();

    


    window.addEventListener("keydown", myKeyDown, false);
    window.addEventListener("keyup", myKeyUp, false);
    window.addEventListener("keypress", myKeyPress, false);

 var currentAngle = 0.0; // Current rotation angle

    // -------------------------------------------------------tick function----------------------------------------------------------------
    var tick = function () {
        canvas.width = innerWidth;
        canvas.height = innerWidth * 0.75 / 2;
        initVertexBuffers(gl);
        var now = Date.now();
        currentAngle = animate(currentAngle);  // Update the rotation angle

    //    xangle = varyAngle(xangle);
        g_last = now;

        draw(gl, currentAngle, u_ViewMatrix, viewMatrix, u_ProjMatrix, projMatrix, canvas, u_NormalMatrix, normalMatrix);   
        requestAnimationFrame(tick, canvas); // Request that the browser re-draw the webpage
    };
    tick();
}

    // -------------------------------------------------------MAKE GROUND GRID----------------------------------------------------------------
    function makeGroundGrid() {
        //==============================================================================
        // Create a list of vertices that create a large grid of lines in the x,y plane
        // centered at x=y=z=0.  Draw this shape using the GL_LINES primitive.

        var xcount = 100;     // # of lines to draw in x,y to make the grid.
        var ycount = 100;
        var xymax = 100.0;     // grid size; extends to cover +/-xymax in x and y.
        var xColr = new Float32Array([1, 1, 0]);  
        var yColr = new Float32Array([0, 1, 0]);  

        // Create an (global) array to hold this ground-plane's vertices:
        gndVerts = new Float32Array(floatsPerVertex * 2 * (xcount + ycount));
        // draw a grid made of xcount+ycount lines; 2 vertices per line.

        var xgap = xymax / (xcount - 1);    // HALF-spacing between lines in x,y;
        var ygap = xymax / (ycount - 1);    // (why half? because v==(0line number/2))

        // First, step thru x values as we make vertical lines of constant-x:
        for (v = 0, j = 0; v < 2 * xcount; v++, j += floatsPerVertex) {
            if (v % 2 == 0) {  // put even-numbered vertices at (xnow, -xymax, 0)
                gndVerts[j] = -xymax + (v) * xgap;  // x
                gndVerts[j + 1] = -xymax;               // y
                gndVerts[j + 2] = 0.0;                  // z
            }
            else {        // put odd-numbered vertices at (xnow, +xymax, 0).
                gndVerts[j] = -xymax + (v - 1) * xgap;  // x
                gndVerts[j + 1] = xymax;                // y
                gndVerts[j + 2] = 0.0;                  // z
            }
            gndVerts[j + 3] = xColr[0];     // red
            gndVerts[j + 4] = xColr[1];     // grn
            gndVerts[j + 5] = xColr[2];     // blu

            gndVerts[j + 6] = 0;     
            gndVerts[j + 7] = 0;     
            gndVerts[j + 8] = 1;     
        }
        // Second, step thru y values as wqe make horizontal lines of constant-y:
        // (don't re-initialize j--we're adding more vertices to the array)
        for (v = 0; v < 2 * ycount; v++, j += floatsPerVertex) {
            if (v % 2 == 0) {    // put even-numbered vertices at (-xymax, ynow, 0)
                gndVerts[j] = -xymax;               // x
                gndVerts[j + 1] = -xymax + (v) * ygap;  // y
                gndVerts[j + 2] = 0.0;                  // z
            }
            else {          // put odd-numbered vertices at (+xymax, ynow, 0).
                gndVerts[j] = xymax;                // x
                gndVerts[j + 1] = -xymax + (v - 1) * ygap;  // y
                gndVerts[j + 2] = 0.0;                  // z
            }
            gndVerts[j + 3] = yColr[0];     // red
            gndVerts[j + 4] = yColr[1];     // grn
            gndVerts[j + 5] = yColr[2];     // blu

            gndVerts[j + 6] = 0;     
            gndVerts[j + 7] = 0;     
            gndVerts[j + 8] = 1;     
        }
    }

       // -------------------------------------------------------MAKE AXES----------------------------------------------------------------

    function makeAxes() {
         axesVerts = new Float32Array([
            -100, 0, 0, 5 * r, 0, 0, 0, 0, 1,
            100, 0, 0, 5 * r, 0, 0, 0, 1, 1,
            0, -100, 0, 0, 5 * g, 0, 0, 0, 1,
            0, 100, 0, 0, 5 * g, 0, 1, 0, 1,
            0, 0, -100, 0, 0, 5 * b, 0, 0, 1,
            0, 0, 100, 0, 0, 5 * b, 1, 1, 0,
         ]);
        }

    // -------------------------------------------------------MAKE HEXAGONAL CYLINDER----------------------------------------------------------------

    function makeHexCylinder() {
        hexcylVerts = new Float32Array([
            //side 1
		-0.5, 2.0, 0.0, 1.0, 0.00, 0.28, 0.73, // Node 1
		-0.5, 0.0, 0.0, 1.0, 1.00, 0.93, 0.00, // Node 3
		0.5, 0.0, 0.0, 1.0, 0.13, 1.00, 0.00,// Node 4

		-0.5, 2.0, 0.0, 1.0, 0.00, 0.28, 0.73, // Node 1
		0.5, 2.0, 0.0, 1.0, 1.0, 0.0, 0.0,	// Node 2
		0.5, 0.0, 0.0, 1.0, 0.13, 1.00, 0.00,// Node 4

		//side 2
		0.5, 2.0, 0.0, 1.0, 1.0, 0.0, 0.0,	// Node 2
		0.5, 0.0, 0.0, 1.0, 0.13, 1.00, 0.00,// Node 4
		1.0, 0.0, -0.75, 1.0, 0.95, 0.61, 0.73, // Node 6

		1.0, 0.0, -0.75, 1.0, 0.95, 0.61, 0.73, // Node 6
		0.5, 2.0, 0.0, 1.0, 1.0, 0.0, 0.0,	// Node 2
		1.0, 2.0, -0.75, 1.0, 0.40, 0.50, 1.00, // Node 5

		//side3
		1.0, 2.0, -0.75, 1.0, 0.40, 0.50, 1.00, // Node 5
		1.0, 0.0, -0.75, 1.0, 0.95, 0.61, 0.73, // Node 6
		0.5, 0.0, -1.5, 1.0, 1.00, 0.57, 0.01, // Node 8

		0.5, 0.0, -1.5, 1.0, 1.00, 0.57, 0.01, // Node 8
		1.0, 2.0, -0.75, 1.0, 0.40, 0.50, 1.00, // Node 5
		0.5, 2.0, -1.5, 1.0, 0.23, 0.48, 0.34, // Node 7
		// side 4
		0.5, 2.0, -1.5, 1.0, 0.23, 0.48, 0.34, // Node 7
		0.5, 0.0, -1.5, 1.0, 1.00, 0.57, 0.01, // Node 8
		-0.5, 2.0, -1.5, 1.0, 1.00, 0.00, 1.00, // Node 9

		-0.5, 2.0, -1.5, 1.0, 1.00, 0.00, 1.00, // Node 9
		0.5, 0.0, -1.5, 1.0, 1.00, 0.57, 0.01, // Node 8
		-0.5, 0.0, -1.5, 1.0, 0.40, 1.00, 0.40, // Node 10
		//side 5
		-0.5, 0.0, -1.5, 1.0, 0.40, 1.00, 0.40, // Node 10
		-0.5, 2.0, -1.5, 1.0, 1.00, 0.00, 1.00, // Node 9
		-1.0, 2.0, -0.75, 1.0, 0.70, 1.00, 1.00, // Node 11

		-1.0, 2.0, -0.75, 1.0, 0.70, 1.00, 1.00, // Node 11
		-0.5, 0.0, -1.5, 1.0, 0.40, 1.00, 0.40, // Node 10
		-1.0, 0.0, -0.75, 1.0, 1.00, 0.85, 0.70, // Node 12
		//side 6
		-1.0, 0.0, -0.75, 1.0, 1.00, 0.85, 0.70, // Node 12
		-1.0, 2.0, -0.75, 1.0, 0.70, 1.00, 1.00, // Node 11
		-0.5, 0.0, 0.0, 1.0, 1.00, 0.93, 0.00, // Node 3

		-0.5, 0.0, 0.0, 1.0, 1.00, 0.93, 0.00, // Node 3
		-0.5, 2.0, 0.0, 1.0, 0.00, 0.28, 0.73, // Node 1
		-1.0, 2.0, -0.75, 1.0, 0.70, 1.00, 1.00, // Node 11

		//top
		-1.0, 2.0, -0.75, 1.0, 0.70, 1.00, 1.00, // Node 11
		-0.5, 2.0, -1.5, 1.0, 1.00, 0.00, 1.00, // Node 9
		-0.5, 2.0, 0.0, 1.0, 0.00, 0.28, 0.73, // Node 1

		-0.5, 2.0, 0.0, 1.0, 0.00, 0.28, 0.73, // Node 1
		0.5, 2.0, 0.0, 1.0, 1.0, 0.0, 0.0,	// Node 2
		-0.5, 2.0, -1.5, 1.0, 1.00, 0.00, 1.00, // Node 9

		-0.5, 2.0, -1.5, 1.0, 1.00, 0.00, 1.00, // Node 9
		0.5, 2.0, -1.5, 1.0, 0.23, 0.48, 0.34, // Node 7
		0.5, 2.0, 0.0, 1.0, 1.0, 0.0, 0.0,	// Node 2

		0.5, 2.0, 0.0, 1.0, 1.0, 0.0, 0.0,	// Node 2
		1.0, 2.0, -0.75, 1.0, 0.40, 0.50, 1.00, // Node 5
		0.5, 2.0, -1.5, 1.0, 0.23, 0.48, 0.34, // Node 7

		////// 48 vertices , total of 144 so far

		//BOTTOM
		-1.0, 0.0, -0.75, 1.0, 1.00, 0.85, 0.70, // Node 12
		-0.5, 0.0, -1.5, 1.0, 0.40, 1.00, 0.40, // Node 10
		-0.5, 0.0, 0.0, 1.0, 1.00, 0.93, 0.00, // Node 3

		-0.5, 0.0, 0.0, 1.0, 1.00, 0.93, 0.00, // Node 3
		0.5, 0.0, 0.0, 1.0, 0.13, 1.00, 0.00,// Node 4
		-0.5, 0.0, -1.5, 1.0, 0.40, 1.00, 0.40, // Node 10

		-0.5, 0.0, -1.5, 1.0, 0.40, 1.00, 0.40, // Node 10
		0.5, 0.0, -1.5, 1.0, 1.00, 0.57, 0.01, // Node 8
		0.5, 0.0, 0.0, 1.0, 0.13, 1.00, 0.00,// Node 4

		0.5, 0.0, 0.0, 1.0, 0.13, 1.00, 0.00,// Node 4
		1.0, 0.0, -0.75, 1.0, 0.95, 0.61, 0.73, // Node 6
		0.5, 0.0, -1.5, 1.0, 1.00, 0.57, 0.01, // Node 8
        ]);


    }
    // -------------------------------------------------------MAKE SPHERE----------------------------------------------------------------
    function makeSphere() {
        //==============================================================================
        // Make a sphere from one OpenGL TRIANGLE_STRIP primitive.   Make ring-like 
        // equal-lattitude 'slices' of the sphere (bounded by planes of constant z), 
        // and connect them as a 'stepped spiral' design (see makeCylinder) to build the
        // sphere from one triangle strip.
          var slices = 13;		// # of slices of the sphere along the z axis. >=3 req'd
                                                    // (choose odd # or prime# to avoid accidental symmetry)
          var sliceVerts	= 27;	// # of vertices around the top edge of the slice
                                                    // (same number of vertices on bottom of slice, too)
          var topColr = new Float32Array([0.7, 0.7, 0.7]);	// North Pole: light gray
          var equColr = new Float32Array([0.3, 0.7, 0.3]);	// Equator:    bright green
          var botColr = new Float32Array([0.9, 0.9, 0.9]);	// South Pole: brightest gray.
          var sliceAngle = Math.PI/slices;	// lattitude angle spanned by one slice.
        
            // Create a (global) array to hold this sphere's vertices:
          sphVerts = new Float32Array(  ((slices * 2* sliceVerts) -2) * floatsPerVertex);
                                                // # of vertices * # of elements needed to store them. 
                                                // each slice requires 2*sliceVerts vertices except 1st and
                                                // last ones, which require only 2*sliceVerts-1.
                                                
            // Create dome-shaped top slice of sphere at z=+1
            // s counts slices; v counts vertices; 
            // j counts array elements (vertices * elements per vertex)
            var cos0 = 0.0;					// sines,cosines of slice's top, bottom edge.
            var sin0 = 0.0;
            var cos1 = 0.0;
            var sin1 = 0.0;	
            var j = 0;							// initialize our array index
            var isLast = 0;
            var isFirst = 1;
            for(s=0; s<slices; s++) {	// for each slice of the sphere,
                // find sines & cosines for top and bottom of this slice
                if(s==0) {
                    isFirst = 1;	// skip 1st vertex of 1st slice.
                    cos0 = 1.0; 	// initialize: start at north pole.
                    sin0 = 0.0;
                }
                else {					// otherwise, new top edge == old bottom edge
                    isFirst = 0;	
                    cos0 = cos1;
                    sin0 = sin1;
                }								// & compute sine,cosine for new bottom edge.
                cos1 = Math.cos((s+1)*sliceAngle);
                sin1 = Math.sin((s+1)*sliceAngle);
                // go around the entire slice, generating TRIANGLE_STRIP verts
                // (Note we don't initialize j; grows with each new attrib,vertex, and slice)
                if(s==slices-1) isLast=1;	// skip last vertex of last slice.
                for(v=isFirst; v< 2*sliceVerts-isLast; v++, j+=floatsPerVertex) {	
                    if(v%2==0)
                    {				// put even# vertices at the the slice's top edge
                                    // (why PI and not 2*PI? because 0 <= v < 2*sliceVerts
                                    // and thus we can simplify cos(2*PI(v/2*sliceVerts))  
                        sphVerts[j  ] = sin0 * Math.cos(Math.PI*(v)/sliceVerts); 	
                        sphVerts[j+1] = sin0 * Math.sin(Math.PI*(v)/sliceVerts);	
                        sphVerts[j+2] = cos0;		
                        sphVerts[j+3] = 1.0;			
                    }
                    else { 	// put odd# vertices around the slice's lower edge;
                                    // x,y,z,w == cos(theta),sin(theta), 1.0, 1.0
                                    // 					theta = 2*PI*((v-1)/2)/capVerts = PI*(v-1)/capVerts
                        sphVerts[j  ] = sin1 * Math.cos(Math.PI*(v-1)/sliceVerts);		// x
                        sphVerts[j+1] = sin1 * Math.sin(Math.PI*(v-1)/sliceVerts);		// y
                        sphVerts[j+2] = cos1;																				// z
                        sphVerts[j+3] = 1.0;																				// w.		
                    }
                    if(s==0) {	// finally, set some interesting colors for vertices:
                        sphVerts[j+4]=topColr[0]; 
                        sphVerts[j+5]=topColr[1]; 
                        sphVerts[j+6]=topColr[2];	
                        }
                    else if(s==slices-1) {
                        sphVerts[j+4]=botColr[0]; 
                        sphVerts[j+5]=botColr[1]; 
                        sphVerts[j+6]=botColr[2];	
                    }
                    else {
                            sphVerts[j+4]=Math.random();// equColr[0]; 
                            sphVerts[j+5]=Math.random();// equColr[1]; 
                            sphVerts[j+6]=Math.random();// equColr[2];					
                    }
                }
            }
        }

    
    // -------------------------------------------------------MAKE CYLINDER----------------------------------------------------------------
    function makeCylinder() {
        //==============================================================================
        // Make a cylinder shape from one TRIANGLE_STRIP drawing primitive, using the
        // 'stepped spiral' design described in notes.
        // Cylinder center at origin, encircles z axis, radius 1, top/bottom at z= +/-1.
        //
        var ctrColr = new Float32Array([0.8, 0.2, 0.5]);	// dark gray
        var topColr = new Float32Array([0.998, 0.6705, 0.637]);	
        var botColr = new Float32Array([0.5, 0.7, 0.9]);	// light blue
        var capVerts = 16;	// # of vertices around the topmost 'cap' of the shape
        var botRadius = 1.0;		// radius of bottom of cylinder (top always 1.0)

        // Create a (global) array to hold this cylinder's vertices;
        cylVerts = new Float32Array(((capVerts * 6) - 2) * floatsPerVertex);
        // # of vertices * # of elements needed to store them. 

        // Create circle-shaped top cap of cylinder at z=+1.0, radius 1.0
        // v counts vertices: j counts array elements (vertices * elements per vertex)
        for (v = 1, j = 0; v < 2 * capVerts; v++, j += floatsPerVertex) {
            // skip the first vertex--not needed.
            if (v % 2 == 0) {				// put even# vertices at center of cylinder's top cap:
                cylVerts[j] = 0.0; 			// x,y,z,w == 0,0,1,1
                cylVerts[j + 1] = 0.0;
                cylVerts[j + 2] = 1.0;
                //cylVerts[j + 3] = 1.0;			// r,g,b = topColr[]
                cylVerts[j + 3] = ctrColr[0];
                cylVerts[j + 4] = ctrColr[1];
                cylVerts[j + 5] = ctrColr[2];
            }
            else { 	// put odd# vertices around the top cap's outer edge;
                // x,y,z,w == cos(theta),sin(theta), 1.0, 1.0
                // 					theta = 2*PI*((v-1)/2)/capVerts = PI*(v-1)/capVerts
                cylVerts[j] = Math.cos(Math.PI * (v - 1) / capVerts);			// x
                cylVerts[j + 1] = Math.sin(Math.PI * (v - 1) / capVerts);			// y
                //	(Why not 2*PI? because 0 < =v < 2*capVerts, so we
                //	 can simplify cos(2*PI * (v-1)/(2*capVerts))
                cylVerts[j + 2] = 1.0;	// z
                //cylVerts[j + 3] = 1.0;	// w.
                // r,g,b = topColr[]
                cylVerts[j + 3] = topColr[0];
                cylVerts[j + 4] = topColr[1];
                cylVerts[j + 5] = topColr[2];
            }
            cylVerts[j + 6] = 1;
            cylVerts[j + 7] = 1;
            cylVerts[j + 8] = 1;
        }
        // Create the cylinder side walls, made of 2*capVerts vertices.
        // v counts vertices within the wall; j continues to count array elements
        for (v = 0; v < 2 * capVerts; v++, j += floatsPerVertex) {
            if (v % 2 == 0)	// position all even# vertices along top cap:
            {
                cylVerts[j] = Math.cos(Math.PI * (v) / capVerts);		// x
                cylVerts[j + 1] = Math.sin(Math.PI * (v) / capVerts);		// y
                cylVerts[j + 2] = 1.0;	// z
                //cylVerts[j + 3] = 1.0;	// w.
                // r,g,b = topColr[]
                cylVerts[j + 3] = topColr[0];
                cylVerts[j + 4] = topColr[1];
                cylVerts[j + 5] = topColr[2];

            }
            else		// position all odd# vertices along the bottom cap:
            {
                cylVerts[j] = botRadius * Math.cos(Math.PI * (v - 1) / capVerts);		// x
                cylVerts[j + 1] = botRadius * Math.sin(Math.PI * (v - 1) / capVerts);		// y
                cylVerts[j + 2] = -1.0;	// z
                //cylVerts[j + 3] = 1.0;	// w.
                // r,g,b = topColr[]
                cylVerts[j + 3] = botColr[0];
                cylVerts[j + 4] = botColr[1];
                cylVerts[j + 5] = botColr[2];

            }
            cylVerts[j + 6] = 1;
            cylVerts[j + 7] = 1;
            cylVerts[j + 8] = 1;
        }
        // Create the cylinder bottom cap, made of 2*capVerts -1 vertices.
        // v counts the vertices in the cap; j continues to count array elements
        for (v = 0; v < (2 * capVerts - 1) ; v++, j += floatsPerVertex) {
            if (v % 2 == 0) {	// position even #'d vertices around bot cap's outer edge
                cylVerts[j] = botRadius * Math.cos(Math.PI * (v) / capVerts);		// x
                cylVerts[j + 1] = botRadius * Math.sin(Math.PI * (v) / capVerts);		// y
                cylVerts[j + 2] = -1.0;	// z
                //cylVerts[j + 3] = 1.0;	// w.
                // r,g,b = topColr[]
                cylVerts[j + 3] = botColr[0];
                cylVerts[j + 4] = botColr[1];
                cylVerts[j + 5] = botColr[2];
            }
            else {				// position odd#'d vertices at center of the bottom cap:
                cylVerts[j] = 0.0; 			// x,y,z,w == 0,0,-1,1
                cylVerts[j + 1] = 0.0;
                cylVerts[j + 2] = -1.0;
                //cylVerts[j + 3] = 1.0;			// r,g,b = botColr[]
                cylVerts[j + 3] = botColr[0];
                cylVerts[j + 4] = botColr[1];
                cylVerts[j + 5] = botColr[2];
            }
            cylVerts[j + 6] = 1;
            cylVerts[j + 7] = 1;
            cylVerts[j + 8] = 1;
        }
    }

 
 

    function makeCone() {
        //==============================================================================
        // Make a cylinder shape from one TRIANGLE_STRIP drawing primitive, using the
        // 'stepped spiral' design described in notes.
        // Cylinder center at origin, encircles z axis, radius 1, top/bottom at z= +/-1.
        //
        var ctrColr = new Float32Array([1, 1, 1]);	
        var topColr = new Float32Array([0.752, 0.752, 0.752]);
        var botColr = new Float32Array([0.5, 0.5, 0.5]);	
        var capVerts = 16;	// # of vertices around the topmost 'cap' of the shape
        var botRadius = 0.1;		// radius of bottom of cylinder (top always 1.0)

        // Create a (global) array to hold this cylinder's vertices;
        coneVerts = new Float32Array(((capVerts * 6) - 2) * floatsPerVertex);
        // # of vertices * # of elements needed to store them. 

        // Create circle-shaped top cap of cylinder at z=+1.0, radius 1.0
        // v counts vertices: j counts array elements (vertices * elements per vertex)
        for (v = 1, j = 0; v < 2 * capVerts; v++, j += floatsPerVertex) {
            // skip the first vertex--not needed.
            if (v % 2 == 0) {				// put even# vertices at center of cylinder's top cap:
                coneVerts[j] = 0.0; 			// x,y,z,w == 0,0,1,1
                coneVerts[j + 1] = 0.0;
                coneVerts[j + 2] = 1.0;
                //coneVerts[j + 3] = 1.0;			// r,g,b = topColr[]
                coneVerts[j + 3] = ctrColr[0];
                coneVerts[j + 4] = ctrColr[1];
                coneVerts[j + 5] = ctrColr[2];
            }
            else { 	// put odd# vertices around the top cap's outer edge;
                // x,y,z,w == cos(theta),sin(theta), 1.0, 1.0
                // 					theta = 2*PI*((v-1)/2)/capVerts = PI*(v-1)/capVerts
                coneVerts[j] = Math.cos(Math.PI * (v - 1) / capVerts);			// x
                coneVerts[j + 1] = Math.sin(Math.PI * (v - 1) / capVerts);			// y
                //	(Why not 2*PI? because 0 < =v < 2*capVerts, so we
                //	 can simplify cos(2*PI * (v-1)/(2*capVerts))
                coneVerts[j + 2] = 1.0;	// z
                //coneVerts[j + 3] = 1.0;	// w.
                // r,g,b = topColr[]
                coneVerts[j + 3] = topColr[0];
                coneVerts[j + 4] = topColr[1];
                coneVerts[j + 5] = topColr[2];
            }
            coneVerts[j + 6] = 1;
            coneVerts[j + 7] = 1;
            coneVerts[j + 8] = 1;
        }
        // Create the cylinder side walls, made of 2*capVerts vertices.
        // v counts vertices within the wall; j continues to count array elements
        for (v = 0; v < 2 * capVerts; v++, j += floatsPerVertex) {
            if (v % 2 == 0)	// position all even# vertices along top cap:
            {
                coneVerts[j] = Math.cos(Math.PI * (v) / capVerts);		// x
                coneVerts[j + 1] = Math.sin(Math.PI * (v) / capVerts);		// y
                coneVerts[j + 2] = 1.0;	// z
                //coneVerts[j + 3] = 1.0;	// w.
                // r,g,b = topColr[]
                coneVerts[j + 3] = topColr[0];
                coneVerts[j + 4] = topColr[1];
                coneVerts[j + 5] = topColr[2];
            }
            else		// position all odd# vertices along the bottom cap:
            {
                coneVerts[j] = botRadius * Math.cos(Math.PI * (v - 1) / capVerts);		// x
                coneVerts[j + 1] = botRadius * Math.sin(Math.PI * (v - 1) / capVerts);		// y
                coneVerts[j + 2] = -1.0;	// z
                //coneVerts[j + 3] = 1.0;	// w.
                // r,g,b = topColr[]
                coneVerts[j + 3] = botColr[0];
                coneVerts[j + 4] = botColr[1];
                coneVerts[j + 5] = botColr[2];
            }
            coneVerts[j + 6] = 1;
            coneVerts[j + 7] = 1;
            coneVerts[j + 8] = 1;
        }
        // Create the cylinder bottom cap, made of 2*capVerts -1 vertices.
        // v counts the vertices in the cap; j continues to count array elements
        for (v = 0; v < (2 * capVerts - 1) ; v++, j += floatsPerVertex) {
            if (v % 2 == 0) {	// position even #'d vertices around bot cap's outer edge
                coneVerts[j] = botRadius * Math.cos(Math.PI * (v) / capVerts);		// x
                coneVerts[j + 1] = botRadius * Math.sin(Math.PI * (v) / capVerts);		// y
                coneVerts[j + 2] = -1.0;	// z
                //coneVerts[j + 3] = 1.0;	// w.
                // r,g,b = topColr[]
                coneVerts[j + 3] = botColr[0];
                coneVerts[j + 4] = botColr[1];
                coneVerts[j + 5] = botColr[2];
            }
            else {				// position odd#'d vertices at center of the bottom cap:
                coneVerts[j] = 0.0; 			// x,y,z,w == 0,0,-1,1
                coneVerts[j + 1] = 0.0;
                coneVerts[j + 2] = -1.0;
                //coneVerts[j + 3] = 1.0;			// r,g,b = botColr[]
                coneVerts[j + 3] = botColr[0];
                coneVerts[j + 4] = botColr[1];
                coneVerts[j + 5] = botColr[2];
            }
            coneVerts[j + 6] = 1;
            coneVerts[j + 7] = 1;
            coneVerts[j + 8] = 1;
        }
    }
  

  
    function initVertexBuffers(gl) {
        //==============================================================================
        makeGroundGrid();
        makeAxes();
        makeCylinder();
        makeSphere();
        makeCone();
 
       
        mySize = cylVerts.length + sphVerts.length + axesVerts.length + gndVerts.length + coneVerts.length ;

        // total verts
        var nn = mySize / floatsPerVertex;

        // Copy all shapes into one big Float32 array:
        var vertices = new Float32Array(mySize);
        // Copy them:  remember where to start for each shape:
        cylinderStart = 0;              // we store the forest first.
        for (i = 0, j = 0; j < cylVerts.length; i++, j++) {
            vertices[i] = cylVerts[j];
        }

        sphereStart = i;           // next we'll store the sphere
        for (j = 0; j < sphVerts.length; i++, j++) {
            vertices[i] = sphVerts[j];
        }

        coneStart = i;
        for (k = 0; k < coneVerts.length; i++, k++) {
            vertices[i] = coneVerts[k];
        }

        gndStart = i;           // next we'll store the ground-plane;
        for (j = 0; j < gndVerts.length; i++, j++) {
            vertices[i] = gndVerts[j];
        }

        axesStart = i;
        for (j = 0; j < axesVerts.length; i++, j++) {
            vertices[i] = axesVerts[j];
        }

        hexcylVerts = new Float32Array([
            //side 1
		-0.5, 2.0, 0.0, 1.0, 0.00, 0.28, 0.73, // Node 1
		-0.5, 0.0, 0.0, 1.0, 1.00, 0.93, 0.00, // Node 3
		0.5, 0.0, 0.0, 1.0, 0.13, 1.00, 0.00,// Node 4

		-0.5, 2.0, 0.0, 1.0, 0.00, 0.28, 0.73, // Node 1
		0.5, 2.0, 0.0, 1.0, 1.0, 0.0, 0.0,	// Node 2
		0.5, 0.0, 0.0, 1.0, 0.13, 1.00, 0.00,// Node 4

		//side 2
		0.5, 2.0, 0.0, 1.0, 1.0, 0.0, 0.0,	// Node 2
		0.5, 0.0, 0.0, 1.0, 0.13, 1.00, 0.00,// Node 4
		1.0, 0.0, -0.75, 1.0, 0.95, 0.61, 0.73, // Node 6

		1.0, 0.0, -0.75, 1.0, 0.95, 0.61, 0.73, // Node 6
		0.5, 2.0, 0.0, 1.0, 1.0, 0.0, 0.0,	// Node 2
		1.0, 2.0, -0.75, 1.0, 0.40, 0.50, 1.00, // Node 5

		//side3
		1.0, 2.0, -0.75, 1.0, 0.40, 0.50, 1.00, // Node 5
		1.0, 0.0, -0.75, 1.0, 0.95, 0.61, 0.73, // Node 6
		0.5, 0.0, -1.5, 1.0, 1.00, 0.57, 0.01, // Node 8

		0.5, 0.0, -1.5, 1.0, 1.00, 0.57, 0.01, // Node 8
		1.0, 2.0, -0.75, 1.0, 0.40, 0.50, 1.00, // Node 5
		0.5, 2.0, -1.5, 1.0, 0.23, 0.48, 0.34, // Node 7
		// side 4
		0.5, 2.0, -1.5, 1.0, 0.23, 0.48, 0.34, // Node 7
		0.5, 0.0, -1.5, 1.0, 1.00, 0.57, 0.01, // Node 8
		-0.5, 2.0, -1.5, 1.0, 1.00, 0.00, 1.00, // Node 9

		-0.5, 2.0, -1.5, 1.0, 1.00, 0.00, 1.00, // Node 9
		0.5, 0.0, -1.5, 1.0, 1.00, 0.57, 0.01, // Node 8
		-0.5, 0.0, -1.5, 1.0, 0.40, 1.00, 0.40, // Node 10
		//side 5
		-0.5, 0.0, -1.5, 1.0, 0.40, 1.00, 0.40, // Node 10
		-0.5, 2.0, -1.5, 1.0, 1.00, 0.00, 1.00, // Node 9
		-1.0, 2.0, -0.75, 1.0, 0.70, 1.00, 1.00, // Node 11

		-1.0, 2.0, -0.75, 1.0, 0.70, 1.00, 1.00, // Node 11
		-0.5, 0.0, -1.5, 1.0, 0.40, 1.00, 0.40, // Node 10
		-1.0, 0.0, -0.75, 1.0, 1.00, 0.85, 0.70, // Node 12
		//side 6
		-1.0, 0.0, -0.75, 1.0, 1.00, 0.85, 0.70, // Node 12
		-1.0, 2.0, -0.75, 1.0, 0.70, 1.00, 1.00, // Node 11
		-0.5, 0.0, 0.0, 1.0, 1.00, 0.93, 0.00, // Node 3

		-0.5, 0.0, 0.0, 1.0, 1.00, 0.93, 0.00, // Node 3
		-0.5, 2.0, 0.0, 1.0, 0.00, 0.28, 0.73, // Node 1
		-1.0, 2.0, -0.75, 1.0, 0.70, 1.00, 1.00, // Node 11

		//top
		-1.0, 2.0, -0.75, 1.0, 0.70, 1.00, 1.00, // Node 11
		-0.5, 2.0, -1.5, 1.0, 1.00, 0.00, 1.00, // Node 9
		-0.5, 2.0, 0.0, 1.0, 0.00, 0.28, 0.73, // Node 1

		-0.5, 2.0, 0.0, 1.0, 0.00, 0.28, 0.73, // Node 1
		0.5, 2.0, 0.0, 1.0, 1.0, 0.0, 0.0,	// Node 2
		-0.5, 2.0, -1.5, 1.0, 1.00, 0.00, 1.00, // Node 9

		-0.5, 2.0, -1.5, 1.0, 1.00, 0.00, 1.00, // Node 9
		0.5, 2.0, -1.5, 1.0, 0.23, 0.48, 0.34, // Node 7
		0.5, 2.0, 0.0, 1.0, 1.0, 0.0, 0.0,	// Node 2

		0.5, 2.0, 0.0, 1.0, 1.0, 0.0, 0.0,	// Node 2
		1.0, 2.0, -0.75, 1.0, 0.40, 0.50, 1.00, // Node 5
		0.5, 2.0, -1.5, 1.0, 0.23, 0.48, 0.34, // Node 7

		////// 48 vertices , total of 144 so far

		//BOTTOM
		-1.0, 0.0, -0.75, 1.0, 1.00, 0.85, 0.70, // Node 12
		-0.5, 0.0, -1.5, 1.0, 0.40, 1.00, 0.40, // Node 10
		-0.5, 0.0, 0.0, 1.0, 1.00, 0.93, 0.00, // Node 3

		-0.5, 0.0, 0.0, 1.0, 1.00, 0.93, 0.00, // Node 3
		0.5, 0.0, 0.0, 1.0, 0.13, 1.00, 0.00,// Node 4
		-0.5, 0.0, -1.5, 1.0, 0.40, 1.00, 0.40, // Node 10

		-0.5, 0.0, -1.5, 1.0, 0.40, 1.00, 0.40, // Node 10
		0.5, 0.0, -1.5, 1.0, 1.00, 0.57, 0.01, // Node 8
		0.5, 0.0, 0.0, 1.0, 0.13, 1.00, 0.00,// Node 4

		0.5, 0.0, 0.0, 1.0, 0.13, 1.00, 0.00,// Node 4
		1.0, 0.0, -0.75, 1.0, 0.95, 0.61, 0.73, // Node 6
		0.5, 0.0, -1.5, 1.0, 1.00, 0.57, 0.01, // Node 8
        ]);

        // Create a vertex buffer object (VBO)
        var vertexColorbuffer = gl.createBuffer();
        if (!vertexColorbuffer) {
            console.log('Failed to create the buffer object');
            return -1;
        }

        // Write vertex information to buffer object
        gl.bindBuffer(gl.ARRAY_BUFFER, vertexColorbuffer);
        gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);
        // gl.bufferData(gl.ARRAY_BUFFER, hexcylVerts, gl.STATIC_DRAW);

        var FSIZE = vertices.BYTES_PER_ELEMENT;


        // Assign the buffer object to a_Position and enable the assignment
        var a_Position = gl.getAttribLocation(gl.program, 'a_Position');
        if (a_Position < 0) {
            console.log('Failed to get the storage location of a_Position');
            return -1;
        }
        gl.vertexAttribPointer(a_Position, 3, gl.FLOAT, false, FSIZE * 9, 0);
        gl.enableVertexAttribArray(a_Position);

        // Assign the buffer object to a_Color and enable the assignment
        var a_Color = gl.getAttribLocation(gl.program, 'a_Color');
        if (a_Color < 0) {
            console.log('Failed to get the storage location of a_Color');
            return -1;
        }
        gl.vertexAttribPointer(a_Color, 3, gl.FLOAT, false, FSIZE * 9, FSIZE * 3);
        gl.enableVertexAttribArray(a_Color);



        return mySize / floatsPerVertex; // return # of vertices
    }


    // ----------------------------------------------------------------------DRAW FUNCTION----------------------------------------------------------------------

    function draw(gl, currentAngle, u_ViewMatrix, viewMatrix, u_ProjMatrix, projMatrix, canvas, u_NormalMatrix, normalMatrix, curLength,saberAngle, saberLength) {
        //==============================================================================

        // Clear <canvas> color AND DEPTH buffer
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

        projMatrix.setPerspective(40, 1, 1, 100);

        // Send this matrix to our Vertex and Fragment shaders through the
        // 'uniform' variable u_ProjMatrix:
        gl.uniformMatrix4fv(u_ProjMatrix, false, projMatrix.elements);
        // Draw in the SECOND of several 'viewports'
        //------------------------------------------
        gl.viewport(0,        // Viewport lower-left corner
                    0,                              // location(in pixels)
                    innerWidth / 2,        // viewport width, height.
                    innerWidth * 0.70 / 2);

        // but use a different 'view' matrix:
        viewMatrix.setLookAt(camX, camY, camZ, // eye position
                            moveX, moveY, moveZ,                  // look-at point 
                            0, 0, 1);                 // up vector

        // Pass the view projection matrix to our shaders:
        gl.uniformMatrix4fv(u_ViewMatrix, false, viewMatrix.elements);

        // Draw the scene:
        drawMyScene(gl, currentAngle, u_ViewMatrix, viewMatrix, u_NormalMatrix, normalMatrix, curLength, saberAngle, saberLength);

        projMatrix.setOrtho(-3, 3, -3, 3, 0, 30.0);
        gl.uniformMatrix4fv(u_ProjMatrix, false, projMatrix.elements);
        // Draw in the THIRD of several 'viewports'
        //------------------------------------------
        gl.viewport(innerWidth/ 2,         // Viewport lower-left corner
                    0,     // location(in pixels)
                    innerWidth / 2,        // viewport width, height.
                    innerWidth * 0.70 / 2);

        // but use a different 'view' matrix:
        viewMatrix.setLookAt(camX, camY, camZ,  // eye position,
                              moveX, moveY, moveZ,                // look-at point,
                              0, 0, 1);               // 'up' vector.

        // Pass the view projection matrix to our shaders:
        gl.uniformMatrix4fv(u_ViewMatrix, false, viewMatrix.elements);

        // Draw the scene:
        drawMyScene(gl, currentAngle, u_ViewMatrix, viewMatrix, u_NormalMatrix, normalMatrix, curLength, saberAngle, saberLength);
    }

    function drawMyScene(myGL, currentAngle, myu_ViewMatrix, myViewMatrix, u_NormalMatrix, normalMatrix, curLength, saberAngle, saberLength) {
        
        myViewMatrix.scale(0.2, 0.2, 0.2);
        myViewMatrix.translate(0.0, 0.0, -0.5);

        normalMatrix.setInverseOf(myViewMatrix);
        normalMatrix.transpose();
        myGL.uniformMatrix4fv(u_NormalMatrix, false, normalMatrix.elements);

        // shrink the drawing axes 
        //for nicer-looking ground-plane, and
        // Pass the modified view matrix to our shaders:
        myGL.uniformMatrix4fv(myu_ViewMatrix, false, myViewMatrix.elements);

        // Now, using these drawing axes, draw our ground plane: 
        myGL.drawArrays(myGL.LINES,             // use this drawing primitive, and
                      gndStart / floatsPerVertex, // start at this vertex number, and
                      gndVerts.length / floatsPerVertex);   // draw this many vertices
        
        pushMatrix(myViewMatrix);
        pushMatrix(myViewMatrix);
        pushMatrix(myViewMatrix);
        pushMatrix(myViewMatrix);
        pushMatrix(myViewMatrix);
        pushMatrix(myViewMatrix);
        pushMatrix(myViewMatrix);
        

        //Axes
        myGL.uniformMatrix4fv(myu_ViewMatrix, false, myViewMatrix.elements);
        myGL.drawArrays(myGL.LINES, axesStart / floatsPerVertex, axesVerts.length / floatsPerVertex);

        //Draw sphere
        myViewMatrix = popMatrix();
        myViewMatrix.scale(3, 3, 3);
        myViewMatrix.translate(1, 5, 2);
        normalMatrix.setInverseOf(myViewMatrix);
        normalMatrix.transpose();
        pushMatrix(normalMatrix);
        myViewMatrix.rotate(-currentAngle, 0, 0, 1);
        normalMatrix.setInverseOf(myViewMatrix);
        normalMatrix.transpose();
        myGL.uniformMatrix4fv(u_NormalMatrix, false, normalMatrix.elements);
        myGL.uniformMatrix4fv(myu_ViewMatrix, false, myViewMatrix.elements);
        myGL.drawArrays(myGL.TRIANGLE_STRIP, sphereStart / floatsPerVertex, sphVerts.length/floatsPerVertex);
        // var dist = Math.sqrt(g_xMdragTot*g_xMdragTot + g_g_yMdragTot*g_g_yMdragTot);
		// 					// why add 0.001? avoids divide-by-zero in next statement
		// 					// in cases where user didn't drag the mouse.)
        //                     myViewMatrix.rotate(dist*120.0, -g_g_yMdragTot+0.0001, g_xMdragTot+0.0001, 0.0);
        quatMatrix.setFromQuat(qcurr.x, qcurr.y, qcurr.z, qcurr.w); // Quaternion-->Matrix
        myViewMatrix.concat(quatMatrix);   

        //ESSENTIAL FOR THE SUSBEQUENT SHAPES TO LOOK NORMAL!!!! ------------------------------------------------------------------------------------------
        normalMatrix = popMatrix();
        myGL.uniformMatrix4fv(u_NormalMatrix, false, normalMatrix.elements);

        myViewMatrix = popMatrix();
        myViewMatrix.scale(.5, .5, .5);
        myViewMatrix.translate(-5, -10, 0); //CHANGES HERE ARE AFFECTING 2 SPHERES AND ONE CYLINDER TO TRANSLATE IN UNISON
        // myViewMatrix.scale(.65, .65, .65);
        pushMatrix(myViewMatrix);
        pushMatrix(myViewMatrix);
        myGL.uniformMatrix4fv(myu_ViewMatrix, false, myViewMatrix.elements);
        myGL.drawArrays(myGL.TRIANGLE_STRIP, sphereStart / floatsPerVertex, sphVerts.length / floatsPerVertex);

        myViewMatrix = popMatrix();
        myViewMatrix.translate(3, -5, 0);
        myViewMatrix.scale(2, 2, 2);
        pushMatrix(myViewMatrix);
        myGL.uniformMatrix4fv(myu_ViewMatrix, false, myViewMatrix.elements);
        myGL.drawArrays(myGL.TRIANGLE_STRIP, sphereStart / floatsPerVertex, sphVerts.length / floatsPerVertex);

    
        myViewMatrix = popMatrix();
        myViewMatrix.translate(1, 8, 2);
        pushMatrix(myViewMatrix);

        myViewMatrix = popMatrix();
        myViewMatrix.translate(-10, 5, 0);
        myViewMatrix.scale(2, 2, 6);
        pushMatrix(myViewMatrix);
        myViewMatrix.scale(1, 1, 0.5);
        // myGL.uniformMatrix4fv(myu_ViewMatrix, false, myViewMatrix.elements);
        // myGL.drawArrays(myGL.TRIANGLE_STRIP, cylinderStart / floatsPerVertex, cylVerts.length / floatsPerVertex);

          //cylinder
        myViewMatrix = popMatrix();
        myViewMatrix.translate(1.0,-6.0,0);
        myViewMatrix.rotate(180,0,0,1);
        myViewMatrix.translate(0,-0.5,0);
        myViewMatrix.rotate(currentAngle*0.5, 0, 0, 1);
        myViewMatrix.scale(0.3, 0.3, 0.4); 
        myGL.uniformMatrix4fv(myu_ViewMatrix, false, myViewMatrix.elements)
        myGL.drawArrays(myGL.TRIANGLE_STRIP, 1, 70);
        // myGL.drawArrays(myGL.TRIANGLE_STRIP, cylinderStart / floatsPerVertex, cylVerts.length / floatsPerVertex);
        
        //cylinder
        myViewMatrix.translate(0,2.0,0);
        myViewMatrix.rotate(90,0,1,0);
        myViewMatrix.rotate(currentAngle*0.5, 0, 0, 1);
        myGL.uniformMatrix4fv(myu_ViewMatrix, false, myViewMatrix.elements)
        myGL.drawArrays(myGL.TRIANGLE_STRIP, 0, 60);
        // myGL.drawArrays(myGL.TRIANGLE_STRIP, cylinderStart / floatsPerVertex, cylVerts.length / floatsPerVertex);

        //cylinder
        myViewMatrix.translate(0,2.0,0);
        myViewMatrix.rotate(90,0,1,0);
        myViewMatrix.rotate(currentAngle*0.5, 0, 0, 1);
        myGL.uniformMatrix4fv(myu_ViewMatrix, false, myViewMatrix.elements)
        myGL.drawArrays(myGL.TRIANGLE_STRIP, 0, 60);
        // myGL.drawArrays(myGL.TRIANGLE_STRIP, cylinderStart / floatsPerVertex, cylVerts.length / floatsPerVertex);
        
        //cylinder
        myViewMatrix.translate(0,2.0,0);
        myViewMatrix.rotate(90,0,1,0);
        myViewMatrix.rotate(currentAngle*0.5, 0, 0, 1);
        myGL.uniformMatrix4fv(myu_ViewMatrix, false, myViewMatrix.elements)
        myGL.drawArrays(myGL.TRIANGLE_STRIP, 0, 60);
        // myGL.drawArrays(myGL.TRIANGLE_STRIP, cylinderStart / floatsPerVertex, cylVerts.length / floatsPerVertex);
        
        //cylinder
        myViewMatrix.translate(0,2.0,0);
        myViewMatrix.rotate(90,0,1,0);
        myViewMatrix.rotate(currentAngle*0.5, 0, 0, 1);
        myGL.uniformMatrix4fv(myu_ViewMatrix, false, myViewMatrix.elements)
        myGL.drawArrays(myGL.TRIANGLE_STRIP, 0, 60);
        // myGL.drawArrays(myGL.TRIANGLE_STRIP, cylinderStart / floatsPerVertex, cylVerts.length / floatsPerVertex);
        
        //cylinder
        myViewMatrix.translate(0,2.0,0);
        myViewMatrix.rotate(90,0,1,0);
        myViewMatrix.rotate(currentAngle*0.5, 0, 0, 1);
        myGL.uniformMatrix4fv(myu_ViewMatrix, false, myViewMatrix.elements)
        myGL.drawArrays(myGL.TRIANGLE_STRIP, 0, 60);
        // myGL.drawArrays(myGL.TRIANGLE_STRIP, cylinderStart / floatsPerVertex, cylVerts.length / floatsPerVertex);

        myViewMatrix.scale(.04, .04, .04);
        myGL.uniformMatrix4fv(myu_ViewMatrix, false, myViewMatrix.elements);
        myGL.drawArrays(myGL.LINES, axesStart / floatsPerVertex, axesVerts.length / floatsPerVertex);
        
        //cylinder
        myViewMatrix.translate(0,2.0,0);
        myViewMatrix.rotate(90,0,1,0);
        myViewMatrix.rotate(currentAngle*0.5, 0, 0, 1);
        myGL.uniformMatrix4fv(myu_ViewMatrix, false, myViewMatrix.elements)
        myGL.drawArrays(myGL.TRIANGLE_STRIP, 0, 60);
        // myGL.drawArrays(myGL.TRIANGLE_STRIP, cylinderStart / floatsPerVertex, cylVerts.length / floatsPerVertex);
        pushMatrix(myViewMatrix);
        pushMatrix(myViewMatrix);
        // myViewMatrix = popMatrix();
        // myViewMatrix.translate(-2,-2,0);
        // myGL.uniformMatrix4fv(myu_ViewMatrix, false, myViewMatrix.elements)
        // myViewMatrix.rotate(90,0,1,0);
        // myGL.drawArrays(myGL.TRIANGLE_STRIP, 0, 60);
    }

    function animate(angle) {
        //==============================================================================
        // Calculate the elapsed time
        var now = Date.now();
        var elapsed = now - g_last;
        g_last = now;
      
        // Update the current rotation angle (adjusted by the elapsed time)
        //  limit the angle to move smoothly between +320 and 0 degrees:
        if(angle >   300.0 && ANGLE_STEP > 0) ANGLE_STEP = -ANGLE_STEP;
        if(angle <  0.0 && ANGLE_STEP < 0) ANGLE_STEP = -ANGLE_STEP;
        var newAngle = angle + (ANGLE_STEP * elapsed) / 1000.0;
        return newAngle %= 360;
      }
    

    // function resetQuaternions() {
    //     // Called when user presses 'Reset' button on our webpage, just below the 
    //     // 'Current Quaternion' display.
    //       var res=5;
    //       qcurr.clear();
    //       document.getElementById('QuatValue').innerHTML= 
    //                                  '\t X=' +qcurr.x.toFixed(res)+
    //                                 'i\t Y=' +qcurr.y.toFixed(res)+
    //                                 'j\t Z=' +qcurr.z.toFixed(res)+
    //                                 'k\t W=' +qcurr.w.toFixed(res)+
    //                                 '<br>length='+qcurr.length().toFixed(res);
    //     }


    function dragQuaternion(xdrag, ydrag) {
        //==============================================================================
        // Called when user drags mouse by 'xdrag,ydrag' as measured in CVV coords.
            var qTmp = new Quaternion(0,0,0,1);
            
            var dist = Math.sqrt(xdrag*xdrag + ydrag*ydrag);
            qNew.setFromAxisAngle(-ydrag + 0.0001, xdrag + 0.0001, 0.0, dist*150.0);
            qTmp.multiply(qNew,qTot);     // apply new rotation to current rotation. 
            qcurr.copy(qTmp);
        };
            
        function myMouseMove(ev, gl, canvas) {
            //==============================================================================
            // Called when user MOVES the mouse with a button already pressed down.
              if(isDrag==false) return;       // IGNORE all mouse-moves except 'dragging'
              var rect = ev.target.getBoundingClientRect(); // get canvas corners in pixels
              var xp = ev.clientX - rect.left;                  // x==0 at canvas left edge
              var yp = canvas.height - (ev.clientY - rect.top); // y==0 at canvas bottom edge
              var x = (xp - canvas.width/2)  /    // move origin to center of canvas and
                           (canvas.width/2);      // normalize canvas to -1 <= x < +1,
              var y = (yp - canvas.height/2) /    //                     -1 <= y < +1.
                           (canvas.height/2);
              g_xMdragTot += (x - g_xMclik);          // Accumulate change-in-mouse-position,&
              g_yMdragTot += (y - g_yMclik);
              dragQuaternion(x - g_xMclik, y - g_yMclik);
              g_xMclik = x;                         // Make next drag-measurement from here.
              g_yMclik = y;
            };
            
            function myMouseUp(ev, gl, canvas) {
            //==============================================================================
            // Called when user RELEASES mouse button pressed previously.
              var rect = ev.target.getBoundingClientRect(); // get canvas corners in pixels
              var xp = ev.clientX - rect.left;                  // x==0 at canvas left edge
              var yp = canvas.height - (ev.clientY - rect.top); // y==0 at canvas bottom edge
              var x = (xp - canvas.width/2)  /    // move origin to center of canvas and
                           (canvas.width/2);      // normalize canvas to -1 <= x < +1,
              var y = (yp - canvas.height/2) /    //                     -1 <= y < +1.
                           (canvas.height/2);
              console.log('myMouseUp  (CVV coords  ):  x, y=\t',x,',\t',y);
              
              isDrag = false;                     // CLEAR our mouse-dragging flag, and
              // accumulate any final bit of mouse-dragging we did:
              g_xMdragTot += (x - g_xMclik);
              g_yMdragTot += (y - g_yMclik);
             dragQuaternion(x - g_xMclik, y - g_yMclik);
            };
    function myKeyDown(ev, gl, u_ViewMatrix, viewMatrix) {
        //===============================================================================
        var xd = camX - moveX;
        var yd = camY - moveY;
        var zd = camZ - moveZ;

        var lxy = Math.sqrt(xd * xd + yd * yd);

        var l = Math.sqrt(xd * xd + yd * yd + zd * zd);


        switch (ev.keyCode) {      // keycodes !=ASCII, but are very consistent for 
            //  nearly all non-alphanumeric keys for nearly all keyboards in all countries.
            case 74:    // j, camera left
                if (flag == -1) theta = -Math.acos(xd / lxy) + 0.1;
                else theta = theta + 0.1;
                moveX = camX + lxy * Math.cos(theta);
                moveY = camY + lxy * Math.sin(theta);
                flag = 1;
                break;
            case 73:    //i, camera up
                moveZ = moveZ + 0.1;
                break;
            case 76:    // k, camera right
                if (flag == -1) theta = -Math.acos(xd / lxy) - 0.1;
                else theta = theta - 0.1;
                moveX = camX + lxy * Math.cos(theta);
                moveY = camY + lxy * Math.sin(theta);
                flag = 1;
                break;
            case 75:    // k, camera down
                moveZ = moveZ - 0.1;
                break;

            case 87:    // w
                moveX = moveX - 0.1 * (xd / l);
                moveY = moveY - 0.1 * (yd / l);
                moveZ = moveZ - 0.1 * (zd / l);

                camX = camX - 0.1 * (xd / l);
                camY = camY - 0.1 * (yd / l);
                camZ = camZ - 0.1 * (zd / l);
                break;

            case 83:    // s
                moveX = moveX + 0.1 * (xd / l);
                moveY = moveY + 0.1 * (yd / l);
                moveZ = moveZ + 0.1 * (zd / l);

                camX = camX + 0.1 * (xd / l);
                camY = camY + 0.1 * (yd / l);
                camZ = camZ + 0.1 * (zd / l);

                break;

            case 68:    // a
                camX = camX - 0.1 * yd / lxy;
                camY = camY + 0.1 * xd / lxy;
                moveX -= 0.1 * yd / lxy;
                moveY += 0.1 * xd / lxy;

                break;
            case 65:    // d
                camX = camX + 0.1 * yd / lxy;
                camY = camY - 0.1 * xd / lxy;
                moveX += 0.1 * yd / lxy;
                moveY -= 0.1 * xd / lxy;

                break;

        }
    }
    function myKeyUp(ev) {
        //===============================================================================
        // Called when user releases ANY key on the keyboard; captures scancodes well

        console.log('myKeyUp()--keyCode=' + ev.keyCode + ' released.');
    }
    function myKeyPress(ev) {
        //===============================================================================
        // Best for capturing alphanumeric keys and key-combinations such as 
        // CTRL-C, alt-F, SHIFT-4, etc.
        console.log('myKeyPress():keyCode=' + ev.keyCode + ', charCode=' + ev.charCode +
                              ', shift=' + ev.shiftKey + ', ctrl=' + ev.ctrlKey +
                              ', altKey=' + ev.altKey +
                              ', metaKey(Command key or Windows key)=' + ev.metaKey);
    }


