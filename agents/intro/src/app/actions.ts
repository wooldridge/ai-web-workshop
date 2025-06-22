"use server";

import { ChatOpenAI } from "@langchain/openai";
import { createReactAgent } from "@langchain/langgraph/prebuilt";
import {
  mapStoredMessagesToChatMessages,
  StoredMessage,
} from "@langchain/core/messages";

import { MultiServerMCPClient } from "@langchain/mcp-adapters";

const llm = new ChatOpenAI({
    openAIApiKey: process.env.OPENAI_APIKEY,
    model: "gpt-4.1",
    temperature: 0 // lower temperature = less deterministic
});

export async function message(messages: StoredMessage[]) {

  const deserialized = mapStoredMessagesToChatMessages(messages);

  // Create client and connect to server
  const client = new MultiServerMCPClient({
    throwOnLoadError: true,
    prefixToolNameWithServerName: true,
    additionalToolNamePrefix: "mcp",

    // Server configuration
    mcpServers: {
      marklogic_search: {
        transport: "stdio",
        command: "node",
        args: [`/Users/wooldrid/projects/ai-web-workshop/agents/mcp/build/index.js`],
      },
      "google-maps": {
        "command": "npx",
        "args": ["-y", "@modelcontextprotocol/server-google-maps"],
        "env": {
          "GOOGLE_MAPS_API_KEY": "AIzaSyDJNI3nYoJtvBfZLFLYJHGBqJPO6OIQB68"
        }
      },
    },
  });

  const mcpTools = await client.getTools();

  console.log("MCP Tools:", mcpTools);

  if (mcpTools.length === 0) {
    throw new Error("No tools found");
  }

  const agent = createReactAgent({
      llm,
      tools: mcpTools,
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