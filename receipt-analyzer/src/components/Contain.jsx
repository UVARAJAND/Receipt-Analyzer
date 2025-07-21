import React from "react";
import Input from './Input';
import ContentLeft from "./ContentLeft";
import ContentRight from "./ContentRight";
import Options from "./Options";

function Contain(){
    return(
        <div className="Contain">
            <div className="secNav">
                <Input />
                <Options />
            </div>
            <div className="wholecontain">
                <ContentLeft />
                <ContentRight />
            </div>
        </div>
    )
}
export default Contain;