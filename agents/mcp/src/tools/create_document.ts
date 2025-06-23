import { z } from "zod";

/* EXAMPLE USAGE
// Create a new document with the specified URI, content, database, collections, and permissions

/example3.json
abc123
ai-tools-mcp-content
["test", "test3"]
["crime-map-role=read", "crime-map-role=update"]

*/

export default (server: any) => {
  server.tool(
    "create_document",
    "Create a new document with a specified URI in a MarkLogic database",
    {
      uri: z.string().describe("The URI of the document to create"),
      content: z.string().describe("The content of the document that you are creating as a text string, for example 'This is my content.'. It will be converted to JSON format before being stored in the database."),
      database: z.string().describe("The name of the database where the document will be created"),
      collections: z.array(z.string()).describe("An array of collections to associate with the document. The array can be empty if no collections are needed. Collections are used to group documents together for easier management and retrieval."),
      permissions: z.array(z.string()).describe("The permissions to apply to the document defined as an array of alternating roles and capabilities. Each permission definition should have a 'role' and a 'capability' property. For example, to assign the 'read' and 'update' capabilities to the 'app-user' role, use the following: ['app-user', 'read', 'app-user', 'update']. The roles and capabilities are defined in the MarkLogic server configuration. The roles can be any valid role in the system, and the capabilities can be 'read', 'update', or 'execute'."),
    },
    async ({ uri, content, database, collections, permissions }: any) => {

      console.error("Input: ", { uri, content, database, collections, permissions })

      try {
        const response = await fetch(
            `http://localhost:4014/api/documents`,
            {
              method:'PUT', 
              body: JSON.stringify({ uri, content, database, collections, permissions }),
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