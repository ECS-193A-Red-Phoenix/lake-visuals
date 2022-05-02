import { useRef, useEffect, useState } from 'react'; 
import { select, scaleLinear, line, pointer, easeCubicInOut} from 'd3';
import { round, militaryHourTo12Hour } from '../../js/util';
import "./RealTimeConditions.css"

//////////////////////////////////////////////
// Static Constants
////////////////////////////////////////////// 
let padding_horizontal = 0.03;       // chart padding in horizontal direction, a percentage of width in [0, 1.0]
let padding_vertical = 0.05;         // chart padding in vertical direction, a percentage of height in [0, 1.0]
let tick_length = 0.01;              // length of ticks on each axis, a percentage in [0, 1.0]
let y_padding = 0.1;                 // extra y padding for the line, a percentage in [0, 1.0]
let label_margin = 5;                // distance between tick labels and axises, in pixels
const default_chart_width = 800;     // chart width for desktop web, px
const default_chart_height = 600;    // chart height for desktop web, px
const x_label_bounds = [0.05, 0.90]  // the bounds of the chart where an x label can exist
const HOUR = 60 * 60 * 1000;         // how many milliseconds in an hour

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
function format_date(date, show_minutes) {
    let day = DAYS[date.getDay()];
    let hours = String(militaryHourTo12Hour(date.getHours())).padStart(2, 0);
    let am_pm = (date.getHours() >= 12) ? "PM" : "AM";
    let minutes = String(date.getMinutes()).padStart(2, 0);

    if (show_minutes) {
        return `${day} ${hours}:${minutes} ${am_pm}`;
    } else {
        return `${day} ${hours} ${am_pm}`;
    }
}

function containsNaN(array) {
    for (let value of array) {
        if (typeof value !== 'number' || isNaN(value))
            return true;
    }
    return false;
}

function LinePlot(props) {
    const [chart_width, setChartWidth] = useState(default_chart_width);
    const [chart_height, setChartHeight] = useState(default_chart_height);
    const [cursor_value, set_cursor_val] = useState(undefined);
    let d3_ref = useRef();

    const [x_s, x_e] = [chart_width * padding_horizontal, chart_width * (1 - padding_horizontal)];
    const [y_s, y_e] = [chart_height * padding_vertical, chart_height * (1 - padding_vertical)];
    const y_padding_px = y_padding * (y_e - y_s);
    
    const is_loading = props.time === undefined || props.y === undefined;
    const unavailable = !is_loading && (props.y.length === 0 || props.time.length === 0 || containsNaN(props.y))

    const loading_text = 
        <text x={(x_e + x_s) / 2} y={(y_e + y_s) / 2} textAnchor="middle" dominantBaseline="middle" className="line-plot-loading">
            {is_loading ? "Loading" : unavailable ? "Data Temporarily Unavailable" : "Loaded"}
        </text>;

    //////////////////////////////////////////////
    // Axes Creation
    ////////////////////////////////////////////// 
    let axes = <line key="x-axis" x1={x_s} y1={y_e} x2={x_e} y2={y_e} stroke="black" strokeLinecap="square"></line>;
    let axes_units = 
    <text x={x_s - 40} y={(y_s + y_e) / 2} textAnchor="end" dominantBaseline="middle" className="line-plot-label">
        { (unavailable) ? "" : props.units }
    </text>

    //////////////////////////////////////////////
    // Time and Y Data Processing
    ////////////////////////////////////////////// 
    let x_scale, y_scale, t0, t1, y_min, y_max;
    if (!is_loading && !unavailable) {
        [t0, t1] = [props.time[0], props.time[props.time.length - 1]];
        x_scale = scaleLinear()
            .domain([0, t1 - t0])
            .range([x_s, x_e]);

        if (props.range !== undefined) {
            y_min = props.range[0];
            y_max = props.range[1];
        } else {
            y_min = Math.min(...props.y)
            y_max = Math.max(...props.y)
        }

        y_scale = scaleLinear()
            .domain([y_min, y_max])
            .range([y_e - y_padding_px, y_s + y_padding_px]);
    }

    //////////////////////////////////////////////
    // Create labels for each axis, if data available
    ////////////////////////////////////////////// 
    const labels = [];
    if (!is_loading && !unavailable) {
        // Y labels measurements
        let y_label_scale = scaleLinear()
            .domain([y_e - y_padding_px, y_s + y_padding_px])
            .range([y_min, y_max]);
        let y_min_label = Math.ceil(y_label_scale(y_e));
        let y_max_label = Math.floor(y_label_scale(y_s));
        let num_y_ticks = 6;
        let y_label_increment = Math.max(0.5, Math.ceil((y_max_label - y_min_label) / num_y_ticks));
        num_y_ticks = (y_max_label - y_min_label) / y_label_increment;

        // Remove bottom y label if we have more than 2 ticks
        if (num_y_ticks >= 2) {
            y_min_label += y_label_increment;
            num_y_ticks -= 1;
        }

        // Create Y axis labels
        for (let i = 0; i <= num_y_ticks; i++) {
            const y_label_value = y_min_label + i * y_label_increment
            let y1 = y_scale(y_label_value);
            let x1 = x_s;
            labels.push(
                <text key={`y-label${i}`} x={x1 - label_margin} y={y1} textAnchor="end" dominantBaseline="middle" className='line-plot-label'> 
                    {round(y_label_value)} 
                </text>,
                <line key={`y-line${i}`} x1={x1} y1={y1} x2={x_e} y2={y1} stroke='black' strokeOpacity="0.1" strokeDasharray="3"></line>
            )
        }

        // Create X axis labels
        // each x label is ~ 85px, but no more than 6 x ticks
        const num_x_ticks = Math.min(6, Math.floor(chart_width / 85));

        // Pick between 12 hour or 24 hour increments, depending on how many ticks we have
        const increment_choices = [12 * HOUR, 24 * HOUR];
        const increment = (num_x_ticks > 4) ? increment_choices[0] : increment_choices[1];

        // Round starting and end increments to nearest multiple of 12 hours
        const x_increment_start = increment * Math.ceil((t0.getTime()) / increment) + 6 * HOUR;
        const x_increment_end = increment * Math.floor((t1.getTime()) / increment) + 6 * HOUR;
        const x_label_scale = scaleLinear().domain([t0.getTime(), t1.getTime()]).range([x_s, x_e]);

        // X axis, tiny upwards ticks
        const tick_y1 = y_e;
        const tick_y2 = tick_y1 - (y_e - y_s) * tick_length;
        for (let i = x_increment_start; i <= x_increment_end; i += increment) {
            let tick_x1 = x_label_scale(i);
            let x_label_date = new Date(i);

            // if x is not in the bounds of 0.05, 0.95 of the chart, lets skip this tick
            let x_percent = (tick_x1 - x_s) / (x_e - x_s);
            if (x_percent < x_label_bounds[0] || x_percent > x_label_bounds[1])
                continue;

            labels.push(
                <line key={`x-tick-${i}`} x1={tick_x1} y1={tick_y1} x2={tick_x1} y2={tick_y2} stroke='black' strokeLinecap='square'></line>,
                <text key={`x-label-${i}`} x={tick_x1} y={tick_y1 + label_margin} textAnchor="middle" dominantBaseline="hanging" className='line-plot-label'>
                    { format_date(x_label_date) }
                </text>
            );
        }
        // Add a 'Now' tick at the very end
        labels.push(
            <line key={`x-tick-last`} x1={x_e} y1={y_e} x2={x_e} y2={tick_y2} stroke='black' strokeLinecap='square'></line>,
            <text key={`x-label-last`} x={x_e} y={y_e + label_margin} textAnchor="middle" dominantBaseline="hanging" className='line-plot-label'>
                Now
            </text>
        );
    }

    useEffect(() => {
        //////////////////////////////////////////////
        // Create line from data
        ////////////////////////////////////////////// 
        let svg = select(d3_ref.current);

        setChartWidth(d3_ref.current.clientWidth);
        setChartHeight(d3_ref.current.clientHeight);

        if (is_loading || unavailable) {
            svg.select("#line").attr("d", "");
            svg.on('mousemove', () => {});
            svg.on('mouseleave', () => {});
            return;
        }

        set_cursor_val(round(props.y[props.y.length - 1]));
        let data = [];
        for (let i = 0; i < props.time.length; i++) {
            data.push([x_scale(props.time[i] - t0), y_scale(props.y[i])]);
        }

        svg.select("#line")
            .attr("d", line()(data))
            
        svg.select("#cover")
            .transition()
            .duration(1000)
            .ease(easeCubicInOut)
            .attr("x", x_e + 5)

        //////////////////////////////////////////////
        // Cursor hover event
        ////////////////////////////////////////////// 
        function moveCursor(event) {
            let [x, y] = pointer(event);
            if (x_s <= x && x <= x_e && y_s <= y && y <= y_e) {
                // Find y-value of cursor
                let x_value = (x - x_s) / (x_e - x_s) * (t1 - t0);
                let y_value = 0;
                for (let i = 1; i < props.time.length; i++) {
                    let prev = props.time[i - 1] - t0;
                    let cur = props.time[i] - t0;
                    if (prev <= x_value && x_value <= cur) {
                        y_value = props.y[i - 1] + (x_value - prev) * (props.y[i] - props.y[i - 1]) / (cur - prev);
                        break;
                    }
                }
                set_cursor_val(round(y_value, 1));

                svg.select("#cursor")
                    .style('display', 'block');
                svg.select("#cursor > line")
                    .attr("x1", x)
                    .attr("x2", x)
                svg.selectAll("#cursor > circle")
                    .attr("cx", x)
                    .attr("cy", y_scale(y_value));
                svg.select("#cursor > text")
                    .attr("x", x)
                    .text(format_date(new Date(t0.getTime() + x_value), true));
            } else {
                turnOffCursor();
            }
        }

        function turnOffCursor() {
            svg.select("#cursor").style('display', 'none');
            set_cursor_val(round(props.y[props.y.length - 1]));
        }

        svg.on('mousemove', moveCursor);
        svg.on('mousedown', moveCursor);
        svg.on('mouseleave', turnOffCursor);
        svg.on('mouseup', turnOffCursor);

        // - Sometimes tapping on the svg doesn't register an event because 
        //   a descendant of the svg registers the event
        // Thus, we add mouse event to all descending elements in svg
        let svg_elements = svg.selectAll("*"); 
        svg_elements.on('mousemove', moveCursor);
        svg_elements.on('mousedown', moveCursor);
        svg_elements.on('mouseleave', turnOffCursor);
        svg_elements.on('mouseup', turnOffCursor);

        //////////////////////////////////////////////
        // Touch events, using code from MDN endorsed tutorial 
        // https://www.codicode.com/art/easy_way_to_add_touch_support_to_your_website.aspx
        ////////////////////////////////////////////// 
        function touchEventToMouseEvent(e) {
            const theTouch = e.changedTouches[0];
            
            let mouseEventType;
            switch(e.type){
                case "touchstart": mouseEventType = "mousedown"; break;  
                case "touchend":   mouseEventType = "mouseup"; break;
                case "touchmove":  mouseEventType = "mousemove"; break;
                default: return;
            }

            const mouseEvent = new MouseEvent(mouseEventType, {
                "screenX": theTouch.screenX,
                "screenY": theTouch.screenY,
                "clientX": theTouch.clientX,
                "clientY": theTouch.clientY,
                "ctrlKey": false,
                "altKey": false,
                "shiftKey": false,
                "metaKey": false,
                "button": 0,
            });
            
            theTouch.target.dispatchEvent(mouseEvent);
            e.preventDefault();
        }
        svg.on('touchstart', touchEventToMouseEvent);
        svg.on('touchend', touchEventToMouseEvent);
        svg.on('touchmove', touchEventToMouseEvent);

    }, [props.time, props.y, is_loading, t0, t1, unavailable, x_s, x_e, y_s, y_e]);

    let chart_subtitle;
    if (unavailable) {
        chart_subtitle = "Unavailable";
    } else if (isNaN(cursor_value)) {
        chart_subtitle = "";
    } else {
        chart_subtitle = `${cursor_value} ${props.units}`;
    }
    
    return (
        <div className='line-plot-container'>
            <div className='line-plot-title'>
                { props.title }
            </div>
            <div className='line-plot-subtitle'>
                { chart_subtitle }
            </div>
            <svg 
                className="line-plot"
                viewBox={`0 0 ${chart_width} ${chart_height}`}
                ref={d3_ref}
                shapeRendering="geometricPrecision"
                >

                {/* Chart data */}
                <path id="line" stroke="steelblue" strokeWidth="2.5" fillOpacity="0"></path>
                <rect id="cover" x={x_s} y={y_s} width={x_e - x_s} height={y_e - y_s} fill="white"></rect>
                <g id="points"></g>

                <g id='cursor'>
                    <line x1={(x_s + x_e) / 2} y1={y_e} x2={(x_s + x_e) / 2} y2={y_s - 10} stroke="black" strokeOpacity="0.4"></line>
                    <circle cx='50%' cy="50%" r="7" fill="white"></circle>
                    <circle cx='50%' cy="50%" r="5" fill="steelblue"></circle>
                    <text x={(x_s + x_e) / 2} y={y_s - 15} className="line-plot-cursor" textAnchor="middle"></text>
                </g>


                {/* Axes and Units */}
                { (is_loading || unavailable) && loading_text }
                { axes }
                { props.units && axes_units }
                { labels }
        </svg>
        </div>
    );
}

export default LinePlot;