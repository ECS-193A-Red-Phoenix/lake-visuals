import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { get_flow_matrix } from "../js/s3_api";
import { dark_ocean } from "../js/util";
import { scaleLinear } from "d3";

import CurrentLakeMap from "../components/CurrentMap/CurrentLakeMap";
import CurrentLegendBox from "../components/CurrentMap/CurrentLegendBox";

import '../css/TemperatureChart.css';
import "../css/LakeConditions.css";
import "../css/CurrentChart.css";

////////////////////////////////////
// Static Constants
////////////////////////////////////
const legend_speeds = [0.1016, 0.2032, 0.3048, 0.508] // m/s

const speed_scale = scaleLinear().domain([0, 0.5]).range([0, 1]);
const color_palette = (speed) => dark_ocean(speed_scale(speed));

// Create legend
const legend_boxes = [];
for (let i = 0; i < legend_speeds.length; i++)
    legend_boxes.push(
        <CurrentLegendBox 
            key={`legend-box${i}`} 
            speed={legend_speeds[i]}
            color_palette={color_palette}
        />
    );

function FlowVisual() {
    const [searchParams, setSearchParams] = useSearchParams();
    const [uv, setUV] = useState(undefined);

    const date_exists = searchParams.has('date');
    const date = searchParams.get('date');
    const date_formatted = (date !== null) && (date.search(/^\d{10}$/) !== -1);

    useEffect(() => {
        if (!date_exists || !date_formatted)
            return;

        const YY = date.substring(0, 4);
        const MM = date.substring(4, 6);
        const DD = date.substring(6, 8);
        const HH = date.substring(8, 10);
        
        get_flow_matrix(YY, MM, DD, HH)
            .then(setUV)
            .catch((err) => {
                console.log(err);
                setUV(null);
            });
    }, [date]);
    
    if (!date_exists) {
        return <div className="center-fill-page"> Expected date in url params </div>;
    } else if (!date_formatted) {
        return <div className="center-fill-page"> Expected date to have format 'YYYYMMDDHH'</div>
    } else if (uv === undefined) {
        return <div className="center-fill-page"> Loading .npy file </div>
    } else if (uv === null) {
        return <div className="center-fill-page"> Failed to retrieve visualization </div>
    } else {
        const [u, v] = uv;
        return (
            <div className="center-fill-page">
                <div className="lake-visual-container">
                    <CurrentLakeMap key='current-lake-map'
                        u={u} 
                        v={v}
                        color_palette={color_palette}
                        cache_id={date}/>
                    <div key='current-lake-legend' 
                        className="current-legend-container">
                        { legend_boxes }
                    </div>
                </div>
            </div>
        );
    }
}
        
  
export default FlowVisual;