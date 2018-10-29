import React, {Component} from 'react';
import Source from "react-mapbox-gl/lib/source";
import {Layer, Popup} from "react-mapbox-gl";
import Icon from "./marker.png";

class PinMarker extends Component {

    constructor(props) {
        super(props);
    }

    render() {
        return (
            <div style={{
                position:"absolute",
                left:"0",
                right:"0",
                top:"0",
                bottom:"0",
                margin:"auto",
                zIndex:"15",
                width:"60px",
                height:"60px",
            }}>
                <div style={{backgroundColor:"white",
                    opacity:"0.9",
                    padding:"3px 5px",
                    position:"absolute",
                    top:"-40px",
                    borderRadius:"5px",
                    textAlign:"center",
                    left:"50%",
                    width:"150px",
                    // margin:"auto",
                    transform: "translate(-50%)"
                }}>Where to scream?</div>
            <img src={Icon} style={{width:"60px", height:"60px"}}/>
            </div>
                );
    }
}

export default PinMarker;
