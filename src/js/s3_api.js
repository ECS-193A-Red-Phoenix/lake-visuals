import { loadNPY } from "./numpy_parser";
import { apply, celsius_to_f, reversed } from "./util";

const base_url = "https://lake-tahoe-conditions.s3.us-west-2.amazonaws.com/";

export class S3 {
    static async get(path) {
        // Retrieves a file from our S3 bucket
        // Arguments:
        //  path: a String, the path to the file
        const url = `${base_url}${path}`;
        return fetch(url, 
            {
                method: "GET",
                mode: "cors"
            }
        )
    }

    static async get_files(directory) {
        // Retrieves contents.json from S3 and returns files available in the specified folder
        // Arguments:
        //  directory: a String, the name of the folder
        let contents = await S3.get("contents.json");
        contents = await contents.json();
        if (!(directory in contents))
            throw new Error(`Couldn't find directory '${directory}' in contents.json file`);
        return contents[directory];
    }

    static async get_temperature_files() {
        let t_files = await S3.get_files("temperature");
        return t_files.map((file_name) => NPYFile.from_dated_file("temperature", file_name));
    }
    
    static async get_flow_files() {
        let uv_files = await S3.get_files("flow");
        return uv_files.map((file_name) => NPYFile.from_dated_file("flow", file_name));
    }
}

class NPYFile {
    constructor(file_path, time) {
        this.file_path = file_path;
        this.time = time; 
        this.matrix = undefined;
    }

    static from_dated_file(file_dir, file_name) {
        // Constructs a NPYFile from a dated file name
        // Arguments:
        //  file_dir: the directory of the file in S3, with no '/' at the end
        //  file_name: the name of the file, formatted as "YYYY-MM-DD HH.npy"
        let year = parseInt(file_name.substring(0, 4));
        let month = parseInt(file_name.substring(5, 7)); // 01 - 12
        let day = parseInt(file_name.substring(8, 10));
        let hour = parseInt(file_name.substring(11, 13));
        let file_date = new Date(year, month - 1, day, hour);

        if (file_dir === "temperature")
            return new TemperatureFile(file_dir + "/" + file_name, file_date);
        else if (file_dir === "flow")
            return new FlowFile(file_dir + "/" + file_name, file_date);
        throw new Error(`NPYFile.from_dated_file(): Unexpected file dir ${file_dir}`);
    }

    async download() {
        // Only download if matrix is undefined or null
        if (this.matrix !== undefined && this.matrix !== null)
            return;
        try {
            let response = await S3.get(this.file_path);
            response = await response.blob();
            response = await loadNPY(response);
            this.matrix = response;
        } catch (error) {
            console.log(error);
            this.matrix = null;
        }
        return this.matrix;
    }
}

class TemperatureFile extends NPYFile {
    async download() {
        if (this.matrix !== undefined && this.matrix !== null)
            return;
        try {
            await super.download();
            this.matrix = reversed(this.matrix);
            apply(this.matrix, celsius_to_f);
        } catch (error) {
            console.log(error);
            this.matrix = null;
        }
        return this.matrix;
    }
}

class FlowFile extends NPYFile {
    async download() {
        if (this.matrix !== undefined && this.matrix !== null)
            return;
        try {
            await super.download();
            let [u, v] = this.matrix;
            u = reversed(u);
            v = reversed(v);
            this.matrix = [u, v];
        } catch (error) {
            console.log("flowfile", error);
            this.matrix = null;
        }
        return this.matrix;
    }
}