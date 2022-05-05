import "./Calendar.css";
import { useState, useRef } from "react";
import { clamp, militaryHourTo12Hour } from "../../js/util";
import UpDownArrow from "./UpDownArrow";

////////////////////////////////////
// Static Constants
////////////////////////////////////

function formatDate(date) {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

    const day_of_week = days[date.getDay()];
    const month = months[date.getMonth()];
    const day_of_month = date.getDate();
    const year = date.getFullYear();

    return `${day_of_week}, ${month} ${day_of_month}, ${year}`;
}

function formatHourString(date) {
    const am_pm = (date.getHours() < 12) ? "AM" : "PM";
    return `${militaryHourTo12Hour(date.getHours())} ${am_pm}`;
}

function Calendar(props) {
    const [active_event_idx, set_active_event_idx] = useState(0);
    const day_select_ref = useRef();
    const hour_select_ref = useRef();

    ////////////////////////////////////
    // Expected props:
    //  props.events: a list of Objects that have a time attribute [{'time': Date object}, ...]
    //  props.on_event_selected: a callback function when a new event is selected
    
    ////////////////////////////////////
    // Error Handling
    ////////////////////////////////////
    let error_message;
    if (props.events === undefined) 
        error_message = "Loading available forecasts";
    else if (props.events === null) 
        error_message = "An unexpected error occurred while retrieving forecasts";
    else if (props.events.length === 0)
        error_message = "No forecasts are available";
    
    if (error_message !== undefined)
        return <div className="calendar calendar-error"> {error_message} </div>;
    ////////////////////////////////////

    // copy the events to avoid mutating props.events
    const events = props.events.map((obj) => ({ 'time': obj.time }));
    events.forEach((e, idx) => e.idx = idx);

    // Create a hashmap that maps date_string -> events on that day
    // Example: 'Sunday, January 23' -> [event1, event2]
    const dates = {};
    for (let event of events) {
        const date_string = formatDate(event.time);
        if (date_string in dates)
            dates[date_string].push(event);
        else
            dates[date_string] = [event];
    }

    const day_options = Object.keys(dates).map(
        (date_string, idx) => 
            <option 
                value={ date_string }
                key={`day-option-${idx}`} 
                className="day-option"> 
                    { date_string }
            </option>
    )
    
    const active_event = events[active_event_idx];
    const active_event_date = formatDate(active_event.time); 
    const hours = dates[active_event_date];
    const active_hour_idx = hours.indexOf(active_event);

    const hour_options = hours.map(
        (date_event, idx) =>
            <option 
                value={ idx }
                key={`hour-option-${date_event.idx}`}
                className="hour-option">
                    { formatHourString(date_event.time) }
            </option> 
    )

    // Event callback function when day selector is changed
    function on_day_changed() {
        const selector = day_select_ref.current;
        const selected_date = selector.options[selector.selectedIndex].text;
        const selected_event_idx = dates[selected_date][0].idx;
        props.on_event_selected(selected_event_idx);
        set_active_event_idx(selected_event_idx);
    }

    // Event callback function when hour selector is changed
    function on_hour_changed() {
        const day_select = day_select_ref.current;
        const selected_date = day_select.options[day_select.selectedIndex].text;
        const hour_select = hour_select_ref.current;
        const selected_hour = hour_select.selectedIndex;
        const selected_event_idx = dates[selected_date][selected_hour].idx;
        props.on_event_selected(selected_event_idx);
        set_active_event_idx(selected_event_idx);
    }

    // Event callback function for when up down arrow is pressed
    function change_hour(amount) {
        // Arguments:
        //  amount: an integer; how many hour events to go forward or backward
        const day_select = day_select_ref.current;
        let selected_date = day_select.options[day_select.selectedIndex].text;
        const hour_select = hour_select_ref.current;
        const selected_hour = hour_select.selectedIndex;

        // Go the new hour idx < 0 go back a day, if the new hour idx >= # hour options go forward a day.
        let new_hour_idx = selected_hour + amount;
        if (new_hour_idx < 0 && day_select.selectedIndex > 0) {
            day_select.selectedIndex -= 1;
            selected_date = day_select.options[day_select.selectedIndex].text;
            new_hour_idx = dates[selected_date].length - 1;
        } else if (new_hour_idx >= dates[selected_date].length && day_select.selectedIndex < day_select.options.length - 1) {
            day_select.selectedIndex += 1;
            selected_date = day_select.options[day_select.selectedIndex].text;
            new_hour_idx = 0;
        }
        new_hour_idx = clamp(new_hour_idx, 0, dates[selected_date].length - 1);

        const new_event_idx = dates[selected_date][new_hour_idx].idx;
        props.on_event_selected(new_event_idx);
        set_active_event_idx(new_event_idx);
    }

    return (
        <div className="calendar-container">
            <div className="calendar-description">
                { props.description }
            </div>
            <div className="calendar">
                <select ref={day_select_ref} className="calendar-day-select" onChange={on_day_changed}>
                    { day_options }
                </select>
                <span> at </span>

                <div className="calendar-hour-select">
                    <select ref={hour_select_ref} value={ active_hour_idx } className="calendar-hour-select" onChange={on_hour_changed}>
                        { hour_options }
                    </select>
                    <UpDownArrow on_up={() => change_hour(-1)} on_down={() => change_hour(1)}/>
                </div>
            </div>
        </div>
    );
}

export default Calendar;