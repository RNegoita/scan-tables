import { DynamoDBClient } from "@aws-sdk/client-dynamodb";

const getDynamoClient = () => {
  const dynamodb = new DynamoDBClient({});

  return dynamodb;
};

export default getDynamoClient;
