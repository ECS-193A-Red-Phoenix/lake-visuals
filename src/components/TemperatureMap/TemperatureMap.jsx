import { useEffect, useRef } from "react";
import { draw_lake_heatmap, if_undefined, round } from "../../js/util";
import { select, pointer } from "d3";

function TemperatureMap(props) {
    ////////////////////////////////////
    // Expected props
    //  T: a 2D matrix of scalar values for the heatmap
    //  units: a String, the units of T
    //  color_palette: a function that maps a value in T to an [r, g, b] color
    //  cache_id (optional): a unique identifier for this heatmap (provides a significant performance boost)
    //  decimal_places (optional, default=0): how many decimal places to round the cursor hover value
    const container_ref = useRef();
    const {T, units, color_palette} = props;
    const decimal_places = if_undefined(props.decimal_places, 0);

    ////////////////////////////////////
    // Dimensions
    ////////////////////////////////////
    const [n_rows, n_cols] = [T.length, T[0].length];
    const aspect_ratio = n_cols / n_rows;

    ////////////////////////////////////
    // Draw Heatmap
    ////////////////////////////////////
    useEffect(() => {
        const canvas = container_ref.current.querySelector("canvas");

        // Resize canvas
        canvas.width = canvas.offsetWidth;
        canvas.height = canvas.width / aspect_ratio;

        let start_time = Date.now();
        draw_lake_heatmap(canvas, T, color_palette, props.cache_id);
        let end_time = Date.now();

        console.log(`Took ${end_time - start_time} ms to draw image`);

        // Hide message
        select(container_ref.current)
            .select("span")
            .style("display", "none");
    }, [T, color_palette]);

    ////////////////////////////////////
    // Cursor Hover Event
    ////////////////////////////////////
    useEffect(() => {
        const canvas = container_ref.current.querySelector("canvas");
        const cursor = select(container_ref.current).select(".temperature-cursor");

        select(canvas).on("mousemove", function (event) {
            const [x, y] = pointer(event);
            const [i, j] = [Math.floor(x / canvas.width * n_cols), Math.floor(y / canvas.height * n_rows)];
            if (i < 0 || i >= n_cols || j < 0 || j >= n_rows || isNaN(T[j][i])) {
                cursor.style("display", "none");
                return;
            }
            
            const [px, py] = [x / canvas.width * 100, y / canvas.height * 100];
            const temp = round(T[j][i], decimal_places);
            cursor.style("display", "block")
                .style("left", `${px}%`)
                .style("top", `${py}%`)
                .text(`${temp} ${units}`);
        });

        select(canvas).on("mouseleave", () => {
            cursor.style("display", "none");
        });
    }, [n_cols, n_rows, T]);
    
    return (
        <div ref={container_ref} className="temperature-chart-container">
            <span> Preparing Temperature Map </span>
            <canvas></canvas>
            <div className="temperature-cursor"> Cursor </div>
        </div>
    );
}

export default TemperatureMap;