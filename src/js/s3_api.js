import { loadNPY } from "./numpy_parser";
import { apply, celsius_to_f, reversed } from "./util";

const base_url = "https://lake-tahoe-conditions.s3.us-west-2.amazonaws.com/";

// Examples
// temperature/2022-02-20+08.npy
// => 2022022008
// flow/2022-02-14 18.npy
// =? 2022021418

function get_s3(path) {
    const url = `${base_url}${path}`;
    return fetch(url, 
        {
            method: "GET",
            mode: "cors"
        }
    )
}

async function get_s3_matrix(path) {
    let response = await get_s3(path);
    response = await response.blob();
    response = await loadNPY(response);
    return response;
}

export async function get_temperature_matrix(year, month, day, hour) {
    let matrix = await get_s3_matrix(`temperature/${year}-${month}-${day} ${hour}.npy`);
    matrix = reversed(matrix);
    apply(matrix, celsius_to_f);
    return matrix;
}

export async function get_flow_matrix(year, month, day, hour) {
    let [u, v] = await get_s3_matrix(`flow/${year}-${month}-${day} ${hour}.npy`);
    u = reversed(u);
    v = reversed(v);
    return [u, v];
}