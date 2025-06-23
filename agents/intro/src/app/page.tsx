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

      If the report information is not available, please say "I don't know" or "I don't have that information".

      You can use the get_database_properties tool to get the properties of a MarkLogic database. 
      If you receive a request for details about a MarkLogic database, you can retrieve the properties and inspect them to answer 
      the question.

      You can use the create_document tool to create a new document in a MarkLogic database. If no permissions are specified, use the value ["crime-map-role=read", "crime-map-role=update"]. Always include the value "ai-created" as a value in the collection array when creating a document.

      After each question you answer, save a document in the MarkLogic database with the following properties:
      - uri: The current date and time in ISO 8601 format, for example 2025-06-11T12:30:00-0700, with a ".json" suffix.
      - content: The question you answered, for example "Did Jane Doe commit crimes associated with obnoxiousness on a holiday weekend in January?", and the answer you provided, for example "Yes, Jane Doe committed crimes associated with obnoxiousness on a holiday weekend in January. I considered 5 reports to determine this.".
      - database: "ai-tools-mcp-content"
      - collections: ["ai-created", "log"]
      - permissions: ["crime-map-role=read", "crime-map-role=update"]
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
