import { useEffect, useRef } from "react";
import { if_undefined, round } from "../../js/util";

////////////////////////////////////
// Static Constants
////////////////////////////////////

function TemperatureLegend(props) {
    ////////////////////////////////////
    // Expected props
    // min: the minimum value of the legend
    // max: the maximum value of the legend
    // units: the units of the legend
    // color_palette: a function that maps a percent [0, 1.0] to a [r, g, b] color
    // num_ticks (optional, default=16): the number of ticks to display on the legend
    // decimal_places (optional, default=0): the number of decimal places to round the units to

    const canvas_ref = useRef();
    const { color_palette, min, max } = props;
    const num_ticks = if_undefined(props.num_ticks, 16);
    const decimal_places = if_undefined(props.decimal_places, 0);

    useEffect(() => {
        const canvas = canvas_ref.current;
        canvas.width = canvas.offsetWidth;
        canvas.height = canvas.offsetHeight;

        const cx = canvas.getContext('2d');

        // Create color bar
        let image_data = cx.createImageData(canvas.width, canvas.height);
        for (let j = 0; j < canvas.height; j++) {
            for (let i = 0; i < canvas.width; i++) {
                let T = (canvas.height - 1 - j) / (canvas.height - 1);

                let [r, g, b] = color_palette(T);
                let pixel_index = (j * (image_data.width * 4)) + (i * 4);

                image_data.data[pixel_index + 0] = r;
                image_data.data[pixel_index + 1] = g;
                image_data.data[pixel_index + 2] = b;
                image_data.data[pixel_index + 3] = 255;
            }
        }
        cx.putImageData(image_data, 0, 0);
    }, [color_palette]);

    const units = [];
    for (let i = 0; i < num_ticks; i++) {
        let percent = i / (num_ticks - 1);
        let temperature = min + (max - min) * percent;
        temperature = round(temperature, decimal_places);
        units.push(
            <div key={`legend-unit${i}`}
                className="temperature-legend-unit" 
                style={{"top": `${(1 - percent) * 100}%`}}>
                <div>{`${temperature} ${props.units}`}</div>
            </div>
        );
    }

    return (
        <div className="temperature-legend-container">
            <canvas ref={canvas_ref}></canvas>
            <div className="temperature-legend-units">
                { units }
            </div>
        </div>
    )
}

export default TemperatureLegend;