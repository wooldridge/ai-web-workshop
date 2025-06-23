import { z } from "zod";

export default (server: any) => {
  server.tool(
    "create_database",
    "Create a new MarkLogic database with the specified name",
    {
      name: z.string().describe("The name of the database to create"),
    },
    async ({ name }: any) => {

      console.error("Input: ", name)

      try {
        const response = await fetch(
            `http://localhost:4014/api/databases`,
            {
              method:'POST', 
              body: JSON.stringify({ name }),
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