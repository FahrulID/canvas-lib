// Classes

// The main class for the frontend
class App 
{
    _canvas // canvas element container
    _ctx // Context of the canvas element
    _layers = {} // Layers for canvas

    constructor(id)
    {
        // initiate variables
        this._canvas = document.getElementById(id);
        this._ctx = this._canvas.getContext('2d')
        this._ctx.canvas.width  = window.innerWidth;
        this._ctx.canvas.height = window.innerHeight;

        // Normalize Y+ coord to top
        this._ctx.scale(1, -1); // Flip Y+ coordinate to top instead of bottom
        this._ctx.translate(0, -this._ctx.canvas.height)

        CanvasRenderingContext2D.prototype.clear = CanvasRenderingContext2D.prototype.clear || function (preserveTransform) {
            if (preserveTransform) {
            this.save();
            this.setTransform(1, 0, 0, 1, 0, 0);
            }

            this.clearRect(0, 0, this.canvas.width, this.canvas.height);

            if (preserveTransform) {
            this.restore();
            }           
        };

        // Create a 'default' layer
        this.createLayer('default')
        this.setOnClick()
        this.setOnHover()
    }

    start()
    {
        this.drawLayersFrame()
    }

    // A function to create layer
    createLayer(layerName)
    {
        // _layers is an array for Layer class objects
        this._layers[layerName] = new Layer(layerName);
    }

    // A function to create shape by providing nodes coordinates and layer name to draw on to
    createShape(nodes, layerName = 'default')
    {
        // Create new object Shape using provided nodes
        let newShape = new Shape(nodes)

        // Adding shape in to layer with name of layer name and push it in to the layer array
        this._layers[layerName].addShape(newShape)
    }

    // A function to reset the canvas
    resetCanvas()
    {
        this._ctx.clear(true);
    }

    // A function to draw a single layer
    drawLayer(layerName)
    {
        this.resetCanvas()
        // Calling function draw inside the object Layer
        this._layers[layerName].draw(this._ctx)
    }

    // A function to draw all layers
    drawLayers()
    {
        const t = this
        // Looping through every single Layer object inside array
        for(const layer in this._layers)
        {
            t.drawLayer(layer)
        }
    }

    drawLayersFrame()
    {
        // Create a requestAnimationFrame to animate the entire canvas
        let ctx = this._ctx
        let layers = this._layers

        // A function to be requested for AnimationFrame
        function frame()
        {
            ctx.clear(true);
            
            // Looping through every single Layer object inside array
            for(const layer in layers)
            {
                layers[layer].draw(ctx)
            }
            window.requestAnimationFrame(frame);
        }
        window.requestAnimationFrame(frame);
    }

    setOnClick()
    {
        // To Be Change callback in Paramater

        // Get X and Y coordinate of click on canvas
        let elemLeft = this._canvas.offsetLeft + this._canvas.clientLeft;
        let elemTop = this._canvas.offsetTop + this._canvas.clientTop + this._canvas.clientHeight;

        let t = this;

        this._canvas.addEventListener('click', function(event) {
            var x = event.pageX - elemLeft,
                y = elemTop - event.pageY;

            for(const layer in t._layers)
            {
                console.log(t._layers[layer].click([x, y], "#aa0707"))
            }
        }, false);
    }

    setOnHover()
    {
        // To Be Change callback in Paramater

        // Get X and Y coordinate of hover on canvas
        let elemLeft = this._canvas.offsetLeft + this._canvas.clientLeft;
        let elemTop = this._canvas.offsetTop + this._canvas.clientTop + this._canvas.clientHeight;

        let t = this;

        this._canvas.addEventListener('mousemove', function(event) {
            var x = event.pageX - elemLeft,
                y = elemTop - event.pageY;

            for(const layer in t._layers)
            {
                let inside = t._layers[layer].click([x, y], "#3750B7")
                if(inside)
                    console.log(inside)
            }
        }, false);
    }
}

// The class for Shape
class Shape
{
    _polygons = [] // Container for Polygon objects
    _isMultiPolygon // Is the shape is in Multi Polygon format ?
    _fill = '#d3d3d3' // Color for the shape

    constructor(nodes, reverse = false)
    {
        // Check if the format of polygon is valid
        if(!this.isValid(nodes))
            return

        // Check if it is a multipolygon or not and call the create polygon function accordingly
        if(this._isMultiPolygon)
            this.createMultiPolygon(nodes)
        else   
            this.createPolygon(nodes)
    }

    // A function to change the fill of the shape
    changeFill(hex)
    {
        this._fill = hex
    }

    // A function to check if the nodes are valid by counting the nested array and the type of last array's value
    // Polygon : 3 arrays
    // Multi polygon : 4 arrays
    isValid(nodes)
    {
        let check = (list) => list.every(a => Array.isArray(a) && a.every(b => Array.isArray(b) && b.every(c => typeof c === "number")))
        let polygon = check(nodes)
        if(polygon)
        {
            this._isMultiPolygon = false
            return polygon
        }
        let multipolygon = nodes.every(a => Array.isArray(a) && check(a))
        if(multipolygon)
        {
            this._isMultiPolygon = true
            return multipolygon
        }
        return false
    }

    // A function to create polygons from Multipolygon formats
    createMultiPolygon(nodes)
    {
        const t = this

        nodes.forEach((polygon) => {
           t.createPolygon(polygon) 
        })
    }

    // A funcion to create polygons ( holes too ) from Polygon formats
    createPolygon(nodes)
    {
        const t = this
        
        // OuterRingIsCW is a variable to contain the first polygon is it a CW or CCW so the Holes must be the other way
        // With this variable we can accept both GeoJSON format and inversed GeoJSON format
        let outerRingIsCW = null

        // polygonBefore is a variable to contain the last polygon object
        // With this variable we can add Holes to the according polygon
        let polygonBefore = null

        nodes.forEach((node) => {
            let polygon = new Polygon(node)

            // if OuterRingIsCW is not yet initiated ( First polygon )
            if(outerRingIsCW === null)
                outerRingIsCW = polygon._isClockwise

            // If it's a hole polygon
            if(polygon._isClockwise !== outerRingIsCW)
            {
                polygonBefore.addHole(polygon)
            }
            
            polygonBefore = polygon;
            t.addPolygon(polygon)
        })
            
    }

    // A function to push created polygon to the arrays
    addPolygon(polygon) // polygon
    {
        this._polygons.push(polygon)
    }

    // A function to draw the shape
    draw(ctx)
    {
        // This function will loop thru _polygons and draw the polygon accordingly
        // In canvas, the first polygon will always be outer ring, and if a polygon is 
        // countering the rotation of the first, then it is a hole

        const t = this

        ctx.fillStyle = t._fill;
        ctx.beginPath();

        this._polygons.forEach(function(polygon){

            // In canvas, first iteration must be calling moveTo function, otherwise lineTo function
            let firstIteration = true;

            let nodes = polygon._nodes

            nodes.forEach((node) => {
                if(firstIteration)
                {
                    ctx.moveTo(node[0]*10, node[1]*10); // Remember change this
                    firstIteration = false;
                } else {
                    ctx.lineTo(node[0]*10, node[1]*10); // Remember change this
                }
            })
            ctx.closePath();
        })
        ctx.fill();
    }

    // A function to check if a point is inside of the shape
    isPointInsideShape(point)
    {
        // OuterRingIsCW is a variable to contain the first polygon is it a CW or CCW so the Holes must be the other way
        // With this variable we can accept both GeoJSON format and inversed GeoJSON format
        let outerRingIsCW = null

        // An array to contain the boolean value of every outer ring value, if the point is inside the outerring and outside of holes of it
        let isInside = [];
        this._polygons.forEach((polygon) => {

            // if OuterRingIsCW is not yet initiated ( First polygon )
            if(outerRingIsCW === null)
                outerRingIsCW = polygon._isClockwise

            // If it's an outer ring polygon ( Not a hole )
            if(polygon._isClockwise === outerRingIsCW)
            {
                let inside = polygon.isPointInsidePolygon(point)
                isInside.push(inside)
            }
        })
        return isInside.includes(true)
    }
}

// Clowckwise = fill
// Counterclockwise = hole
// Multi Polygon = add many polygons
class Polygon
{
    _nodes // Container for the nodes
    _isClockwise // A variable to contain if the polygon is CW or not
    _holes = [] // Container for the holes of the polygon

    constructor(nodes)
    {
        this._nodes = nodes
        this._isClockwise = this.isClockwise()
    }

    // A function to check if a polygon is CW or not
    isClockwise()
    {
        let dots = this._nodes
        var sum = 0;
        for(var i=1, n=dots.length; i<n; i++){
            sum += (dots[i][0] - dots[i-1][0]) * (dots[i][1] + dots[i-1][1]);
        }
        sum += (dots[0][0] - dots[n-1][0]) * (dots[0][1] + dots[n-1][1]);
        return sum < 0;
    }

    // A function to push a hole polygon into the container
    addHole(polygon)
    {
        this._holes.push(polygon)
    }

    // A function to reverse the order of nodes, so if it's a CW then after calling this will be CCW
    reverse()
    {
        this._nodes = this._nodes.reverse()
        this._isClockwise = !this._isClockwise
    }

    // A function to check if the point is inside the polygon
    isPointInsidePolygon(point)
    {
        // ray-casting algorithm based on
        // https://wrf.ecse.rpi.edu/Research/Short_Notes/pnpoly.html/pnpoly.html

        // An array o contain boolean value of "if the point is outside the hole of polygon"
        let outsideHole = [];
        
        // X and Y coordinates of the point
        var x = point[0] / 10, y = point[1] / 10; // Remember change this
        let vs = this._nodes
        
        // A variable to contain the boolean value of "if the point is inside the outer ring"
        var inside = false;
        for (var i = 0, j = vs.length - 1; i < vs.length; j = i++) {
            var xi = vs[i][0], yi = vs[i][1];
            var xj = vs[j][0], yj = vs[j][1];
            
            var intersect = ((yi > y) != (yj > y))
                && (x < (xj - xi) * (y - yi) / (yj - yi) + xi);
            if (intersect) inside = !inside;
        }

        // Looping thru each hole to find the boolean value of "if the point is outside the hole of polygon"
        this._holes.forEach((hole) => {
            let out = !hole.isPointInsidePolygon(point)
            outsideHole.push(out)
        })

        // If there is a hole in polygon then the point have to be outsed the holes, else just return true
        let outside = (outsideHole.length > 0 ) ? outsideHole.every(v => v === true) : true;

        // Returns true if it's inside the outer ring and also outside of holes ( if holes exists )
        return inside && outside;
    }
}

class Layer
{
    _name // Container of the layer's name
    _shapes = [] // Container for the shapes
    _hidden = false // Container of the state of layer, is hidden or not

    constructor(layerName)
    {
        this._name = layerName
    }

    // A function to push created shape object into the container
    addShape(shape)
    {
        this._shapes.push(shape)
    }

    // A function to toggle the state of hidden for the layer
    toggleHide()
    {
        this._hidden = !this._hidden
    }

    // A function to draw every shape inside the layer
    draw(ctx)
    {
        // If the state of the layer is hidden then abort
        if(this._hidden)
            return
        
        // Draw
        this._shapes.forEach((shape) => {
            shape.draw(ctx)
        })
    }

    // A function to check if the point is inside on of the shape(s) and then return the shape accordingly
    click(point, fill)
    {
        let clickedShape = null

        this._shapes.forEach((shape) => {
            let inside = shape.isPointInsideShape(point)
            if(inside)
            {
                shape.changeFill(fill)
                clickedShape = shape
            }
            else
                shape.changeFill("#d3d3d3")
        })

        return clickedShape
    }
}