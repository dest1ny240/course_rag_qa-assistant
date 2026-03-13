import {useState} from "react";
import React from "react";
import MessageBubble from "./MessageBubble";
import MessageInput from "./MessageInput";
import {askQuestion} from "../services/api";

export default function ChatWindow(){

  const [messages,setMessages] = useState([]);

  const handleSend = async (text)=>{

    const userMessage = {
      role:"user",
      content:text
    };

    setMessages(prev=>[...prev,userMessage]);

    const res = await askQuestion(text);

    const botMessage = {
      role:"assistant",
      content:res.answer
    };

    setMessages(prev=>[...prev,botMessage]);
  };

  return(
    <div className="chat-window">

      <div className="messages">

        {messages.map((m,i)=>(
          <MessageBubble key={i} message={m}/>
        ))}

      </div>

      <MessageInput onSend={handleSend}/>

    </div>
  )
}