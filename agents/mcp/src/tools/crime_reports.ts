import { z } from "zod";

/*
EXAMPLE USAGE
Search for crime reports based on a query with the following parameters:

{
    "qtext": "jane doe",
    "type": ["looting"],
    "start": "2024-01-01T00:00:00-0700",
    "end": "2024-03-31T23:59:59-0700",
    "radius": 10,
    "latitude": 37.773972,
    "longitude": -122.431297
}
*/

export default (server: any) => {
  server.tool(
    "crime_reports",
    "Search for crime reports based on a query",
    {
      input: z.object({
        qtext: z.string().describe("Relevant text to search for in crime reports. The text can be a single word or a phrase. If the text is not provided, the tool will return all crime reports."),
        type: z.string().array().describe("Type of crime report to search for. Possible values: ['assault', 'cybercrime', 'disturbing the peace', 'looting', 'public intoxication', 'robbery', 'shoplifting', 'vandalism', 'vehicle break-in']"),
        start: z.string().describe("Start date for the search query in ISO 8601 date format, for example 2025-06-11T12:30:00-0700 format. The date can range from 2024-01-01T00:00:00-0700 to 2024-03-31T23:59:59-0700"),
        end: z.string().describe("End date for the search query in ISO 8601 date format, for example 2025-06-12T12:30:00-0700 format. The date can range from 2024-01-01T00:00:00-0700 to 2024-03-31T23:59:59-0700"),
        radius: z.number().describe("Radius in miles to search for crime reports around a specific location"),
        latitude: z.number().describe("Latitude of the location to search for crime reports around, for example 37.7749 format"),
        longitude: z.number().describe("Longitude of the location to search for crime reports around, for example -122.4194 format")
      }).describe("Input object containing search parameters for crime reports")
    },
    async ({ input }: { input: { qtext: string; type: string[]; start: string, end: string; radius: number; latitude: number; longitude: number } }) => {
      const body = {
        "qtext": input.qtext, 
        "type": input.type, 
        "start": input.start, 
        "end": input.end, 
        "radius": input.radius, 
        "latitude": input.latitude, 
        "longitude": input.longitude
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
  )
};