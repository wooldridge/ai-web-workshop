"use client";

import { useState } from "react";
import {
  HumanMessage,
  SystemMessage,
  BaseMessage,
  AIMessage,
  mapChatMessagesToStoredMessages,
} from "@langchain/core/messages";
import { message } from "./actions";
import { ChatBot } from "ml-fasttrack";

export default function Home() {

  const bot = {
    id: 0,
    name: "Crime Reports Bot",
    avatarUrl: ""
  }

  const user = { 
    id: 1, 
    name: "Detective", 
    avatarUrl: "" 
  }

  const initialMessages = [
    {
      author: bot,
      timestamp: new Date(),
      text: "Hello, ask me about crime reports.",
    }
  ];

  const [messagesDisplayed, setMessagesDisplayed] = useState<any>(initialMessages);
  const [messages, setMessages] = useState<any>([
    new SystemMessage(`${new Date().toISOString()}
      You are a friendly assistant that answers questions about crime reports. Please answer my questions thorougly and don't hallucinate.

      When using the crime_reports tool, submit the query to the tool to retrieve information about the crime reports.
      The crime_reports query should include the type of crime, start date, end date, radius, latitude, and longitude if available.
      The query should be in the format described in the tool definition.

      If you need geolocation information, you can use the google-maps tool to get the latitude and longitude of a location.

      Along with your response, include the number of reports you considered when determining your response.

      If the event information is not available, please say "I don't know" or "I don't have that information".
    `)
  ]);

  /* 
  Questions:
  - Did Jane Doe commit crimes associated with obnoxiousness on a holiday weekend in January?
  - Did Jane Smith and a person named Joe commit similar crimes near Fishermans Wharf in Mar.?
  - Did a suspect wearing jeans commit any crimes at mall in the Market St. area?
  - Who committed more property crimes in February, Joe Schmoe or Joe Blow?
  */

  const handlescroll = () => {
    setTimeout(() => {
      const messageList = document.querySelector(".k-message-list");
      if (messageList) {
        messageList.scrollTop = messageList.scrollHeight;
      }
    });
  }

  async function sendMessage(event: any) {

    const messageHistory = [...messages, new HumanMessage(event.message.text)];

    // Add the user's message to the displayed messages and show the bot typing
    setMessagesDisplayed((oldMessages: any) => [...oldMessages, event.message]);
    setMessagesDisplayed((oldMessages: any) => [...oldMessages,
      {
        author: bot,
        typing: true,
      }
    ]);
    handlescroll();

    // Get the bot's response and add it to the message history
    const response = await message(
      mapChatMessagesToStoredMessages(messageHistory)
    );
    if (response) {
      messageHistory.push(new AIMessage(response as string));
    }
    setMessages(messageHistory);

    // Show the bot's response in the chat
    setMessagesDisplayed((oldMessages: any) => [...oldMessages,
      {
        author: bot,
        timestamp: new Date(),
        text: response,
      }
    ])

    handlescroll();
  }

  return (

    <div>
      <ChatBot 
        messages={messagesDisplayed}
        onMessageSend={sendMessage}
        customBotResponse
        showRestart
        width={800}
      />
    </div>
  );
}
