import { z } from "zod";

export default (server: any) => {
  server.tool(
    "search_wikipedia",
    "Search information on Wikipedia",
    {
      query: z.string().describe("Search query"),
    },
    async ({ query }: any) => {
      try {
        if (!query) throw new Error();

        const response = await fetch(
          `https://en.wikipedia.org/w/api.php?action=query&format=json&list=search&formatversion=2&srsearch=${encodeURIComponent(
            query
          )}`
        );

        const data = await response.json();
        console.log("search_wikipedia", { data });

        return {
          content: [{ type: "text", text: JSON.stringify(data?.query?.search) }],
        };
      } catch (e) {
        return { content: [{ type: "text", text: "Something went wrong." }] };
      }
    }
  );
};