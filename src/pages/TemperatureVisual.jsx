import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { ice_to_fire } from "../js/util";
import { S3 } from "../js/s3_api";
import { scaleLinear } from "d3";

import TemperatureMap from "../components/TemperatureMap/TemperatureMap";
import TemperatureLegend from "../components/TemperatureMap/TemperatureLegend";
import Calendar from "../components/Calendar/Calendar";
import '../css/TemperatureChart.css';
import "../css/LakeConditions.css";


////////////////////////////////////
// Static Constants
////////////////////////////////////

const temperature_color = ice_to_fire; 
const T_min = 40;
const T_max = 70;
const T_units = "° F";
let temperature_scale = scaleLinear().domain([T_min, T_max]).range([0, 1]);
let temperature_color_scale = (temperature) => temperature_color(temperature_scale(temperature));

const calendar_description = "Select a forecast of Lake Tahoe's surface temperature";

function TemperaturePage() {
    const [temperature_files, setTempFiles] = useState(undefined);
    const [activeIdx, setActiveIdx] = useState(0);
    const [searchParams, setSearchParams] = useSearchParams();

    const is_loading_files = temperature_files === undefined;
    const files_unavailable = !is_loading_files && temperature_files === null;
    const files_exist = !is_loading_files && !files_unavailable && temperature_files.length > 0;

    const is_downloading = files_exist && temperature_files[activeIdx].matrix === undefined;
    const failed_download = files_exist && temperature_files[activeIdx].matrix === null;

    ////////////////////////////////////
    // Load temperature binary files
    ////////////////////////////////////
    useEffect(() => {
        S3.get_temperature_files()
            .then((files) => {
                files.sort((f1, f2) => f2.time - f1.time);
                setTempFiles(files);
            })
            .catch((err) => {
                console.log(err);
                setTempFiles(null);
            });
    }, []);

    useEffect(() => {
        if (is_loading_files || files_unavailable || !files_exist)
            return;
        
        // download() mutates temperature_files[activeIdx]
        temperature_files[activeIdx].download()
            .then(() => {
                setTempFiles([...temperature_files]);
            });
    }, [is_loading_files, files_unavailable, activeIdx])
    
    let cache_id = `temperature-${activeIdx}`;
    let T;
    if (!is_loading_files && !files_unavailable && files_exist &&
        !is_downloading && !failed_download) {
        T = temperature_files[activeIdx].matrix;
    } 

    // React Native Option
    let render_react_native = searchParams.has("reactnative") && searchParams.get("reactnative") === "true";

    return (
        <div className="lake-condition-container">
            <div className="lake-condition-left-column">

                {
                    !render_react_native && 
                    [
                        <div className="lake-condition-title" key='t-title'> Water Temperature </div>,
                        <div className="lake-condition-description" key='t-desc'>
                            Lake Tahoe water is cold for most swimmers, with surface temperatures ranging 
                            from 42 degrees in the winter to over 70 degrees in July and August. Though refreshing 
                            on a hot day, a plunge into Lake Tahoe can literally take your breath away. Swimmers 
                            should be prepared for dangerously cold conditions.
                        </div>
                    ]
                }

                <Calendar 
                    events={temperature_files} 
                    active_event_idx={activeIdx}
                    on_event_selected={(idx) => setActiveIdx(idx)}
                    description={calendar_description}/>
            </div>

            <div className="lake-visual-container" id="temperature-visual-container">
            {
                (is_loading_files) ? <div className="loading-visual"> Loading </div> :
                (files_unavailable) ? <div className="loading-visual"> Temperature map is temporarily unavailable </div> :
                (!files_exist) ? <div className="loading-visual"> Zero temperature visualizations are available </div> :
                (is_downloading) ? <div className="loading-visual"> Downloading temperature data </div> :
                (failed_download) ? <div className="loading-visual"> Failed to download temperature data </div> :
                    [
                        <TemperatureMap key='temperature-map'
                            T={T} 
                            units={T_units}
                            color_palette={temperature_color_scale} 
                            cache_id={cache_id}/>,
                        <TemperatureLegend key='temperature-legend'
                            min={T_min} max={T_max} units={T_units}
                            color_palette={temperature_color}/>
                    ]
            }
            </div>

        </div>
    );
}

export default TemperaturePage;