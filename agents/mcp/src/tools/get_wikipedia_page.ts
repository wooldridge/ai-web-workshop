import { z } from "zod";

export default (server: any) => {
  server.tool(
    "get_wikipedia_page",
    "Retrieve a specific page from Wikipedia",
    {
      pageId: z.string().describe("Page id"),
    },
    async ({ pageId }: any) => {
      try {
        if (!pageId) throw new Error();

        const response = await fetch(
          `https://en.wikipedia.org/w/api.php?action=parse&format=json&pageid=${pageId}&formatversion=2`
        );

        const data = await response.json();
        console.log("get_wikipedia_page", { data });

        return {
          content: [{ type: "text", text: JSON.stringify(data?.parse?.text) }],
        };
      } catch (e) {
        return { content: [{ type: "text", text: "Something went wrong." }] };
      }
    }
  );
};