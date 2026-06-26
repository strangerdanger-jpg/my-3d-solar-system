export class srenderer {
    constructor(canvas) {

        // initialises the WebGl rendering context for the provided HTML canvas
        this.gl = canvas.getContext('webgl2');

        // error handling for legacy browsers or systems without gpu acceleration
        if (!this.gl) {
            alert("WebGL not supported");
            return;
        }
        // ensures that closer objects hide objects behind them
        this.gl.enable(this.gl.DEPTH_TEST);
        this.gl.disable(this.gl.CULL_FACE);

        // vertex Shader: handles 3D coordinate transformations per vertex
        const vsSource = `
            attribute vec4 aVertexPosition;
            attribute vec3 aVertexNormal;

            uniform mat4 uModelViewMatrix;
            uniform mat4 uViewMatrix;
            uniform mat4 uProjectionMatrix;

            varying vec3 vNormal;
            varying vec3 vPosition;

            void main() {
                vec4 viewPosition = uModelViewMatrix * aVertexPosition;
                gl_Position = uProjectionMatrix * viewPosition;

                vNormal = aVertexNormal;
                vPosition = viewPosition.xyz;
            }
        `;

        // fragment shader: determines the colour and lightin of each pixel
        const fsSource = `
            // fragment shader
            precision mediump float;
            varying vec3 vNormal;
            varying vec3 vPosition;
            uniform vec3 uColor;
            uniform int uIsSun;

            void main() {
                if (uIsSun == 1) {
                    // The Sun glows with its own color
                    gl_FragColor = vec4(uColor, 1.0); 
                } else {
                    // Light radiates from the center (0,0,0) where the Sun is
                    vec3 lightDir = normalize(-vPosition); // Light coming from the origin
                    
                    // Standard Lambertian reflection
                    float diff = max(dot(normalize(vNormal), lightDir), 0.0); 
                    
                    // Boost the ambient light so the planets aren't just silhouettes
                    vec3 ambient = uColor * 0.2;
                    vec3 diffuse = uColor * diff * 0.8;
                    
                    gl_FragColor = vec4(ambient + diffuse, 1.0);
                }
            }
        `;
        
        // compiles shaders and links them into a usable gpu program
        this.programInfo = this.initShaderProgram(vsSource, fsSource);
        
        // generates sphere geomentry (unit radius)
        this.sphereData = this.createSphere(1, 24, 24);

        // loads the generated geometry into VRAM
        this.setupBuffers();
    }
    
    // The Graphics Pipeline
    initShaderProgram(vsSource, fsSource) {

        // Helper function to compile individual shader source code 
        const loadShader = (gl, type, source) => {
            const shader = gl.createShader(type);
            gl.shaderSource(shader, source);
            gl.compileShader(shader);
            if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)){
                console.error('Shader comile error:', gl.getShaderInfoLog(shader));
                gl.deleteShader(shader);
                return null;
            }
            return shader;
        };

        // Links fragment and vertex shaders into a single pipline
        const gl = this.gl;
        const vertexShader = loadShader(gl, gl.VERTEX_SHADER, vsSource);
        const fragmentShader = loadShader(gl, gl.FRAGMENT_SHADER, fsSource);
        const shaderProgram = gl.createProgram();
        gl.attachShader(shaderProgram, vertexShader);
        gl.attachShader(shaderProgram, fragmentShader);
        gl.linkProgram(shaderProgram);        

        if (!gl.getProgramParameter(shaderProgram, gl.LINK_STATUS)) {
            console.error('Unable to initialise the shader program: ' + gl.getProgramInfoLog(shaderProgram));
            return null;
        }

        return {
            program: shaderProgram,
            attribLocations: {
                vertexPosition: gl.getAttribLocation(shaderProgram, 'aVertexPosition'),
                vertexNormal: gl.getAttribLocation(shaderProgram, 'aVertexNormal'),
                textureCoord: gl.getAttribLocation(shaderProgram, 'aTextureCoord'),
            },
            uniformLocations: {
                projectionMatrix: gl.getUniformLocation(shaderProgram, 'uProjectionMatrix'),
                modelViewMatrix: gl.getUniformLocation(shaderProgram, 'uModelViewMatrix'),
                uColor: gl.getUniformLocation(shaderProgram, 'uColor'),
                uIsSun: gl.getUniformLocation(shaderProgram, 'uIsSun'),
            },
        };
    }

    createSphere(radius, latBands, lonBands) {
        const positions = [];
        const normals = [];
        const indices = [];
        const textureCoords =[];
        

        for (let lat = 0; lat <= latBands; lat++) {
            let theta = lat * Math.PI / latBands;
            let sinTheta = Math.sin(theta);
            let cosTheta = Math.cos(theta);

            for (let lon = 0; lon <= lonBands; lon++) {
            let phi = lon * 2 * Math.PI / lonBands;
            let sinPhi = Math.sin(phi);
            let cosPhi = Math.cos(phi);

            let x = cosPhi * sinTheta;
            let y = cosTheta;
            let z = sinPhi * sinTheta;
            
            // UV mapping math
            let u = 1 - (lon / lonBands);
            let v = 1 - (lat / latBands);

            positions.push(radius * x, radius * y, radius * z);
            normals.push(x, y, z);
            textureCoords.push(u, v);
            }
        }

        // Connects the dots into trangles
        for (let lat = 0; lat < latBands; lat++) {
            for (let lon = 0; lon < lonBands; lon++) {
                let first = (lat * (lonBands + 1)) + lon;
                let second = first + lonBands + 1;
                indices.push(first, second, first + 1);
                indices.push(second, second + 1, first + 1);
            }
        }
        return { 
            positions: new Float32Array(positions), 
            normals: new Float32Array(normals), 
            indices: new Uint16Array(indices),
            textureCoords: new Float32Array(textureCoords),
         };
    }

    setupBuffers() {
        const gl = this.gl;
        this.positionBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, this.positionBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, this.sphereData.positions, gl.STATIC_DRAW);
        
        this.normalBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, this.normalBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, this.sphereData.normals, gl.STATIC_DRAW);

        this.indexBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.indexBuffer);
        gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, this.sphereData.indices, gl.STATIC_DRAW);    
    }

    bindBuffers() {
        const gl = this.gl;
        // Bind Position Buffer
        gl.bindBuffer(gl.ARRAY_BUFFER, this.positionBuffer);
        gl.vertexAttribPointer(this.programInfo.attribLocations.vertexPosition, 3, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(this.programInfo.attribLocations.vertexPosition);

        // Bind Normal Buffer (for lighting)
        gl.bindBuffer(gl.ARRAY_BUFFER, this.normalBuffer);
        gl.vertexAttribPointer(this.programInfo.attribLocations.vertexNormal, 3, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(this.programInfo.attribLocations.vertexNormal);
    }

    render(state, scale) {
    
        /*const gl = this.gl;

        gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);

        // Clear screen and depth buffer
        gl.clearColor(0.0, 0.0, 0.05, 1.0); // Dark space blue
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

        const fieldOfView = 45 * Math.PI / 180;
        const aspect = gl.canvas.clientWidth / gl.canvas.clientHeight;
        const projectionMatrix = mat4.create();
        mat4.perspective(projectionMatrix, fieldOfView, aspect, 0.1, 10000.0);
        gl.useProgram(this.programInfo.program);

        state.bodies.forEach(body => {
            const modelViewMatrix = mat4.create();
            const time = performance.now() * 0.001; // Current time in seconds
            const isSun = body.name === 'Sun' || body.isSun === true; 
            gl.uniform1i(this.programInfo.uniformLocations.uIsSun, isSun ? 1 : 0);
            
            // Moves the planet based on Python coordinates
            // multiplies coords by 'scale' to make sure they fit on screen
            mat4.translate(modelViewMatrix, modelViewMatrix, [
                body.position.x * scale, 
                body.position.y * scale, 
                 - 50.0 // Pushes it back so the camera can see it
            ]);

            // using radius property from JSON to scale the sphere
            let visualScale = body.radius ? (body.radius * scale * 1000) : 1.0; 
            mat4.scale(modelViewMatrix, modelViewMatrix, [visualScale, visualScale, visualScale]);

            // This tells the GPU what color and position to use for the next draw call
            gl.uniform3fv(this.programInfo.uniformLocations.uColor, body.color || [1, 1, 1]);
            gl.uniformMatrix4fv(this.programInfo.uniformLocations.projectionMatrix, false, projectionMatrix);
            gl.uniformMatrix4fv(this.programInfo.uniformLocations.modelViewMatrix, false, modelViewMatrix);

            //Tells the GPU which buffers to use
            this.bindBuffers();
            gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.indexBuffer);
            gl.drawElements(gl.TRIANGLES, this.sphereData.indices.length, gl.UNSIGNED_SHORT, 0);*/


            // Set uniform color based on JSON (e.g., body.color = [0, 0.5, 1])
            /*const uColorLoc = gl.getUniformLocation(this.programInfo.program, "uColor");
            gl.uniform3fv(uColorLoc, body.color || [1, 1, 1]);

            gl.uniformMatrix4fv(this.programInfo.uniformLocations.projectionMatrix, false, projectionMatrix);
            gl.uniformMatrix4fv(this.programInfo.uniformLocations.modelViewMatrix, false, modelViewMatrix);
            gl.drawArrays(gl.TRIANGLES, 0, this.sphereData.positions.length / 3);*/

            
        const gl = this.gl;
        gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
        gl.clearColor(0.0, 0.0, 0.02, 1.0); // Very dark blue space
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

        const projectionMatrix = mat4.create();
        mat4.perspective(projectionMatrix, 45 * Math.PI / 180, gl.canvas.width / gl.canvas.height, 0.1, 10000.0);

        // This is your Camera! We move it back so we can see the origin (0,0,0)
        const viewMatrix = mat4.create();
        mat4.translate(viewMatrix, viewMatrix, [0, 0, -100]); 

        gl.useProgram(this.programInfo.program);

        state.bodies.forEach(body => {
            const modelMatrix = mat4.create();
            const isSun = body.name === 'Sun' || body.isSun === true; 
            
            // 1. Position the body relative to the Sun (Origin)
            mat4.translate(modelMatrix, modelMatrix, [
                body.position.x * scale, 
                body.position.y * scale, 
                body.position.z * scale
            ]);

            // 2. Scale the body so it's visible
            // Force the Sun to be big, and planets to be at least size 2.0
            let visualScale = isSun ? 10.0 : 3.0; 
            mat4.scale(modelMatrix, modelMatrix, [visualScale, visualScale, visualScale]);

            // 3. Combine matrices: Projection * View * Model
            const modelViewMatrix = mat4.create();
            mat4.multiply(modelViewMatrix, viewMatrix, modelMatrix);

            gl.uniform1i(this.programInfo.uniformLocations.uIsSun, isSun ? 1 : 0);
            gl.uniform3fv(this.programInfo.uniformLocations.uColor, body.color || (isSun ? [1, 0.8, 0] : [0.5, 0.5, 0.5]));
            gl.uniformMatrix4fv(this.programInfo.uniformLocations.projectionMatrix, false, projectionMatrix);
            gl.uniformMatrix4fv(this.programInfo.uniformLocations.modelViewMatrix, false, modelViewMatrix);

            this.bindBuffers();
            gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.indexBuffer);
            gl.drawElements(gl.TRIANGLES, this.sphereData.indices.length, gl.UNSIGNED_SHORT, 0);
        });
    }
    
}
