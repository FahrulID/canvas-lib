class App {
    _canvas;
    _ctx;

    _shapes = []

    _zoomScale = [1, 1]; // x, y
    _minmaxZoom = [[0.1, 0.1], [100, 100]] // min [x, y], max [x, y]
    _zoomIntensity = 0.2;
    _lastTranslate = [0, 0] // x, y
    _lastTranslateZoom = [0, 0] // x, y

    _lastPan = []

    constructor(canvas)
    {
        this._canvas = document.getElementById(canvas);
        this._ctx = this._canvas.getContext('2d')
        this._ctx.canvas.width  = window.innerWidth;
        this._ctx.canvas.height = window.innerHeight;
        this.setEvents();
    }

    setEvents()
    {
        this.setClearCanvas();
        this.setOnClick();
        this.setOnScroll();
        this.setOnDrag();
    }

    setOnClick()
    {
        let elemLeft = this._canvas.offsetLeft + this._canvas.clientLeft;
        let elemTop = this._canvas.offsetTop + this._canvas.clientTop;

        let t = this;

        this._canvas.addEventListener('click', function(event) {
            var x = event.pageX - elemLeft,
                y = event.pageY - elemTop;

            // Collision detection between clicked offset and element.
            t._shapes.forEach((shape) => {
                if(shape.isClicked([x, y], t._zoomScale, t._lastTranslate))
                {
                    console.log(shape)
                }
            })
        }, false);
    }

    setOnDrag()
    {
        let elemLeft = this._canvas.offsetLeft + this._canvas.clientLeft;
        let elemTop = this._canvas.offsetTop + this._canvas.clientTop;

        let t = this;
        this._canvas.addEventListener('mousedown', function(event) {
            var x = event.pageX - elemLeft,
                y = event.pageY - elemTop;
            t._lastPan[0] = x
            t._lastPan[1] = y
        })

        this._canvas.addEventListener('mousemove', function(event) {
            if(t._lastPan.length > 0)
            {
                var x = event.pageX - elemLeft,
                    y = event.pageY - elemTop;

                t._lastTranslate[0] += (x - t._lastPan[0]) ;
                t._lastTranslate[1] += (y - t._lastPan[1]) ;

                t._ctx.translate((x - t._lastPan[0]) * (1/t._zoomScale[0]), (y - t._lastPan[1]) * (1/t._zoomScale[1]))
                t._lastPan[0] = x
                t._lastPan[1] = y

                console.log(t._lastTranslate)
                t.redrawAll()
            }
        })

        this._canvas.addEventListener('mouseup', function(event) {
            t._lastPan = []
        })
    }

    setOnScroll()
    {
        let elemLeft = this._canvas.offsetLeft + this._canvas.clientLeft;
        let elemTop = this._canvas.offsetTop + this._canvas.clientTop;

        let t = this;
        this._canvas.addEventListener('mousewheel', function(evt) {
            var x = event.pageX - elemLeft,
                y = event.pageY - elemTop;

            let delta = event.deltaY < 0 ? 1 : -1;
            if (delta) 
                t.zoom([x, y], delta);
            console.log(evt)
        }, false);
    }

    setClearCanvas()
    {
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
    }

    zoom(click, delta)
    {
        let zoom = Math.exp(delta * this._zoomIntensity);

        this._ctx.translate((click[0] - this._lastTranslate[0]) * (1/this._zoomScale[0]), (click[1] - this._lastTranslate[1]) * (1/this._zoomScale[1]))

        this._ctx.scale(zoom, zoom)

        this._zoomScale[0] *= zoom
        this._zoomScale[1] *= zoom

        this._ctx.translate((-click[0] + this._lastTranslate[0]) * (1/this._zoomScale[0]), (-click[1] + this._lastTranslate[1]) * (1/this._zoomScale[1]))

        this.redrawAll()
    }

    createShape(polygons)
    {
        let newShape = new Shape(polygons);
        newShape.draw(this._ctx)
        this._shapes.push(newShape)
    }

    redrawAll()
    {
        this._ctx.clear(true);

        this._shapes.forEach((shape) => {
            shape.draw(this._ctx);
        })
    }
}

class Shape {
    _coord = {x: 0, y: 0};
    _polygons;
    _translatedPolygons;
    _fill = "#f00"

    constructor(polygons)
    {
        this._polygons = polygons;
        this._translatedPolygons = polygons;
        this.setCoord()
    }

    translate(x, y)
    {
        this._translatedPolygons = this._translatedPolygons.map((el)=>{
            return [el[0] + x, el[1] +y]
        })
    }

    setCoord()
    {
        let x = [null, null];
        let y = [null, null];

        this._polygons.forEach(function(el){
            // Initiate value
            if(x[0] == null)
            {
                x[0] = el[0]
                x[1] = el[0]
            }
            if(y[0] == null)
            {
                y[0] = el[1]
                y[1] = el[1]
            }

            // Finding leftmost x, rightmost x, topmost y and bottommost y
            if(el[0] < x[0])
                x[0] = el[0]
            else if(el[0] > x[1])
                x[1] = el[0]

            if(el[1] < y[0])
                y[0] = el[1]
            else if(el[1] > y[1])
                y[1] = el[1]
        })

        // Center x and y
        let centerX = x[0] + ((x[1] - x[0]) / 2);
        let centerY = y[0] + ((y[1] - y[0]) / 2);

        this._coord.x = centerX
        this._coord.y = centerY
    }

    draw(ctx)
    {
        ctx.fillStyle = this._fill;
        ctx.beginPath();
        let firstIteration = true;
        this._polygons.forEach(function(el){
            if(firstIteration)
            {
                ctx.moveTo(el[0], el[1]);
                firstIteration = false;
            } else {
                ctx.lineTo(el[0], el[1])
            }
        })
        ctx.closePath();
        ctx.fill();
    }

    isClicked(click, scale, translate)
    {
        // ray-casting algorithm based on
        // https://wrf.ecse.rpi.edu/Research/Short_Notes/pnpoly.html/pnpoly.html
        
        var x = click[0], y = click[1];
        
        var inside = false;
        for (var i = 0, j = this._polygons.length - 1; i < this._polygons.length; j = i++) {
            var xi = (this._polygons[i][0] * scale[0]) + translate[0], yi = (this._polygons[i][1] * scale[1]) + translate[1];
            var xj = (this._polygons[j][0] * scale[0]) + translate[0], yj = (this._polygons[j][1] * scale[1]) + translate[1];
            
            var intersect = ((yi > y) != (yj > y))
                && (x < (xj - xi) * (y - yi) / (yj - yi) + xi);
            if (intersect) inside = !inside;
        }

        console.log('Clicked on x:%s and y:%s but the %s, %s', x, y, (this._polygons[0][0] * scale[0]) + translate[0], (this._polygons[0][1] * scale[1]) + translate[1])

        return inside;
    }
}

class Layer {

}