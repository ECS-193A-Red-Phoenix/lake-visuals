import { select, pointer } from "d3";
import { useRef, useEffect } from "react";
import { Particle, VectorField } from "../../js/particle";
import { draw_lake_heatmap, round } from "../../js/util";

import "../../css/CurrentChart.css";

//////////////////////////////////
// Static Lake Map constants
//////////////////////////////////
const num_particles = 3500;
const MS_TO_FTM = 196.85;

function CurrentLakeMap(props) {
    ////////////////////////////////////
    // Component Constants
    ////////////////////////////////////
    const container_ref = useRef();

    const {u, v, color_palette} = props;
    const [n_rows, n_cols] = [u.length, u[0].length];
    const aspect_ratio = n_cols / n_rows;

    const speeds = [];
    for (let j = 0; j < n_rows; j++) {
        const row = [];
        for (let i = 0; i < n_cols; i++) {
            if (typeof u[j][i] !== 'number' || typeof v[j][i] !== 'number') {
                row.push("nan");
                continue;
            }
            const speed = (u[j][i]**2 + v[j][i]**2)**0.5;
            row.push(speed);
        }
        speeds.push(row);
    }

    useEffect(() => {
        const canvas = container_ref.current.querySelector("canvas");
        const cx = canvas.getContext('2d');
        // Resize canvas
        canvas.width = canvas.offsetWidth;
        canvas.height = canvas.width / aspect_ratio;

        const chart_width = canvas.width;
        const chart_height = canvas.height;

        ////////////////////////////////////
        // Cursor Hover Event
        ////////////////////////////////////
        select(canvas).on("mousemove", function (event) {
            const [x, y] = pointer(event);
            const [i, j] = [Math.floor(x / chart_width * n_cols), Math.floor(y / chart_height * n_rows)];
            if (i < 0 || i >= n_cols || j < 0 || j >= n_rows || isNaN(speeds[j][i])) {
                select(".current-chart-cursor")
                    .style("display", "none");
                return;
            }        
            
            const [px, py] = [x / chart_width * 100, y / chart_height * 100];
            const speed = round(speeds[j][i] * MS_TO_FTM);
            select(".current-chart-cursor")
                .style("display", "block")
                .style("left", `${px}%`)
                .style("top", `${py}%`)
                .text(`${speed} ft/min`);
        });
        select(canvas).on("mouseleave", () => {
            select(".current-chart-cursor")
                .style("display", "none");
        });

        ////////////////////////////////
        // Particle Generator
        ////////////////////////////////
        const square_size = (chart_width) / n_cols;

        const vector_field = new VectorField(u, v, square_size);
        const particles = [];
        for (let k = 0; k < num_particles; k++)
            particles.push( Particle.newRandom(vector_field) );

        ////////////////////////////////////
        // Animation Loop
        ////////////////////////////////////
        const interval = setInterval(() => {
            draw_lake_heatmap(canvas, speeds, color_palette, props.cache_id);
            select(container_ref.current)
                .select("span")
                .style("display", "none");
                
            particles.forEach((p) => p.draw(cx));
            particles.forEach((p) => p.move());
        }, 50);
        return () => clearInterval(interval);
      }, [u, v, color_palette, speeds]);

    return (
        <div ref={container_ref} className="current-chart-canvas-container">
            <span> Preparing Vector Fields </span>
            <canvas></canvas>
            <div className="current-chart-cursor"> Cursor </div>
        </div>
    );
}

export default CurrentLakeMap;