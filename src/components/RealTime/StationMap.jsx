import { useEffect } from "react";
import { select, selectAll } from "d3";
import { ALL_STATIONS } from "../../js/terc_api";

// Bounds of the map
const bounds = [
  [38.88973786614013, -120.22406605972319], // southWest
  [39.29014918866168, -119.84887189740661], // northEast
];
const [lat1, lon1] = bounds[0];
const [lat2, lon2] = bounds[1];
const tag_height = 5; // Percentage

function StationMap(props) {
  let { stationIdx, onClick } = props;

  useEffect(() => {
    const stations_with_index = ALL_STATIONS.map((d, i) => ({
      ...d,
      index: i,
    }));

    // Outer circle
    select(".station-map-container > svg > g#outer")
      .selectAll("circle")
      .data(stations_with_index)
      .join("circle")
      .attr("cy", (d) => {
        let [lat, lon] = d.info.coords;
        return `${100 - ((lat - lat1) / (lat2 - lat1)) * 100}%`;
      })
      .attr("cx", (d) => {
        let [lat, lon] = d.info.coords;
        return `${((lon - lon1) / (lon2 - lon1)) * 100}%`;
      })
      .attr("r", 16)
      .attr("stroke", "white")
      .attr("fill-opacity", 0);

    // Inner Circle
    select(".station-map-container > svg > g#inner")
      .selectAll("circle")
      .data(stations_with_index)
      .join("circle")
      .attr("cy", (d) => {
        let [lat, lon] = d.info.coords;
        return `${100 - ((lat - lat1) / (lat2 - lat1)) * 100}%`;
      })
      .attr("cx", (d) => {
        let [lat, lon] = d.info.coords;
        return `${((lon - lon1) / (lon2 - lon1)) * 100}%`;
      })
      .attr("r", 14)
      .attr("fill", "white")
      .attr("fill-opacity", (d, i) => {
        return i === stationIdx ? 1 : 0;
      })
      .style("cursor", "pointer")
      .on("click", function (e, d) {
        onClick(d.index);
      })
      .on("mouseover", (e, d) => {
        select(`g#station-tag${d.index}`).style("display", "block");
      })
      .on("mouseleave", (e, d) => {
        if (d.index === stationIdx) return;
        select(`g#station-tag${d.index}`).style("display", "none");
      });

    // Station tags
    let station_tags = select("g#station-tags")
      .selectAll("g")
      .data(stations_with_index)
      .enter()
      .append("g")
      .attr("id", (d) => `station-tag${d.index}`);

    station_tags
      .append("text")
      .attr("y", (d) => {
        let [lat, lon] = d.info.coords;
        let center_y = 100 - ((lat - lat1) / (lat2 - lat1)) * 100;
        return `${center_y - 1.5 * tag_height}%`;
      })
      .attr("x", (d) => {
        let [lat, lon] = d.info.coords;
        let center_x = ((lon - lon1) / (lon2 - lon1)) * 100;
        return `${center_x}%`;
      })
      .attr("text-anchor", "middle")
      .attr("dominant-baseline", "middle")
      .text((d) => d.info.station_name);

    station_tags
      .insert("rect", "text")
      .attr("y", (d) => {
        let [lat, lon] = d.info.coords;
        let center_y = 100 - ((lat - lat1) / (lat2 - lat1)) * 100;
        return `${center_y - 2 * tag_height}%`;
      })
      .attr("x", function (d) {
        let [lat, lon] = d.info.coords;
        let center_x = ((lon - lon1) / (lon2 - lon1)) * 100;
        return `${center_x}%`;
      })
      .attr("width", function () {
        return this.parentElement.childNodes[1].getComputedTextLength() + 10;
      })
      .attr("transform", function () {
        let width =
          this.parentElement.childNodes[1].getComputedTextLength() + 10;
        return `translate(${-width / 2})`;
      })
      .attr("height", `${tag_height}%`)
      .attr("rx", "1%")
      .attr("ry", "1%")
      .attr("fill", "white");

    // Turn off inactive station tags
    selectAll("g#station-tags > g")
      .data(stations_with_index)
      .join()
      .style("display", (d) => (d.index === stationIdx ? "block" : "none"));
  }, [stationIdx, onClick]);

  return (
    <div className="station-map-container">
      <img alt="Lake Tahoe Map" src="map.PNG" />
      <svg height="100%" width="100%" shapeRendering="geometricPrecision">
        <g id="outer"></g>
        <g id="inner"></g>
        <g id="station-tags"></g>
      </svg>
    </div>
  );
}

export default StationMap;
