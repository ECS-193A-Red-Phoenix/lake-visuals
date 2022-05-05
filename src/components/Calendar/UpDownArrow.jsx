import "./Calendar.css";

function UpDownArrow(props) {
    return (
        <div className="up-down-arrow">
            <img onClick={props.on_up} width="21" src="static/svg/down-arrow.svg"/>
            <img onClick={props.on_down} width="21" src="static/svg/down-arrow.svg"/>
        </div>
    );
}

export default UpDownArrow;