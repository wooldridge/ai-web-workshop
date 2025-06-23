import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import crime_reports from "./tools/crime_reports.js";
import search_wikipedia from "./tools/search_wikipedia.js";
import get_wikipedia_page from "./tools/get_wikipedia_page.js";
import create_database from "./tools/create_database.js";
import get_database_properties from "./tools/get_database_properties.js";
import create_document from "./tools/create_document.js";

// Create MCP server instance
const server = new McpServer({
  name: "marklogic_search",
  version: "1.0.0",
});

server.tool(
  "crime_reports_with_params",
  "Search for crime reports based on a query",
  {
      qtext: z.string().describe("Relevant text to search for in crime reports. The text can be a single word or a phrase. If the text is not provided, the tool will return all crime reports."),
      type: z
      .array(z.string().describe("Type of crime report to search for. Possible values: ['assault', 'cybercrime', 'disturbing the peace', 'looting', 'public intoxication', 'robbery', 'shoplifting', 'vandalism', 'vehicle break-in']"))
      .describe("Array of crime types to search for"),
      start: z.string().describe("Start date for the search query in ISO 8601 date format, for example 2025-06-11T12:30:00-0700 format. The date can range from 2024-01-01T00:00:00-0700 to 2024-03-31T23:59:59-0700"),
      end: z.string().describe("End date for the search query in ISO 8601 date format, for example 2025-06-12T12:30:00-0700 format. The date can range from 2024-01-01T00:00:00-0700 to 2024-03-31T23:59:59-0700"),
      radius: z.number().describe("Radius in miles to search for crime reports around a specific location"),
      latitude: z.number().describe("Latitude of the location to search for crime reports around, for example 37.7749 format"),
      longitude: z.number().describe("Longitude of the location to search for crime reports around, for example -122.4194 format")
  },
  async ({qtext, type, start, end, radius, latitude, longitude}) => {

    const body = {
      "qtext": qtext, 
      "type": type, 
      "start": start, 
      "end": end, 
      "radius": radius, 
      "latitude": latitude, 
      "longitude": longitude
    };

    console.error("Input Body: ", body)
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

      console.log(extractedData);
      return { content: [{ type: "text", text: JSON.stringify(extractedData) }] }; 

    } catch (e) {
      return { content: [{ type: "text", text: "Something went wrong." }] };
    }
  }
);

crime_reports(server);
search_wikipedia(server);
get_wikipedia_page(server);
create_database(server);
get_database_properties(server);
create_document(server);

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("MCP Server running on stdio");
}

main().catch((error) => {
  console.error("Fatal error in main():", error);
  process.exit(1);
});