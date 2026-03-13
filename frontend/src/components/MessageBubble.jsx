import React from "react";
export default function MessageBubble({message}){

  const isUser = message.role === "user";

  return(

    <div className={isUser ? "message user":"message bot"}>

      {message.content}

    </div>

  )
}