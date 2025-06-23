import { z } from "zod";

export default (server: any) => {
  server.tool(
    "get_database_properties",
    "Get the configuration properties of a MarkLogic database.",
    {
      name: z.string().describe("The name of the database"),
    },
    async ({ name }: any) => {

      console.error("Input: ", name)

      try {
        const response = await fetch(
            `http://localhost:4014/api/databases?name=${encodeURIComponent(name)}`,
            {
              method:'GET', 
              headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Basic ' + btoa('admin:admin')
              }
            }
        );

        const data = await response.json();

        return { content: [{ type: "text", text: JSON.stringify(data) }] }; 
      } catch (e) {
        return { content: [{ type: "text", text: "Something went wrong." }] };
      }
    }
  );
};