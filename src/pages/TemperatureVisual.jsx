import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { get_temperature_matrix } from "../js/s3_api";
import { ice_to_fire } from "../js/util";
import { scaleLinear } from "d3";

import TemperatureMap from "../components/TemperatureMap/TemperatureMap";
import TemperatureLegend from "../components/TemperatureMap/TemperatureLegend";
import '../css/TemperatureChart.css';
import "../css/LakeConditions.css";

const temperature_color = ice_to_fire; 
const T_min = 40;
const T_max = 70;
const T_units = "° F";
let temperature_scale = scaleLinear().domain([T_min, T_max]).range([0, 1]);
let temperature_color_scale = (temperature) => temperature_color(temperature_scale(temperature));

function TemperatureVisual() {
    const [searchParams, setSearchParams] = useSearchParams();
    const [T, setT] = useState(undefined);

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
        
        get_temperature_matrix(YY, MM, DD, HH)
            .then(setT)
            .catch(() => setT(null));
    }, [date]);
    
    if (!date_exists) {
        return <div className="center-fill-page"> Expected date in url params </div>;
    } else if (!date_formatted) {
        return <div className="center-fill-page"> Expected date to have format 'YYYYMMDDHH'</div>
    } else if (T === undefined) {
        return <div className="center-fill-page"> Loading .npy file </div>
    } else if (T === null) {
        return <div className="center-fill-page"> Failed to retrieve visualization </div>
    }   else {
        return (
            <div className="center-fill-page">
                <div className="lake-visual-container" id="temperature-visual-container">
                    <TemperatureMap key='temperature-map'
                        T={T} 
                        units={T_units}
                        color_palette={temperature_color_scale} 
                        cache_id={date}/>
                    <TemperatureLegend key='temperature-legend'
                        min={T_min} max={T_max} units={T_units}
                        color_palette={temperature_color}/>
                </div>
            </div>
        );
    }
}
        
  
export default TemperatureVisual;