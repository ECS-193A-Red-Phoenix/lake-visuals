const readASCII = (view, byteOffset, numBytes) => {
    var ascii = "";
    for (var i = 0; i < numBytes; i++) {
        var val = view.getUint8(byteOffset + i);
        // \0 character end of string
        if (val === 0)
            break;
        ascii += String.fromCharCode(val);
    }
    return ascii;
};

function numElements(shape) {
    // Returns the number of elements of a shape array
    // Arguments:
    //  shape: an array of integers, e.g [1, 3, 5]
    if (shape.length === 0) return 1;
    return shape.reduce((prev, cur) => prev * cur, 1);
}

const dtypeTypedArrayMap = {
    '<f8': function (s) { return new Float64Array(s); },
    '<f4': function (s) { return new Float32Array(s); },
    '<i4': function (s) { return new Int32Array(s); },
    '<i2': function (s) { return new Int16Array(s); },
    '<i1': function (s) { return new Int8Array(s); },
    '|u4': function (s) { return new Uint32Array(s); },
    '|u2': function (s) { return new Uint16Array(s); },
    '|u1': function (s) { return new Uint8Array(s); },
};

class Tensor {
    // A Tensor is a wrapper for multi-dimensional typed arrays that
    // are stored in memory as 1 dimensional typed arrays (row major order)

    constructor(array, shape, dtype) {
        this.array = array;
        this.shape = shape;
        this.dtype = dtype;
    }

    at(...indices) {
        // Access the value of the tensor at specified dimensions
        // Arguments:
        //  indices: a list of integers
    
        // Check number of indices match shape
        if (indices.length !== this.shape.length)
            throw new Error(`AccessError: Expected ${this.shape.length} indices, got ${indices.length}`);
            
        let index = 0;
        let offset = 1;
        for (let [dim, idx] of indices.entries()) {
            // Check index is in bounds
            if (idx < 0 || idx >= this.shape[dim])
                throw new Error(`AccessError: index ${idx} at dim ${dim} exceeds dim length ${this.shape[dim]}`);

            index += offset * idx;
            offset *= this.shape[dim];
        }

        return this.array[index];
    }

    toArray() {
        // Converts tensor to a vanilla JS Array
        // !!! Warning !!!
        // - This function is only implemented for tensors of 3 or less dimensions.
        // the reason for this is I don't have the time to think about how to generalize it
        // to more dimensions, and we are only using 2 and 3 dimensions for our use case.
        
        const length = numElements(this.shape);
        const res = [];
        if (this.shape.length === 0) {
            return res;
        } 
        else if (this.shape.length === 1) {
            for (let i = 0; i < length; i++)
                res.push(this.array[i]);
        } 
        else if (this.shape.length === 2) {
            let [rows, cols] = this.shape;
            for (let r = 0; r < rows; r++) {
                const row_values = [];
                for (let c = 0; c < cols; c++) {
                    row_values.push(this.array[r * cols + c]);
                }
                res.push(row_values)
            }
        } else if (this.shape.length === 3) {
            let [dz, dy, dx] = this.shape;
            for (let z = 0; z < dz; z++) {
                const z_values = [];
                for (let y = 0; y < dy; y++) {
                    const y_values = [];
                    for (let x = 0; x < dx; x++) {
                        y_values.push(this.array[z * dy * dx + y * dx + x])
                    }
                    z_values.push(y_values);
                }
                res.push(z_values)
            }
        }
        else {
            throw new Error(`UnImplemented Error: Tensor has an unsupported number of 
                dimensions (${this.shape.length}). TODO: Generalize this function`);
        }

        return res;
    }
}

export async function loadNPY(blob) {
    // Reads a .npy file and loads it into an array
    // Equivalent to numpy.load in python
    //
    // This code is adapted from the 'read-npy-file' npm package.
    // See https://github.com/NicholasTancredi/read-npy-file/blob/master/index.js 
    //
    // See the following for the numpy file format specification
    // https://numpy.org/devdocs/reference/generated/numpy.lib.format.html#format-version-1-0
    //
    // Arguments:
    //  blob: a Blob to be read (note: a File is a instance of Blob)

    const reader = new FileReader();
    const array_buffer = await new Promise((resolve) => {
        reader.addEventListener("load", () => resolve(reader.result));
        reader.readAsArrayBuffer(blob);
    });

    const view = new DataView(array_buffer);
    let pos = 0;

    // The first 6 bytes must match the magic string \x93NUMPY
    const magic_string = readASCII(view, pos, 6);
    pos += 6;
    if (magic_string !== '\x93NUMPY')
        throw new Error("Not a numpy file");

    // Read the version number. Only version 1.0 is supported
    const version_major = view.getUint8(pos);
    const version_minor = view.getUint8(pos + 1);
    pos += 2;
    if (version_major !== 1 || version_minor !== 0)
        throw new Error(`Unsupported numpy file version ${version_major}.${version_minor}`);

    // Read Header
    // The header is almost JSON, so we manipulate it until it is; to use JSON.parse
    // Example Header {'descr': '<f8', 'fortran_order': False, 'shape': (1, 2), }
    const header_length = view.getUint16(pos, true);
    pos += 2;
    let header = readASCII(view, pos, header_length);
    pos += header_length;
    header = header
        .replace("True", "true")
        .replace("False", "false")
        .replace(/'/g, "\"")
        .replace(/,\s*}/, " }")
        .replace(/,?\)/, "]")
        .replace("(", "[");
    header = JSON.parse(header);
    const { shape, fortran_order, descr } = header;
    const dtype = descr;

    // Check unsupported feature
    if (fortran_order)
        throw Error("NPY parse error. TODO: Implement the uncommon optional fortran_order.");
    
    // Check bytes left match the number of elements specified
    const bytesLeft = view.byteLength - pos;
    const element_byte_size = parseInt(dtype[dtype.length - 1]);
    if (bytesLeft !== numElements(shape) * element_byte_size)
        throw RangeError(`Invalid bytes for numpy dtype '${dtype}'`);

    // Check dtype is a supported type
    if (!(dtype in dtypeTypedArrayMap)) 
        throw Error("Unknown dtype \"" + dtype + "\". Either invalid or requires javascript implementation.");

    // Finally, read the actual array data
    const typed_array_creator = dtypeTypedArrayMap[dtype];
    let data_array = array_buffer.slice(pos, pos + bytesLeft);
    data_array = typed_array_creator(data_array);

    // Convert to vanilla Array
    return new Tensor(data_array, shape, dtype).toArray();
}

export async function openLocalFile(file_path) {
    const response = await fetch(file_path, {
        headers : { 
            'Content-Type': 'application/octet-stream',
            'Accept': 'application/octet-stream'
        }
    });
    return response.blob();
}

export async function loadNumpyFile(file_path) {
    let blob = await openLocalFile(file_path);
    return loadNPY(blob);
}