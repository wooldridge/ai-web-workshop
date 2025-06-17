"use server";

// Import Chat interface
// import { ChatOllama } from "@langchain/ollama";
import { ChatOpenAI } from "@langchain/openai";
// import { WatsonxAI } from "@langchain/community/llms/watsonx_ai";
import { stopwords } from "./stopwords";

import { createReactAgent } from "@langchain/langgraph/prebuilt";

import {
  mapStoredMessagesToChatMessages,
  StoredMessage,
} from "@langchain/core/messages";

import { tool } from "@langchain/core/tools";
import { z } from "zod";

import { WikipediaQueryRun } from "@langchain/community/tools/wikipedia_query_run";
import { GooglePlacesAPI } from "@langchain/community/tools/google_places";

export async function message(messages: StoredMessage[]) {

  // console.log("messages", messages);

  const deserialized = mapStoredMessagesToChatMessages(messages);

  const searchWikipediaTool = tool(
    async (input) => {
          if (!input.query) return "No search query provided";

          try {
              const response = await fetch(
                  `https://en.wikipedia.org/w/api.php?action=query&format=json&list=search&formatversion=2&srsearch=${encodeURIComponent(
                      input.query
                  )}`
              );

              const data = await response.json();

              return JSON.stringify(data?.query?.search);
          } catch (e) {
              return "Something went wrong.";
          }
      },
      {
          name: "search_wikipedia",
          description: "Search information on Wikipedia",
          schema: z.object({
              query: z.string().describe("Search query"),
          }),
      }
  );

  const llm = new ChatOpenAI({
      openAIApiKey: process.env.OPENAI_APIKEY,
      model: "gpt-4.1",
      temperature: 0 // lower temperature = less deterministic
  });

  const wikipediaTool = new WikipediaQueryRun({
      topKResults: 1,
      maxDocContentLength: 100,
  });

  const googlePlacesTool = new GooglePlacesAPI();

  const getWikipediaPageTool = tool(
    async (input) => {
      if (!input.pageId) return "No page id provided";
  
      try {
        const response = await fetch(
          `https://en.wikipedia.org/w/api.php?action=parse&format=json&pageid=${input.pageId.toString()}&formatversion=2`
        );
  
        const data = await response.json();
  
        return JSON.stringify(data?.parse?.text);
      } catch (e) {
        return "Something went wrong.";
      }
    },
    {
      name: "get_wikipedia_page",
      description: "Retrieve a specific page from Wikipedia",
      schema: z.object({
        pageId: z.string().describe("Page id"),
      }),
    }
  );

  const searchMarkLogicTool = tool(
    async (input) => {
          if (!input.query) return "No search query provided";

          const tokens = input.query.split(" ");
          const tokens_punctuation_removed = tokens.map((token) => {
              return token.replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g, "");
          });
          const tokens_lowercase = tokens_punctuation_removed.map((token) => {
              return token.toLowerCase();
          });
          const tokens_stopwords_removed = tokens_lowercase.filter((token) => {
              return !stopwords.includes(token);
          });

          try {
              const response = await fetch(
                  `http://localhost:8080/v1/search?options=search-options&format=json&q=${tokens_stopwords_removed.join(" ")}`,
                  {
                    method:'GET', 
                    headers: {'Authorization': 'Basic ' + btoa('admin:admin')}
                  }
              );

              const data = await response.json();

              console.log('data', data);

              const extractedData = data?.results?.map((result: any) => {
                return result.extracted.content[0].transcript;
              });

              console.log(extractedData);

              return JSON.stringify(extractedData);
          } catch (e) {
              return "Something went wrong.";
          }
      },
      {
          name: "search_marklogic",
          description: "Search information in MarkLogic",
          schema: z.object({
              query: z.string().describe("Search query"),
          }),
      }
  );

  const crimeReportsTool = tool(
    async (input) => {

          const body = {
            qtext: input.qtext,
            type: input.type,
            start: input.start,
            end: input.end,
            radius: input.radius,
            latitude: input.latitude,
            longitude: input.longitude
          };

          try {
              const response = await fetch(
                  `http://localhost:4014/api/reports`,
                  {
                    method:'POST', 
                    body: JSON.stringify(body),
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
      // tools: [googlePlacesTool],
      // tools: [searchMarkLogicTool],
      // tools: [searchWikipediaTool],
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