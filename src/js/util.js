//////////////////////////////////
// Utility
//////////////////////////////////

export function if_undefined(x, my_default) {
    return (x === undefined) ? my_default : x;
}

export function reversed(arr) {
    let res = [];
    for (let j = arr.length - 1; j > -1; j--)
        res.push(arr[j]);
    return res;
}

export function round(x, decimals) {
    // Rounds x to the nearest decimal place
    // Arguments
    //  x: a Number
    //  decimals (optional, default=0): the number of decimal places to round to
    if (decimals === undefined)
        decimals = 0;
    return Math.round(x * 10**decimals) / 10**decimals;
}

export function colorFromHex(hex_code) {
    let res = [];
    let start_index = (hex_code[0] === '#') ? 1 : 0;
    for (let i = start_index; i < hex_code.length; i += 2)
        res.push(Number.parseInt(hex_code.substring(i, i + 2), 16));
    return res;
}

export function colorScale(colors, discrete) {
    // returns a function that maps a percent in [0, 1] to a range of colors
    // Arguments:
    //  colors: an array of 3-length rgb arrays (e.g [[0, 0, 0], [255, 255, 0]])
    //  discrete (optional, default=false): whether to create a discrete color map
    if (discrete === undefined)
        discrete = false;
    return (percent) => {
        if (percent <= 0)
            return colors[0];
        if (percent >= 1.0)
            return colors[colors.length - 1];
        if (discrete) {
            let color_index = Math.floor(percent * colors.length);
            return colors[color_index]; 
        }
        
        let color_index = Math.floor(percent * (colors.length - 1)); 
        let c1 = colors[color_index];
        let c2 = colors[color_index + 1];
        
        // Linearly interpolate between c1 and c2
        let c1_percent = color_index / (colors.length - 1);
        let c2_percent = (color_index + 1) / (colors.length - 1);
        percent = (percent - c1_percent) / (c2_percent - c1_percent);
        let res = [];
        for (let i = 0; i < c1.length; i++)
            res.push(Math.floor(c1[i] + (c2[i] - c1[i]) * percent))
        return res;
    }
}
 
// Colors taken from https://github.com/Kitware/ParaView/blob/6777e1303f9d1eb341131354616241dbc5851340/Wrapping/Python/paraview/_colorMaps.py#L1599
export const ice_to_fire = colorScale(
    [[0, 30, 77], [0, 55, 134], [14, 88, 168], [32, 126, 184], [48, 164, 202], [83, 200, 223],
    [155, 228, 239], [225, 233, 209], [243, 213, 115], [231, 176, 0], [218, 130, 0], [198, 84, 0],
    [172, 35, 0], [130, 0, 0], [76, 0, 0]], true
);

export const lagoon = colorScale([
    [153, 218, 196], [81, 171, 173],[0, 123, 150],[0, 76, 119],[0, 30, 77]], true
);
    
export const dark_ocean = colorScale(
    ["010108","000240","22226b","37377d","2C6FC7"].map(colorFromHex)
);

export function celsius_to_f(c) {
    return c * (9 / 5) + 32;
}

export function mod(a, b) {
    // Return a mod b; % is not the modulo operator in JS, see
    // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/Remainder
    return ((a % b) + b) % b;
}

export function parseMyDate(date_string) {
    // This function parses a UTC date in the format YYYY-MM-DD HH
    const year  = date_string.substring( 0,  4);
    const month = date_string.substring( 5,  7);
    const day   = date_string.substring( 8, 10);
    const hour  = date_string.substring(11, 13);
    return new Date(Date.parse(`${year}-${month}-${day}T${hour}:00Z`));
}

export function point_in_polygon(point, polygon) {
    // returns true if the point is inside the given polygon
    // To do this, I implement the ray-casting algorithm shown here:
    // https://rosettacode.org/wiki/Ray-casting_algorithm
    //
    // Arguments:
    //  point: an array of size 2 [x, y]
    //  polygon: an array containing x, y pairs [[x1, y1], [x2, y2], ...]

    const epsilon = 0.0001;
    function ray_intersects_segment(p1, p2) {
        // returns 1 if eastward ray from point intersects line segment p1 -> p2
        // for a mathematical explanation see https://www.desmos.com/calculator/fjmvdmryje
        // avoid ray on vertex problem by shifting point up
        let [x, y] = point;
        if (y === p1[1] || y === p2[1])
            y += epsilon;

        const dy = p2[1] - p1[1];
        if (dy === 0)
            return 0;

        const t_p = (y - p1[1]) / dy;
        const t_r = p1[0] + (p2[0] - p1[0]) * t_p - x;
        if (t_r >= 0 && 0 <= t_p && t_p <= 1)
            return 1;
        return 0;
    }

    let count = 0;
    for (let i = 1; i < polygon.length; i++) {
        let prev = polygon[i - 1];
        let cur = polygon[i];
        count += ray_intersects_segment(prev, cur);
    }
    count += ray_intersects_segment(polygon[polygon.length - 1], polygon[0]);

    return count % 2 === 1;
}

// Bilinear Interpolation on a grid
// See https://en.wikipedia.org/wiki/Bilinear_interpolation
export function bilinear(x, y, grid, default_value) {
    if (default_value === undefined)
        default_value = 0;
    let n_rows = grid.length;
    let n_cols = grid[0].length;
    let i = Math.floor(x);
    let j = Math.floor(y);
    let get_grid = (j, i) => (i >= 0 && i < n_cols && j >= 0 && j < n_rows && isFinite(grid[j][i])) ? grid[j][i] : undefined;
    let f00 = if_undefined(get_grid(j, i), default_value);
    let f10 = if_undefined(get_grid(j, i + 1), f00);
    let f01 = if_undefined(get_grid(j + 1, i), f00);
    let f11 = if_undefined(get_grid(j + 1, i + 1), f00);
    x -= i;
    y -= j;
    return f00 + (f10 - f00) * x + (f01 - f00) * y + (f11 - f10 - f01 + f00) * x * y;
}

// Cache point in lake tahoe for performance boost
const point_lake_cache = {};
const shoreline_path = require('../static/shoreline.json');
export function point_in_lake_tahoe(point) {
    // returns true if the point exists within the boundaries of lake tahoe
    // Arguments
    //  point: an array of size 2 [x, y] with both 0 <= x, y <= 1
    const p_string = String(point);
    if (p_string in point_lake_cache)
        return point_lake_cache[p_string];
    const res = point_in_polygon(point, shoreline_path);
    point_lake_cache[p_string] = res;
    return res;
}

// Cache for performance boost
const lake_points_cache = {};
export function points_in_lake_tahoe(width, height) {
    // returns a list [(x, y), ...] of coordinates in lake tahoe
    //  within the bounds of the rectangle (0, 0, width, height) 
    // Arguments
    //  width: width of rectangle
    //  height: height of rectangle
    const key = `${width}_${height}`;
    if (key in lake_points_cache)
        return lake_points_cache[key];
    const res = [];
    for (let j = 0; j < height; j++)
        for (let i = 0; i < width; i++)
            if (point_in_lake_tahoe([i / width, 1 - j / height]))
                res.push([i, j])
    lake_points_cache[key] = res;
    return res;
}

export function draw_lake_tahoe(cx, x, y, width, height) {
    // draws a closed polygon of lake tahoe using the given context
    // Arguments:
    //  cx: HTML Canvas 2D context
    //  x: x coordinate of the top left corner of where to draw polygon
    //  y: y coordinate of the top left corner of where to draw polygon
    //  width: width of the polygon to draw
    //  height: height of the polygon to draw
    cx.beginPath();
    let [x_poly_start, y_poly_start] = shoreline_path[0];
    cx.moveTo(x + x_poly_start * width, y + (1 - y_poly_start) * height)
    for (let i = 1; i < shoreline_path.length; i++) {
        let [x_poly, y_poly] = shoreline_path[i];
        cx.lineTo(x + x_poly * width, y + (1 - y_poly) * height);
    }
    cx.lineTo(x + x_poly_start * width, x + (1 - y_poly_start) * height);
    cx.fill();
}

const heatmap_cache = {};
export function draw_lake_heatmap(canvas, heatmap_data, color_palette, key) {
    // draws a heatmap of lake tahoe using the given context
    // Arguments:
    //  canvas: a canvas HTML element
    //  heatmap_data: a 2D matrix with scalar Number values, NaN's are okay
    //  color_palette: a function that maps heatmap scalar values to an integer rgb color array
    //  key (optional): a string hash for the heatmap data, used in caching image creation for performance boost

    const cx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;
    const offsetX = 0;
    const offsetY = 0;

    const [n_rows, n_cols] = [heatmap_data.length, heatmap_data[0].length];
    const T = heatmap_data;

    if (key in heatmap_cache) {
        const image_data = heatmap_cache[key];
        cx.putImageData(image_data, offsetX, offsetY);
        return;
    }

    // Create image object
    // See https://developer.mozilla.org/en-US/docs/Web/API/Canvas_API/Tutorial/Pixel_manipulation_with_canvas
    // For more details
    const image_data = cx.createImageData(width, height);
    const points_in_lake = points_in_lake_tahoe(width, height);
    for (let [i, j] of points_in_lake) {
        let x = i / width * n_cols;
        let y = j / height * n_rows;
        let t_j = Math.floor(y);
        let t_i = Math.floor(x);

        const pixel_index = (j * (image_data.width * 4)) + (i * 4);
        let val = 0;
        
        // if this pixel is inside the lake but not defined by the heatmap matrix
        // let it's value be the average of its defined neighbors
        if (isNaN(T[t_j][t_i])) {
            val = 0;
            let count = 0;
            // Average Temperature of neighboring pixels
            for (let m = 0; m < 3; m++)
                for (let n = 0; n < 3; n++) {
                    const neighbor_j = t_j - 1 + m;
                    const neighbor_i = t_i - 1 + n;
                    if (0 <= neighbor_j && neighbor_j < n_rows && 
                        0 <= neighbor_i && neighbor_i < n_cols && 
                        isFinite(T[neighbor_j][neighbor_i])) {
                        val += T[neighbor_j][neighbor_i];
                        count += 1;
                    }
                }
            if (count > 0)
                val /= count;
        }
        else {
            // Nearest Neighbor
            val = T[t_j][t_i];
        }
        // Smooth with bilinear interpolation
        // val = bilinear(x, y, T, val);

        let [r, g, b] = color_palette(val);
        image_data.data[pixel_index + 0] = r;
        image_data.data[pixel_index + 1] = g;
        image_data.data[pixel_index + 2] = b;
        image_data.data[pixel_index + 3] = 255;
    }
    cx.putImageData(image_data, offsetX, offsetY);
    if (key !== undefined)
        heatmap_cache[key] = image_data;
}

export function militaryHourTo12Hour(hour) {
    // converts military hour to the 12 hour format
    // For a math explanation see https://www.desmos.com/calculator/xqlinlqtns
    // Arguments:
    //  hour: an integer between 0 and 24
    return mod(hour - 1, 12) + 1;
}

export function apply(array, callback_fn) {
    // Applies a callback function to every value of a multi-dimensional array
    // Similar to Array.prototype.map, except in-place and multi-dimensional
    for (let [idx, value] of array.entries()) {
        if (Array.isArray(value))
            apply(value, callback_fn);
        else
            array[idx] = callback_fn(value);
    }
    return array;
}

export function zip(...arrays) {
    // Converts a tuple of arrays into an array of tuples
    // Example:
    // zip(["a", "b", "c"], [1, 2, 3]) => [["a", 1], ["b", 2], ["c", 3]]
    // Arguments
    //  ...arrays: any number of arrays to zip; if the arrays are not
    //    equal in length, then all arrays are treated as if they have
    //    the same length as the smallest length array in arrays
    if (arrays.length === 0)
        return [];

    let min_length = Math.min(...arrays.map((arr) => arr.length));
    let zipped = [];
    for (let i = 0; i < min_length; i++) {
        let tuple = [];
        for (let j = 0; j < arrays.length; j++)
            tuple.push(arrays[j][i]);
        zipped.push(tuple);
    }
    return zipped;
}

export function unzip(arr) {
    // Unzips an array of tuples into a tuple of arrays
    // Example:
    // [['a', 1], ['b', 2], ['c', 3]] => [['a', 'b', 'c'], [1, 2, 3]]
    // Arguments:
    //  arr: a 2D array, every row in arr should have the same length
    if (arr.length === 0) 
        return [];

    let res = [];
    for (let i = 0; i < arr[0].length; i++)
        res.push([]);
    for (let tuple of arr) {
        for (let [idx, value] of tuple.entries())
            res[idx].push(value);
    }
    return res;
}

export function clamp(x, min, max) {
    // Clips x between [min, max] 
    // Arguments:
    //  x: the value to clip; a Number
    //  min: the minimum bound of x; a Number
    //  max: the maximum bound of x; a Number
    if (x < min) return min;
    if (x > max) return max;
    return x;
}

export function mean(arr, k) {
    // Computes the mean of an array of Numbers
    // Arguments:
    //  arr: the array of numbers to compute the mean for
    //  k (optional): a positive integer, the window size if a moving mean is desired
    if (k === undefined)
        return arr.reduce((total, num) => total + num, 0) / arr.length;

    if (k < 1 || k > arr.length)
        throw new Error(`mean(): Expected moving window size k to be 1 <= k <= arr.length, got k=${k}`);

    let res = [0];
    for (let i = 0; i < k; i++)
        res[0] += arr[i];
    res[0] /= k;
        
    // O(n) DP algorithm for moving mean
    for (let i = k; i < arr.length; i++)
        res.push(res[res.length - 1] + (arr[i] - arr[i - k]) / k);

    return res;
}

const DEG_TO_RAD = Math.PI / 180;
export function wind_direction_mean(wd_vector, k, units, nan_var) {
    // Computes the mean of wind direction given some wind direction vector
    //
    // Wind direction can't be averaged by linear statistics and thus 
    // circular mean for the cardinal wind direction must be used
    //
    // Arguments:
    //  wd_vector: a list of wind directions
    //  k (optional, default=wd_vector.length): an integer, using to compute a moving average
    //  units (optional, default: 'deg'): either 'deg' or 'rad' 
    //  nan_var (optional, default: 'omitnan') either 'omitnan' or 'nanmean'
    //      MODE 'omitnan': will skip over NaNs within wd_vector
    //      MODE 'nanmean': will return NaN if a NaN is exists in wd_vector
    //
    // Returns:
    //  a Number, if 1 <= k < wd_vector.length
    //  an Array, otherwise

    k = if_undefined(k, wd_vector.length);
    units = if_undefined(units, 'deg');
    nan_var = if_undefined(nan_var, 'omitnan');

    if (nan_var === 'nanmean' && wd_vector.some(isNaN))
        return Number.NaN;
    else
        wd_vector = wd_vector.filter(isFinite);

    if (units === 'deg') 
        wd_vector.forEach((e, idx) => {
            wd_vector[idx] *= DEG_TO_RAD;       
        });

    const u = wd_vector.map(Math.sin);
    const v = wd_vector.map(Math.cos);
    const mean_u = mean(u, k);
    const mean_v = mean(v, k);
    
    const mean_wd = [];
    for (let i = 0; i < mean_u.length; i++) {
        let wd_i = Math.atan2(mean_u[i], mean_v[i]);
        wd_i = mod(wd_i, 2 * Math.PI);
        mean_wd.push(wd_i);
    } 

    if (units === 'deg')
        mean_wd.forEach((_, idx) => {
            mean_wd[idx] /= DEG_TO_RAD;
        });
    
    if (k === wd_vector.length)
        return mean_wd[0];
    return mean_wd;
}

export async function http_get(url, params, headers, mode) {
    // Makes a GET request to a url and return a response
    // 
    // Arguments:
    //  url: a String, the web address to make a request to
    //  params (optional): a dictionary of queries to send with the request
    //  headers (optional): headers to attach to the request
    //  mode (optional, default "cors"): "cors", "no-cors", or "same-origin"
    headers = if_undefined(headers, { "Content-Type": "application/json" });
    mode = if_undefined(mode, "cors");

    const url_obj = new URL(url);
    if (params !== undefined)
        url_obj.search = new URLSearchParams(params).toString();

    let request = await fetch(url_obj, 
        {
            method: "GET",
            mode: mode,
            headers: headers
        }
    );
    return await request.json();
}
