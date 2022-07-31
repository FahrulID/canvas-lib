// Global functions

function array_equals(a, b)
{
  return a.length === b.length && a.every(function(value, index) {
    return value === b[index];
  });
};
// console.log(getdim(123)); // []
// console.log(getdim([1])); // [1]
// console.log(getdim([1, 2])); // [2]
// console.log(getdim([1, [2]])); // false
// console.log(getdim([[1, 2], [3]])); // false
// console.log(getdim([[1, 2],[1, 2]])); // [2, 2]
// console.log(getdim([[1, 2],[1, 2],[1, 2]])); // [3, 2]

// console.log(getdim([[[1, 2, 3],[1, 2, 4]],[[2, 1, 3],[4, 4, 6]]])); // [2, 2, 3]

// console.log(getdim([[[1, 2, 3], [1, 2, 4]], [[2, 1], [4, 4]]])); // false
function getdim(arr)
{
  if (/*!(arr instanceof Array) || */!arr.length) {
    return []; // current array has no dimension
  }
  var dim = arr.reduce(function(result, current) {
    // check each element of arr against the first element
    // to make sure it has the same dimensions
    return array_equals(result, getdim(current)) ? result : false;
  }, getdim(arr[0]));

  // dim is either false or an array
  return dim && [arr.length].concat(dim);
}

// Classes

class App 
{
    _canvas
    _ctx
    _layers = {}

    constructor(id)
    {
        this._canvas = document.getElementById(id);
        this._ctx = this._canvas.getContext('2d')
        this._ctx.canvas.width  = window.innerWidth;
        this._ctx.canvas.height = window.innerHeight;
        this.createLayer('default')
    }

    createLayer(layerName)
    {
        this._layers[layerName] = new Layer(layerName);
    }

    createShape(nodes, layerName = 'default')
    {
        let newShape = new Shape(nodes)
        this._layers[layerName].addShape(newShape)
    }

    drawLayer(layerName)
    {
        this._layers[layerName].draw(this._ctx)
    }

    drawLayers()
    {
        for(const layer in this._layers)
        {
            layer.draw(this._ctx)
        }
    }
}

class Shape
{
    _polygons = []
    _isMultiPolygon

    constructor(nodes)
    {
        if(!this.isValid(nodes))
            return false

        
        if(this._isMultiPolygon)
            this.createMultiPolygon(nodes)
        else   
            this.createPolygon(nodes)
        return true
    }

    isValid(nodes)
    {
        let dims = getdim(nodes)
        if(dims.length == 2)
        {
            // Regular Polygon
            this._isMultiPolygon = false
        } else if(dims.length == 3)
        {
            // Multi polygon
            this._isMultiPolygon = true
        } else {
            return false;
        }
        return true;
    }

    createMultiPolygon(nodes)
    {
        // nodes structure :
        // [ [ [x,y], [x',y'], [x'',y''] ], [ [x,y], [x',y'], [x'',y''] ] ]
        const t = this
        nodes.forEach((node) => {
            let polygon = new Polygon(node)
            t.addPolygon(polygon)
        })
    }

    createPolygon(nodes)
    {
        // nodes structure :
        // [ [x,y], [x',y'], [x'',y''] ]
        let polygon = new Polygon(nodes)
        this.addPolygon(polygon)
    }

    addPolygon(polygon) // polygon
    {
        this._polygons.push(polygon)
    }
}

// Clowckwise = fill
// Counterclockwise = hole
// Multi Polygon = add many polygons
class Polygon
{
    _nodes
    _isClockwise

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

    reverse()
    {
        this._nodes = this._nodes.reverse()
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

    }
}