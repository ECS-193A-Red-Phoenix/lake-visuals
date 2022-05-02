import React, { useState, useEffect } from "react";
import MapControlButton from "./MapControlButton";
import StationMap from "./StationMap";
import LinePlot from "./LinePlot";
import CompassPlot from "./CompassPlot";

import "./RealTimeConditions.css";

import { ALL_STATIONS } from "../../js/terc_api";
import { unzip, mean, wind_direction_mean } from "../../js/util";

function RealTimeConditions(props) {
  let [stationIdx, setStationIdx] = useState(0);
  let [stationData, setStationData] = useState([]);
  let [dataIdx, setDataIdx] = useState(0);

  let station_data_names = ALL_STATIONS[stationIdx].info.data;
  let current_data_displayed = station_data_names[dataIdx];
  let time, y_data;
  if (stationIdx < stationData.length && stationData[stationIdx] !== undefined) {
    time = stationData[stationIdx].map((x) => x['TimeStamp']);
    y_data = stationData[stationIdx].map((x) => x[current_data_displayed.name]);
  }

  useEffect(() => {
    // Retrieve data for each station
    for (let i = 0; i < ALL_STATIONS.length; i++) {
      let station = ALL_STATIONS[i];
      station.get_display_data().then((response) => {
        setStationData((prevStationData) => {
          let stationDataCopy = [...prevStationData];
          stationDataCopy[i] = response;
          return stationDataCopy;
        });
      });
    }
  }, []);

  function setDataDisplayed(idx) {
    setDataIdx(idx);
  }

  function onSetStationIdx(idx) {
    setStationIdx(idx);
  }

  // Map Controls
  let mapControls = [];
  for (let i = 0; i < station_data_names.length; i++) {
    mapControls.push(
      <MapControlButton
        key={station_data_names[i].name}
        name={station_data_names[i].name}
        active={i === dataIdx}
        onClick={() => setDataDisplayed(i)}
      />
    );
  }

  const chart_title = `${current_data_displayed.name} @ ${ALL_STATIONS[stationIdx].info.station_name}`;
  const chart_type = current_data_displayed.display_type;
  let chart;
  switch (chart_type) {
    case "line":
      chart = (
        <LinePlot
          time={time}
          y={y_data}
          title={chart_title}
          units={current_data_displayed.units}
          range={current_data_displayed.range}
        />
      );
      break;
    case "polar":
        let average_wind_speed, average_wind_direction;
        if (y_data !== undefined) {
            // Only use the last 12 data points, ~ 4 hours
            let [wind_speed, wind_direction] = unzip(y_data.slice(y_data.length - 12));
            average_wind_speed = mean(wind_speed);
            average_wind_direction = wind_direction_mean(wind_direction);
            // console.log("ws", average_wind_speed, "wd", average_wind_direction, "m", mean(wind_direction));
        }
        chart = (
            <CompassPlot
                radius={500}
                speed={average_wind_speed}
                direction={average_wind_direction}
                title={chart_title}
                units={current_data_displayed.units}
            />
        );
        break;
    default:
        console.log(`Unexpected chart type "${chart_type}"`);
  }

  return (
    <div className="content-wrapper">
      <div className="image-container">
        <img src="lake-one.jpg" alt="Lake Tahoe"></img>
        <div className="page-description-container">
          <div className="page-description-title"> Real Time Conditions </div>
          <div className="page-description">
            {" "}
            Explore Lake Tahoe conditions in real time, routinely updated in
            twenty minute intervals. {" "}
          </div>
          <div className="page-last-updated">
            {" "}
          </div>
        </div>
      </div>

      <div className="real-time-conditions-container">
        <div className="time-plot-container">
          { chart }
          <div className="map-controls-container">{mapControls}</div>
        </div>

        <StationMap stationIdx={stationIdx} onClick={onSetStationIdx} />
      </div>
    </div>
  );
}

export default RealTimeConditions;
