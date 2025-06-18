"use server";

// Import Chat interface
// import { ChatOllama } from "@langchain/ollama";
import { ChatOpenAI } from "@langchain/openai";
// import { WatsonxAI } from "@langchain/community/llms/watsonx_ai";

import { createReactAgent } from "@langchain/langgraph/prebuilt";

import {
  mapStoredMessagesToChatMessages,
  StoredMessage,
} from "@langchain/core/messages";

import { tool } from "@langchain/core/tools";
import { z } from "zod";

import { GooglePlacesAPI } from "@langchain/community/tools/google_places";

export async function message(messages: StoredMessage[]) {

  const deserialized = mapStoredMessagesToChatMessages(messages);

  const llm = new ChatOpenAI({
      openAIApiKey: process.env.OPENAI_APIKEY,
      model: "gpt-4.1",
      temperature: 0 // lower temperature = less deterministic
  });

  const googlePlacesTool = new GooglePlacesAPI();

  const crimeReportsTool = tool(
    async (input) => {

          try {
              const response = await fetch(
                  `http://localhost:4014/api/reports`,
                  {
                    method:'POST', 
                    body: JSON.stringify(input),
                    headers: {
                      'Content-Type': 'application/json',
                      'Authorization': 'Basic ' + btoa('admin:admin')
                    }
                  }
              );

              const data = await response.json();

              const extractedData = data?.results?.map((result: any) => {
                return {
                  id: result.extracted.content[0].id,
                  type: result.extracted.content[0].type,
                  date: result.extracted.content[0].time,
                  location: result.extracted.content[0].address.street,
                  transcript: result.extracted.content[0].transcript,
                }
              });

              return JSON.stringify(extractedData);

          } catch (e) {
              return "Something went wrong.";
          }
      },
      {
          name: "crime_reports",
          description: "Search for crime reports based on a query",
          schema: z.object({
              qtext: z.string().describe("Relevant text to search for in crime reports. The text can be a single word or a phrase. If the text is not provided, the tool will return all crime reports."),
              type: z.string().array().describe("Type of crime report to search for. Possible values: ['assault', 'cybercrime', 'disturbing the peace', 'looting', 'public intoxication', 'robbery', 'shoplifting', 'vandalism', 'vehicle break-in']"),
              start: z.string().describe("Start date for the search query in ISO 8601 date format, for example 2025-06-11T12:30:00-0700 format. The date can range from 2024-01-01T00:00:00-0700 to 2024-03-31T23:59:59-0700"),
              end: z.string().describe("End date for the search query in ISO 8601 date format, for example 2025-06-12T12:30:00-0700 format. The date can range from 2024-01-01T00:00:00-0700 to 2024-03-31T23:59:59-0700"),
              radius: z.number().describe("Radius in miles to search for crime reports around a specific location"),
              latitude: z.number().describe("Latitude of the location to search for crime reports around, for example 37.7749 format"),
              longitude: z.number().describe("Longitude of the location to search for crime reports around, for example -122.4194 format"),
          }),
      }
  );

  const agent = createReactAgent({
      llm,
      tools: [crimeReportsTool, googlePlacesTool],
  });

  const response = await agent.invoke({
      messages: deserialized,
  });

  // console.dir(response, { depth: null });

  response.messages.forEach((message, index) => {
    console.log(message.constructor.name);
    console.log(message.name);
    if (message.lc_kwargs.tool_calls) {
      console.dir(message.lc_kwargs.tool_calls, { depth: null });
    }
    console.dir(message.content.toString().substring(0, 500), { depth: null });
    console.dir(' ---------------------------------------------------------- ');
  })

  return response.messages[response.messages.length - 1].content;
}