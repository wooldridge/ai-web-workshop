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

  console.log("messages", messages);

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

          // http://localhost:8080/v1/search?options=search-options&format=json&q=Jane

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

          console.log('tokens_stopwords_removed', tokens_stopwords_removed);

          console.log('tokens_stopwords_removed string', tokens_stopwords_removed.join(" "));

          try {
              const response = await fetch(
                  // `http://localhost:8080/v1/search?options=search-options&format=json&q=${encodeURIComponent(
                  //     input.query,
                  // )}`,
                  // `http://localhost:8080/v1/search?options=search-options&format=json&q=${encodeURIComponent(
                  //   tokens_stopwords_removed.join(" "),
                  // )}`,
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

  const agent = createReactAgent({
      llm,
      tools: [googlePlacesTool],
      // tools: [searchMarkLogicTool],
  });

  const response = await agent.invoke({
      messages: deserialized,
  });

  console.log(response);

  return response.messages[response.messages.length - 1].content;
}