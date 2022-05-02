//Previously also included a "today" import from ./util
import { http_get, if_undefined, today } from "./util";

/////////////////////////////////////////////////
// Global constants here
const NEAR_SHORE_URL =
  "https://tepfsail50.execute-api.us-west-2.amazonaws.com/v1/report/ns-station-range";
const NASA_BUOY_URL =
  "https://tepfsail50.execute-api.us-west-2.amazonaws.com/v1/report/nasa-tb";
const DAYS_OF_DATA = 3; // days of data to retrieve from these api's

// Near shore data to display
//    name: title of chart       units: units     display_type: chart type,  range: y range of chart, automatic if undefined
const NEAR_SHORE_DATA = [
  {
    name: "Water Temperature",
    units: "° F",
    display_type: "line",
    range: undefined,
  },
  { name: "Wave Height", units: "Feet", display_type: "line", range: [0, 5] },
];

// Buoy data to display
const BUOY_DATA = [
  {
    name: "Water Temperature",
    units: "° F",
    display_type: "line",
    range: undefined,
  },
  { name: "Wind", units: "MPH", display_type: "polar", range: undefined },
];

const NEAR_SHORE_STATION_INFO = [
  {
    id: 2,
    station_name: "Dollar Point",
    coords: [39.184, -120.093],
    data: NEAR_SHORE_DATA,
  },
  {
    id: 3,
    station_name: "Glenbrook",
    coords: [39.088, -119.942],
    data: NEAR_SHORE_DATA,
  },
  {
    id: 4,
    station_name: "Homewood",
    coords: [39.09, -120.161],
    data: NEAR_SHORE_DATA,
  },
  {
    id: 6,
    station_name: "Rubicon",
    coords: [39.007, -120.109],
    data: NEAR_SHORE_DATA,
  },
  {
    id: 7,
    station_name: "Sand Harbor",
    coords: [39.201, -119.931],
    data: NEAR_SHORE_DATA,
  },
  {
    id: 9,
    station_name: "Tahoe City",
    coords: [39.152, -120.147],
    data: NEAR_SHORE_DATA,
  },
  {
    id: 10,
    station_name: "Camp Richardson",
    coords: [38.941, -120.04],
    data: NEAR_SHORE_DATA,
  },
  {
    id: 11,
    station_name: "Timber Cove",
    coords: [38.947, -119.966],
    data: NEAR_SHORE_DATA,
  },
];

const NASA_BUOY_INFO = [
  { id: 1, station_name: "tb1", coords: [39.153, -120.00033], data: BUOY_DATA },
  {
    id: 2,
    station_name: "tb2",
    coords: [39.109366, -120.01075],
    data: BUOY_DATA,
  },
  {
    id: 3,
    station_name: "tb3",
    coords: [39.1102, -120.07535],
    data: BUOY_DATA,
  },
  { id: 4, station_name: "tb4", coords: [39.155, -120.07216], data: BUOY_DATA },
];

function today_string(days) {
  // Retrieves the current date in UTC as a 'YYYYMMDD' string
  // Arguments:
  //  days (optional, default 0): the number of days from today
  days = if_undefined(days, 0);
  let now = today(days);
  const year = String(now.getUTCFullYear());
  const month = String(now.getUTCMonth() + 1).padStart(2, "0");
  const day = String(now.getUTCDate()).padStart(2, "0");
  return `${year}${month}${day}`;
}

function parseMyDate(date_string) {
  // Parses a date string in the format "YYYY-MM-DD HH:MM:SS"
  date_string = date_string.trim();
  date_string = date_string.replace(" ", "T");
  date_string += "Z";

  // For new Date(string) specification see below
  // https://262.ecma-international.org/5.1/#sec-15.9.1.15
  return new Date(date_string);
}

/////////////////////////////////////////////////
// Station Objects
// - An object is a station if it implements the following
// 1. get_data() 2. get_display_data()
/////////////////////////////////////////////////

class Station {
  constructor(info, url) {
    this.url = url;
    this.info = info; // id, name, coords
  }

  async get_data() {
    const params = {
      id: this.info.id,
      rptdate: today_string(DAYS_OF_DATA),
      rptend: today_string(),
    };
    const json = await http_get(this.url, params);
    return json;
  }
}

class NearShoreStation extends Station {
  async get_display_data() {
    const data = await this.get_data();
    const res = [];
    for (let datum of data) {
      res.push({
        TimeStamp: parseMyDate(datum["TmStamp"]),
        "Water Temperature": Number.parseFloat(datum["LS_Temp_Avg"]),
        "Wave Height": Number.parseFloat(datum["WaveHeight"]),
      });
      // Convert units
      res[res.length - 1]["Water Temperature"] =
        (res[res.length - 1]["Water Temperature"] * 9) / 5 + 32; // C to F
      res[res.length - 1]["Wave Height"] *= 3.28084; // m to ft
    }
    return res;
  }
}

class NASABuoyStation extends Station {
  async get_display_data() {
    const data = await this.get_data();
    const res = [];
    for (let datum of data) {
      res.push({
        TimeStamp: parseMyDate(datum["TmStamp"]),
        "Water Temperature": Number.parseFloat(datum["RBR_0p5_m"]),
        "Wind Direction": Number.parseFloat(datum["WindDir_1"]),
        "Wind Speed": Number.parseFloat(datum["WindSpeed_1"]),
      });
      // Convert units
      let last_idx = res.length - 1;
      res[last_idx]["Water Temperature"] =
        (res[last_idx]["Water Temperature"] * 9) / 5 + 32; // C to F
      res[last_idx]["Wind Speed"] *= 2.23694; // ms to mph

      // Combine Wind Speed and Wind Dir into one datum
      res[last_idx]["Wind"] = [
        res[last_idx]["Wind Speed"],
        res[last_idx]["Wind Direction"],
      ];
      delete res[last_idx]["Wind Speed"];
      delete res[last_idx]["Wind Direction"];
    }
    return res;
  }
}

/////////////////////////////////////////////////////////
// Initialize stations
/////////////////////////////////////////////////////////

const NEAR_SHORE_STATIONS = [];
for (let i = 0; i < NEAR_SHORE_STATION_INFO.length; i++)
  NEAR_SHORE_STATIONS.push(
    new NearShoreStation(NEAR_SHORE_STATION_INFO[i], NEAR_SHORE_URL)
  );

const NASA_BUOY_STATIONS = [];
for (let i = 0; i < NASA_BUOY_INFO.length; i++)
  NASA_BUOY_STATIONS.push(
    new NASABuoyStation(NASA_BUOY_INFO[i], NASA_BUOY_URL)
  );

const ALL_STATIONS = [...NEAR_SHORE_STATIONS, ...NASA_BUOY_STATIONS];

export { ALL_STATIONS };
