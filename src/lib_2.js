// Classes

// The main class for the frontend
class App 
{
    _canvas // canvas element container
    _ctx // Context of the canvas element
    _layers = {} // Layers for canvas

    _panning = false
    _lastPan = []
    _zero = [0, 0]
    _zoom = [1, 1]

    _forceUpdate = true
    _reqID = null

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
        this.setOnDrag()
    }

    start()
    {
        this.drawLayersFrame()
    }

    stop()
    {
        window.cancelAnimationFrame(this._reqID)
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

    importGeoJSON(json)
    {
        const t = this
        json.features.forEach((obj) => {
            t.createShape(obj.geometry.coordinates)
        })
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
        this._layers[layerName].draw(this._ctx, this._forceUpdate, this._zero)
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
        let t = this

        // A function to be requested for AnimationFrame
        function frame()
        {
            if(t._forceUpdate)
                ctx.clear(true);
            
            // Looping through every single Layer object inside array
            for(const layer in layers)
            {
                layers[layer].draw(ctx, t._forceUpdate, t._zero)
            }
            t._forceUpdate = false
            t._reqID = window.requestAnimationFrame(frame);
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

            console.log("x: %s , y: %s", x, y)
            t.shapeClick([x, y])

        }, false);
    }

    setOnDrag()
    {
        let elemLeft = this._canvas.offsetLeft + this._canvas.clientLeft;
        let elemTop = this._canvas.offsetTop + this._canvas.clientTop + this._canvas.clientHeight;

        let t = this;
        this._canvas.addEventListener('mousedown', function(event) {
            var x = event.pageX - elemLeft,
            y = elemTop - event.pageY;
            
            t.mapDown([x, y])
        })

        this._canvas.addEventListener('mousemove', function(event) {
            var x = event.pageX - elemLeft,
                y = elemTop - event.pageY;

            t.mapDrag([x, y])
        })

        this._canvas.addEventListener('mouseup', function(event) {
            t.mapUp()
        })
    }

    mapDown(coord)
    {
        this._lastPan = coord
    }

    mapDrag(coord)
    {
        const t = this
        let x = coord[0], y = coord[1];
        if(this._lastPan == 0)
            return

        this._panning = true
        this._forceUpdate = true;
        t._zero[0] += (x - t._lastPan[0]) ;
        t._zero[1] += (y - t._lastPan[1]) ;

        t._ctx.translate((x - t._lastPan[0]) * (1/t._zoom[0]), (y - t._lastPan[1]) * (1/t._zoom[1]))
        t._lastPan[0] = x
        t._lastPan[1] = y
    }

    mapUp()
    {
        this._lastPan = []
        this._panning = false
    }

    shapeClick(coord)
    {
        if(this._panning)
            return
        const t = this
        for(const layer in t._layers)
        {
            console.log(t._layers[layer].click(coord, t._zero))
        }
    }

    shapeHover(coord)
    {
        if(this._panning)
            return
        const t = this
        for(const layer in t._layers)
        {
            let inside = t._layers[layer].hover(coord, t._zero)
        }
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

            t.shapeHover([x, y])
        }, false);
    }
}

// The class for Shape
class Shape
{
    _polygons = [] // Container for Polygon objects
    _drawBox = [] // Contains leftmost x and y, also rightmost x and y
    _isMultiPolygon // Is the shape is in Multi Polygon format ?
    _fill = '#d3d3d3' // Color for the shape
    _fillList = {
        'click': '#aa0707',
        'hover': '#3750B7',
        'default': '#d3d3d3',
        'border': '#222222'
    }
    _strokeWidth = 0.02

    _isClicked = false
    _isHovered = false
    _updated = false
    _seen = null;

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

        this.setDrawBox()
    }

    setDrawBox()
    {
        let x = [null, null];
        let y = [null, null];

        this._polygons.forEach(function(polygon){
            polygon._nodes.forEach(function(node){
                // Initiate value
                if(x[0] == null)
                {
                    x[0] = node[0]
                    x[1] = node[0]
                }
                if(y[0] == null)
                {
                    y[0] = node[1]
                    y[1] = node[1]
                }
    
                // Finding leftmost x, rightmost x, topmost y and bottommost y
                if(node[0] < x[0])
                    x[0] = node[0]
                else if(node[0] > x[1])
                    x[1] = node[0]
    
                if(node[1] < y[0])
                    y[0] = node[1]
                else if(node[1] > y[1])
                    y[1] = node[1]
            })
        })

        this._drawBox = [x, y]
    }

    // A function to change the fill of the shape
    changeFill(hex)
    {
        this.changeVar("_fill", hex)
        this._updated = true;
    }

    idle()
    {
        this.changeFill(this._fillList.default)
    }

    hover()
    {
        if(this._isClicked)
            return
        this.changeFill(this._fillList.hover)
        this.changeVar("_isHovered", true) 
    }

    click()
    {
        this.changeFill(this._fillList.click)
        this.changeVar("_isClicked", true) 
    }

    changeVar(varName, varValue)
    {
        this[varName] = varValue
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
        // this._updated = true;
    }

    // A function to push created polygon to the arrays
    addPolygon(polygon) // polygon
    {
        this._polygons.push(polygon)
    }

    // A function to draw the shape
    draw(ctx, force = false, zero = null)
    {
        // This function will loop thru _polygons and draw the polygon accordingly
        // In canvas, the first polygon will always be outer ring, and if a polygon is 
        // countering the rotation of the first, then it is a hole

        const t = this

        if(!this.isShapeCanBeSeen(ctx, zero))
            return

        if(!this._updated && !force)
            return

        ctx.fillStyle = t._fill;
        ctx.strokeStyle = t._fillList.border;
        ctx.lineWidth = t._strokeWidth;

        ctx.beginPath();

        this._polygons.forEach(function(polygon){

            // In canvas, first iteration must be calling moveTo function, otherwise lineTo function
            let firstIteration = true;

            let nodes = polygon._nodes

            nodes.forEach((node) => {
                if(firstIteration)
                {
                    ctx.moveTo(node[0], node[1]);
                    firstIteration = false;
                } else {
                    ctx.lineTo(node[0], node[1]);
                }
            })
            ctx.closePath();
        })
        ctx.fill();
        ctx.stroke();
        
        this._updated = false;
    }

    isShapeCanBeSeen(ctx, zero)
    {
        function inside(point, vs) {
            // ray-casting algorithm based on
            // https://wrf.ecse.rpi.edu/Research/Short_Notes/pnpoly.html/pnpoly.html
            
            var x = point[0], y = point[1];
            
            var inside = false;
            for (var i = 0, j = vs.length - 1; i < vs.length; j = i++) {
                var xi = vs[i][0], yi = vs[i][1];
                var xj = vs[j][0], yj = vs[j][1];
                
                var intersect = ((yi > y) != (yj > y))
                    && (x < (xj - xi) * (y - yi) / (yj - yi) + xi);
                if (intersect) inside = !inside;
            }
            
            return inside;
        };

        let isInside = false
        let mapBoundary = [[0, 0], [0, ctx.canvas.height], [ctx.canvas.width, ctx.canvas.height], [ctx.canvas.width, 0], [0, 0]]

        for(var x = 0; x < 2; x++)
        {
            for(var y = 0; y < 2; y++)
            {
                let check = inside([zero[0] + this._drawBox[0][x], zero[1] + this._drawBox[1][y]], mapBoundary)

                if(check)
                {
                    isInside = check
                    // console.log([this._drawBox[0][x], this._drawBox[1][y]], mapBoundary)
                } else {
                    // console.log([this._drawBox[0][x], this._drawBox[1][y]], mapBoundary)
                }
            }
        }

        if(this._seen !== isInside)
            this._seen = isInside
        
        return isInside
    }

    // A function to check if a point is inside of the shape
    isPointInsideShape(point, zero)
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
                let inside = polygon.isPointInsidePolygon(point, zero)
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
    isPointInsidePolygon(point, zero)
    {
        // ray-casting algorithm based on
        // https://wrf.ecse.rpi.edu/Research/Short_Notes/pnpoly.html/pnpoly.html

        // An array o contain boolean value of "if the point is outside the hole of polygon"
        let outsideHole = [];
        
        // X and Y coordinates of the point
        var x = point[0], y = point[1];
        let vs = this._nodes
        
        // A variable to contain the boolean value of "if the point is inside the outer ring"
        var inside = false;
        for (var i = 0, j = vs.length - 1; i < vs.length; j = i++) {
            var xi = vs[i][0] + zero[0], yi = vs[i][1] + zero[1];
            var xj = vs[j][0] + zero[0], yj = vs[j][1] + zero[1];
            
            var intersect = ((yi > y) != (yj > y))
                && (x < (xj - xi) * (y - yi) / (yj - yi) + xi);
            if (intersect) inside = !inside;
        }

        // Looping thru each hole to find the boolean value of "if the point is outside the hole of polygon"
        this._holes.forEach((hole) => {
            let out = !hole.isPointInsidePolygon(point, zero)
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
    draw(ctx, forceUpdate = false, zero = null)
    {
        // If the state of the layer is hidden then abort
        if(this._hidden)
            return
        
        // Draw
        this._shapes.forEach((shape) => {
            shape.draw(ctx, forceUpdate, zero)
        })
    }

    // A function to check if the point is inside on of the shape(s) and then return the shape accordingly
    click(point, zero)
    {
        let clickedShape = null

        this._shapes.forEach((shape) => {
            let inside = shape.isPointInsideShape(point, zero)
            if(inside)
            {
                shape.click()
                clickedShape = shape
            }
            else
            {
                if(shape._isClicked)
                {
                    shape.changeVar("_isClicked", false)
                    shape.idle()
                }
            }
        })

        return clickedShape
    }

    // A function to check if the point is inside on of the shape(s) and then return the shape accordingly
    hover(point, zero)
    {
        let hoveredShape = null

        this._shapes.forEach((shape) => {
            let inside = shape.isPointInsideShape(point, zero)
            if(inside)
            {
                shape.hover()
                hoveredShape = shape
            }
            else
            {
                if(shape._isHovered || shape._isClicked)
                {
                    shape.changeVar("_isHovered", false)
                    shape.changeVar("_isClicked", false)
                    shape.idle()
                }
            }
        })

        return hoveredShape
    }
}