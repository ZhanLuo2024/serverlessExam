import { APIGatewayProxyHandlerV2 } from "aws-lambda";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient,
  QueryCommand,
  QueryCommandInput,
} from "@aws-sdk/lib-dynamodb";
import { CinemaSchedule } from "../shared/types";

const client = createDDbDocClient();

export const handler: APIGatewayProxyHandlerV2 = async (event, context) => {
  try {
    console.log("Event:", JSON.stringify(event));

    const cinemaId = Number(event.pathParameters?.cinemaId);
    if (!cinemaId) {
      return {
        statusCode: 400,
        headers: defaultHeaders(),
        body: JSON.stringify({ error: "Missing cinemaId in path." }),
      };
    }

    const movieId = event.queryStringParameters?.movieId;
    const period = event.queryStringParameters?.period;

    const input: QueryCommandInput = {
      TableName: "CinemaTable",
      KeyConditionExpression: "cinemaId = :cid",
      ExpressionAttributeValues: {
        ":cid": cinemaId,
      },
    };

    if (movieId) {
      input.KeyConditionExpression += " AND movieId = :mid";
      input.ExpressionAttributeValues![":mid"] = movieId;
    }

    if (period) {
      input.FilterExpression = "#p = :period";
      input.ExpressionAttributeNames = { "#p": "period" };
      input.ExpressionAttributeValues![":period"] = period;
    }

    const result = await client.send(new QueryCommand(input));
    const schedules = result.Items as CinemaSchedule[];

    return {
      statusCode: 200,
      headers: defaultHeaders(),
      body: JSON.stringify(schedules),
    };
  } catch (error: any) {
    console.error("Error:", error);
    return {
      statusCode: 500,
      headers: defaultHeaders(),
      body: JSON.stringify({ error: error.message || "Internal Server Error" }),
    };
  }
};

function createDDbDocClient() {
  const ddbClient = new DynamoDBClient({ region: process.env.REGION });
  return DynamoDBDocumentClient.from(ddbClient, {
    marshallOptions: {
      convertEmptyValues: true,
      removeUndefinedValues: true,
      convertClassInstanceToMap: true,
    },
    unmarshallOptions: {
      wrapNumbers: false,
    },
  });
}

function defaultHeaders() {
  return {
    "content-type": "application/json",
    "Access-Control-Allow-Origin": "*",
  };
}
