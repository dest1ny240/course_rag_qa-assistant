import {useState} from "react";
import React from "react";
export default function MessageInput({onSend}){

  const [text,setText] = useState("");

  const handleSend = ()=>{

    if(!text) return;

    onSend(text);

    setText("");
  }

  return(

    <div className="input-box">

      <input
        value={text}
        onChange={(e)=>setText(e.target.value)}
        placeholder="Ask a question about the course..."
      />

      <button onClick={handleSend}>
        Send
      </button>

    </div>

  )
}