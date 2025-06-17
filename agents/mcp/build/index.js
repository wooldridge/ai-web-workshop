import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
// import { GooglePlacesAPI } from "@langchain/community/tools/google_places";
import { z } from "zod";
// Create MCP server instance
const server = new McpServer({
    name: "marklogic_search",
    version: "1.0.0",
});
// {
// "qtext": "jane doe",
// "type": ["cybercrimes"],
// "start": "2024-01-01T00:00:00-0700",
// "end": "2024-03-31T23:59:59-0700",
// "radius": 197,
// "latitude": 37.7749,
// "longitude": -122.4194
// }
server.tool("crime_reports_with_params", "Search for crime reports based on a query", {
    qtext: z.string().describe("Relevant text to search for in crime reports. The text can be a single word or a phrase. If the text is not provided, the tool will return all crime reports."),
    type: z
        .array(z.string().describe("Type of crime report to search for. Possible values: ['assault', 'cybercrime', 'disturbing the peace', 'looting', 'public intoxication', 'robbery', 'shoplifting', 'vandalism', 'vehicle break-in']"))
        .describe("Array of crime types to search for"),
    start: z.string().describe("Start date for the search query in ISO 8601 date format, for example 2025-06-11T12:30:00-0700 format. The date can range from 2024-01-01T00:00:00-0700 to 2024-03-31T23:59:59-0700"),
    end: z.string().describe("End date for the search query in ISO 8601 date format, for example 2025-06-12T12:30:00-0700 format. The date can range from 2024-01-01T00:00:00-0700 to 2024-03-31T23:59:59-0700"),
    radius: z.number().describe("Radius in miles to search for crime reports around a specific location"),
    latitude: z.number().describe("Latitude of the location to search for crime reports around, for example 37.7749 format"),
    longitude: z.number().describe("Longitude of the location to search for crime reports around, for example -122.4194 format")
}, async ({ qtext, type, start, end, radius, latitude, longitude }) => {
    const body = {
        "qtext": qtext,
        "type": type,
        "start": start,
        "end": end,
        "radius": radius,
        "latitude": latitude,
        "longitude": longitude
    };
    console.error("Input Body: ", body);
    try {
        const response = await fetch(`http://localhost:4014/api/reports`, {
            method: 'POST',
            body: JSON.stringify(body),
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Basic ' + btoa('admin:admin')
            }
        });
        const data = await response.json();
        const extractedData = data?.results?.map((result) => {
            return {
                id: result.extracted.content[0].id,
                type: result.extracted.content[0].type,
                date: result.extracted.content[0].time,
                location: result.extracted.content[0].address.street,
                transcript: result.extracted.content[0].transcript,
            };
        });
        console.log(extractedData);
        return { content: [{ type: "text", text: JSON.stringify(extractedData) }] };
    }
    catch (e) {
        return { content: [{ type: "text", text: "Something went wrong." }] };
    }
});
server.tool("crime_reports_with_object", "Search for crime reports based on a query", {
    input: z.object({
        qtext: z.string().describe("Relevant text to search for in crime reports. The text can be a single word or a phrase. If the text is not provided, the tool will return all crime reports."),
        type: z.string().array().describe("Type of crime report to search for. Possible values: ['assault', 'cybercrime', 'disturbing the peace', 'looting', 'public intoxication', 'robbery', 'shoplifting', 'vandalism', 'vehicle break-in']"),
        start: z.string().describe("Start date for the search query in ISO 8601 date format, for example 2025-06-11T12:30:00-0700 format. The date can range from 2024-01-01T00:00:00-0700 to 2024-03-31T23:59:59-0700"),
        end: z.string().describe("End date for the search query in ISO 8601 date format, for example 2025-06-12T12:30:00-0700 format. The date can range from 2024-01-01T00:00:00-0700 to 2024-03-31T23:59:59-0700"),
        radius: z.number().describe("Radius in miles to search for crime reports around a specific location"),
        latitude: z.number().describe("Latitude of the location to search for crime reports around, for example 37.7749 format"),
        longitude: z.number().describe("Longitude of the location to search for crime reports around, for example -122.4194 format")
    }).describe("Input object containing search parameters for crime reports")
}, async ({ input }) => {
    const body = {
        "qtext": input.qtext,
        "type": input.type,
        "start": input.start,
        "end": input.end,
        "radius": input.radius,
        "latitude": input.latitude,
        "longitude": input.longitude
    };
    console.error("Input Body: ", body);
    try {
        const response = await fetch(`http://localhost:4014/api/reports`, {
            method: 'POST',
            body: JSON.stringify(body),
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Basic ' + btoa('admin:admin')
            }
        });
        const data = await response.json();
        const extractedData = data?.results?.map((result) => {
            return {
                id: result.extracted.content[0].id,
                type: result.extracted.content[0].type,
                date: result.extracted.content[0].time,
                location: result.extracted.content[0].address.street,
                transcript: result.extracted.content[0].transcript,
            };
        });
        console.log(extractedData);
        return { content: [{ type: "text", text: JSON.stringify(extractedData) }] };
    }
    catch (e) {
        return { content: [{ type: "text", text: "Something went wrong." }] };
    }
});
// server.tool(
//   "google_places",
//   "Search for places in San Francisco, California",
//   async ({ input }) => {
//     const googlePlaces = new GooglePlacesAPI({ apiKey: process.env.GOOGLE_PLACES_API_KEY });
//     const results = await googlePlaces.searchPlaces(input);
//     return { content: [{ type: "text", text: JSON.stringify(results) }] };
//   }
// )
// MCP Server Tool Definition
server.tool("search_wikipedia", "Search information on Wikipedia", {
    query: z.string().describe("Search query"),
}, async ({ query }) => {
    try {
        if (!query)
            throw new Error();
        const response = await fetch(`https://en.wikipedia.org/w/api.php?action=query&format=json&list=search&formatversion=2&srsearch=${encodeURIComponent(query)}`);
        const data = await response.json();
        console.log("search_wikipedia", { data });
        return {
            content: [{ type: "text", text: JSON.stringify(data?.query?.search) }],
        };
    }
    catch (e) {
        return { content: [{ type: "text", text: "Something went wrong." }] };
    }
});
// MCP Server Tool Definition
server.tool("get_wikipedia_page", "Retrieve a specific page from Wikipedia", {
    pageId: z.string().describe("Page id"),
}, async ({ pageId }) => {
    try {
        if (!pageId)
            throw new Error();
        const response = await fetch(`https://en.wikipedia.org/w/api.php?action=parse&format=json&pageid=${pageId}&formatversion=2`);
        const data = await response.json();
        console.log("get_wikipedia_page", { data });
        return {
            content: [{ type: "text", text: JSON.stringify(data?.parse?.text) }],
        };
    }
    catch (e) {
        return { content: [{ type: "text", text: "Something went wrong." }] };
    }
});
async function main() {
    const transport = new StdioServerTransport();
    await server.connect(transport);
    console.error("MCP Server running on stdio");
}
main().catch((error) => {
    console.error("Fatal error in main():", error);
    process.exit(1);
});
