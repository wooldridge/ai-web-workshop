"use client";

import { useEffect, useState } from "react";
import {
  HumanMessage,
  SystemMessage,
  BaseMessage,
  AIMessage,
  mapChatMessagesToStoredMessages,
} from "@langchain/core/messages";
import { message } from "./actions";
import ReactMarkdown from 'react-markdown';

export default function Home() {
  const [inputMessage, setInputMessage] = useState("");
  const [messages, setMessages] = useState<BaseMessage[]>([

    // For the Search MarkLogic tool
    // new SystemMessage(`
    //   You are a friendly assistant that answers questions about crime events. Please answer my questions thorougly and don't hallucinate.

    //   When using the MarkLogic Search tool: always call the 'search_marklogic' to retrieve information about the crime events.

    //   If the event information is not available, please say "I don't know" or "I don't have that information".
    // `),

    // For the Crime Reports tool
    new SystemMessage(`${new Date().toISOString()}
      You are a friendly assistant that answers questions about crime reports. Please answer my questions thorougly and don't hallucinate.

      When using the crime_reports tool, submit the query to the tool to retrieve information about the crime reports.
      The crime_reports query should include the type of crime, start date, end date, radius, latitude, and longitude if available.
      The crime_reports query should be in the format:
      {
        "qtext": "Descriptive string or phrase or keywords to search for in crime reports. These can include person names, locations, clothing, vehicles, or other descriptive keywords",
        "type": "Type of crime report to search for. This is an array of strings, for example ['robbery', 'public intoxication'], the possible values are: ['assault', 'cybercrime', 'disturbing the peace', 'looting', 'public intoxication', 'robbery', 'shoplifting', 'vandalism', 'vehicle break-in']",
        "start": "Start date for the search query in ISO 8601 date format, for example 2025-06-11T12:30:00-0700 format. The date can range from 2024-01-01T00:00:00-0700 to 2024-01-29T23:59:59-0700. Assume the start date is in this range.",
        "end": "End date for the search query in ISO 8601 date format, for example 2025-06-11T12:30:00-0700 format. The date can range from 2024-01-01T00:00:00-0700 to 2024-01-29T23:59:59-0700. Assume the end date is in this range.",
        "radius": "Radius in miles to search for crime reports around a specific location",
        "latitude": "Latitude of the location to search for crime reports",
        "longitude": "Longitude of the location to search for crime reports"
      }

      If you need to retrieve the latitude and longitude of a location, you can use the Google Places tool to get the latitude and longitude values for the location assuming it is located somewhere in San Francisco, California.
      The Google Places tool should return the values in JSON format like this: {"latitude": 37.7749, "longitude": -122.4194}.
      Use the latitude and longitude values to search for crime reports around a specific location.

      Along with your response, include the number of reports you considered when determining your response.
      
      Along with your response, include a bulleted list of the crime reports that you used to answer the question.
      The list should include the following information for each crime report:
      - Crime Report ID
      - Crime Report Type
      - Crime Report Date
      - Crime Report Location

      Return the response in Markdown format.

      If the event information is not available, please say "I don't know" or "I don't have that information".
    `),

    // For the general assistant tool
    // new SystemMessage(`
    //   You are a friendly assistant that answers questions. Please answer my questions thorougly and don't hallucinate.

    //   If the event information is not available, please say "I don't know" or "I don't have that information".
    // `),

    // For the Google Places tool
    // new SystemMessage(`
    //   You are an assistant that answers questions about places in San Francisco, California, with the Google Places tool. 
      
    //   Please answer questions by returning the latitude and longitude values for the location assuming it is located somewhere in San Francisco, California.

    //   Return the values in JSON format like this: {"latitude": 37.7749, "longitude": -122.4194}.

    //   If the event information is not available, please say "I don't know" or "I don't have that information".
    // `),
  ]);
  const [isLoading, setIsLoading] = useState(false);

  async function sendMessage() {

    setIsLoading(true); // set to true
    const messageHistory = [...messages, new HumanMessage(inputMessage)];

    console.log("sendMessage", inputMessage, messageHistory);

    const response = await message(
      mapChatMessagesToStoredMessages(messageHistory)
    );

    if (response) {
      messageHistory.push(new AIMessage(response as string));
    }

    setMessages(messageHistory);
    setInputMessage("");
    setIsLoading(false); // set to false
  }

  return (
    <div className="flex flex-col h-screen justify-between">
      <header className="bg-white p-2">
        <div className="flex lg:flex-1 items-center justify-center">
          <a href="#" className="m-1.5">
            <span className="sr-only">My First Agent</span>
          </a>
          <h1 className="text-black font-bold">My First Agent</h1>
        </div>
      </header>
      <div className="flex flex-col h-full">
        {messages.length > 0 &&
          messages.map((message, index) => {
            if (message instanceof HumanMessage) {
              return (
                <div
                  key={message.getType() + index}
                  className="col-start-1 col-end-8 p-3 rounded-lg"
                >
                  <div className="flex flex-row items-center">
                    <div className="flex items-center justify-center h-8 w-8 rounded-full bg-orange-400 text-white flex-shrink-0 text-sm">
                      Me
                    </div>
                    <div className="relative ml-3 text-sm bg-white py-2 px-4 shadow rounded-xl">
                      <div>{message.content as string}</div>
                    </div>
                  </div>
                </div>
              );
            }

            if (message instanceof AIMessage) {
              return (
                <div
                  key={message.getType() + index}
                  className="col-start-6 col-end-13 p-3 rounded-lg"
                >
                  <div className="flex items-center justify-start flex-row-reverse">
                    <div className="flex items-center justify-center h-8 w-8 rounded-full bg-green-400 flex-shrink-0 text-sm">
                      AI
                    </div>
                    <div className="relative mr-3 text-sm bg-indigo-100 py-2 px-4 shadow rounded-xl">
                      <div><ReactMarkdown>{message.content as string}</ReactMarkdown></div>
                    </div>
                  </div>
                </div>
              );
            }
          })}
      </div>
      <div className="flex flex-col flex-auto justify-between bg-gray-100 p-6">
        <div className="top-[100vh] flex flex-row items-center h-16 rounded-xl bg-white w-full px-4">
          <div className="flex-grow ml-4">
            <div className="relative w-full">
              <input
                type="text"
                disabled={isLoading}
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && sendMessage()}
                className="flex w-full border rounded-xl focus:outline-none focus:border-indigo-300 pl-4 h-10"
              />
            </div>
          </div>
          <div className="ml-4">
            <button
              onClick={sendMessage}
              className="flex items-center justify-center bg-indigo-500 hover:bg-indigo-600 rounded-xl text-white px-4 py-2 flex-shrink-0"
            >
              <span>{isLoading ? "Loading..." : "Send"}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
