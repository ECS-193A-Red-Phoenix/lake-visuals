import { useEffect, useMemo, useRef } from "react";
import { Particle, VectorField } from "../../js/particle";
import { round } from "../../js/util";

//////////////////////////////////////////////
// Static constants
//////////////////////////////////////////////
const num_particles = 60;
const conversion_ratio = 196.85;
const units = "feet per minute";
const scale = 1.5;
const aspect_ratio = 0.35;

function CurrentLegendBox(props) {
    ////////////////////////////////////
    // Component Constants
    ////////////////////////////////////
    const canvas_ref = useRef();
    let width = props.width;
    if (width === undefined) 
        width = 68 * scale;
    let height = props.height;
    if (height === undefined)
        height = width * aspect_ratio;
    
    ////////////////////////////////////
    // Particle generator
    ////////////////////////////////////
    const vector_field = useMemo(() => new VectorField([[props.speed]], [[0]], width, height), [props.speed]);
    const particles = useMemo(() => {
        let res = [];
        for (let k = 0; k < num_particles; k++)
            res.push( Particle.newRandom(vector_field) );
        return res;
    }, [vector_field]);

    ////////////////////////////////////
    // Animation Loop
    ////////////////////////////////////
    useEffect(() => {
        const canvas = canvas_ref.current;
        const cx = canvas.getContext('2d');

        const interval = setInterval(() => {
            vector_field.drawWetCells(cx, 0, 0, props.color_palette);
            
            particles.forEach((p) => p.draw(cx, 0, 0));
            particles.forEach((p) => p.move());
        }, 50);
        return () => clearInterval(interval);
    }, [particles, vector_field, width, height]);
    
    let units_value = props.speed * conversion_ratio; // convert m/s to specified units
    units_value = round(units_value, 0);
    return (
        <div className="current-legend-box-container">
            <canvas ref={canvas_ref} width={width} height={height}></canvas>
            <div className="current-legend-box-units"> {units_value} {units} </div>
        </div>
    );
}

export default CurrentLegendBox;