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
        let ctx = this._ctx
        let layers = this._layers

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
        
        let elemLeft = this._canvas.offsetLeft + this._canvas.clientLeft;
        let elemTop = this._canvas.offsetTop + this._canvas.clientTop + this._canvas.clientHeight;

        let t = this;

        this._canvas.addEventListener('click', function(event) {
            var x = event.pageX - elemLeft,
                y = elemTop - event.pageY;

            for(const layer in t._layers)
            {
                console.log(t._layers[layer].click([x, y]))
            }
        }, false);
    }

    setOnHover()
    {
        
        let elemLeft = this._canvas.offsetLeft + this._canvas.clientLeft;
        let elemTop = this._canvas.offsetTop + this._canvas.clientTop + this._canvas.clientHeight;

        let t = this;

        this._canvas.addEventListener('mousemove', function(event) {
            var x = event.pageX - elemLeft,
                y = elemTop - event.pageY;

            for(const layer in t._layers)
            {
                let inside = t._layers[layer].click([x, y])
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
    _fill = '#f00' // Color for the shape

    constructor(nodes, reverse = false)
    {
        if(!this.isValid(nodes))
            return

        
        if(this._isMultiPolygon)
            this.createMultiPolygon(nodes)
        else   
            this.createPolygon(nodes)
    }

    changeFill(hex)
    {
        this._fill = hex
    }

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

    createMultiPolygon(nodes)
    {
        const t = this

        nodes.forEach((polygon) => {
           t.createPolygon(polygon) 
        })
    }

    createPolygon(nodes)
    {
        const t = this
        
        let polygonBefore = null
        nodes.forEach((node) => {
            let polygon = new Polygon(node)

            // If it's a hole polygon
            if(!polygon._isClockwise) // remove ! for GeoJson format, add for otherwise
            {
                polygonBefore.addHole(polygon)
            }
            
            polygonBefore = polygon;
            t.addPolygon(polygon)
        })
            
    }

    addPolygon(polygon) // polygon
    {
        this._polygons.push(polygon)
    }

    draw(ctx)
    {
        const t = this

        ctx.fillStyle = t._fill;
        ctx.beginPath();

        this._polygons.forEach(function(polygon){

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

    isPointInsideShape(point)
    {
        let isInside = [];
        this._polygons.forEach((polygon) => {
            if(polygon._isClockwise) // add ! for GeoJson format, remove for otherwise
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
    _nodes
    _isClockwise
    _holes = []

    constructor(nodes)
    {
        this._nodes = nodes
        this._isClockwise = this.isClockwise()
    }

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

    addHole(polygon)
    {
        this._holes.push(polygon)
    }

    reverse()
    {
        this._nodes = this._nodes.reverse()
    }

    isPointInsidePolygon(point)
    {
        // ray-casting algorithm based on
        // https://wrf.ecse.rpi.edu/Research/Short_Notes/pnpoly.html/pnpoly.html

        let outsideHole = [];
        
        var x = point[0] / 10, y = point[1] / 10; // Remember change this
        let vs = this._nodes
        
        var inside = false;
        for (var i = 0, j = vs.length - 1; i < vs.length; j = i++) {
            var xi = vs[i][0], yi = vs[i][1];
            var xj = vs[j][0], yj = vs[j][1];
            
            var intersect = ((yi > y) != (yj > y))
                && (x < (xj - xi) * (y - yi) / (yj - yi) + xi);
            if (intersect) inside = !inside;
        }

        this._holes.forEach((hole) => {
            let out = !hole.isPointInsidePolygon(point)
            outsideHole.push(out)
        })

        let outside = (outsideHole.length > 0 ) ? outsideHole.every(v => v === true) : true;

        return (inside && outside) ? true : false;
    }
}

class Layer
{
    _name
    _shapes = []
    _hide = false

    constructor(layerName)
    {
        this._name = layerName
    }

    addShape(shape)
    {
        this._shapes.push(shape)
    }

    toggleHide()
    {
        this._hide = !this._hide
    }

    draw(ctx)
    {
        if(this._hide)
            return
        
        // Draw
        this._shapes.forEach((shape) => {
            shape.draw(ctx)
        })
    }

    click(point)
    {
        let isInside = [];

        this._shapes.forEach((shape) => {
            let inside = shape.isPointInsideShape(point)
            if(inside)
                shape.changeFill("#066ec9")
            else
                shape.changeFill("#F00")
            isInside.push(inside)
        })

        return isInside.includes(true)
    }
}