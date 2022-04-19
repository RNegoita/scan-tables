import {
  DescribeTableCommand,
  ScanCommand,
  ScanCommandInput,
} from "@aws-sdk/client-dynamodb";
import { unmarshall } from "@aws-sdk/util-dynamodb";
import { DateTime } from "luxon";
import getDynamoClient from "./getDynamoClient";

const MAX_LOANS_PER_SCAN = 25;

export const chunk = (arr: any[], size: number) =>
  Array.from({ length: Math.ceil(arr.length / size) }, (v, i) =>
    arr.slice(i * size, i * size + size)
  );

const getItemsCount = async (tableName: string): Promise<number> => {
  const dynamodb = getDynamoClient();
  const loansTableItemCount = await dynamodb.send(
    new DescribeTableCommand({
      TableName: tableName,
    })
  );

  return loansTableItemCount.Table?.ItemCount ?? 0;
};

const getSegment = async <T>(input: ScanCommandInput): Promise<T[]> => {
  const dynamodb = getDynamoClient();
  const results = await dynamodb.send(new ScanCommand(input));

  const segments = results.Items?.map((item) => unmarshall(item) as T) ?? [];

  if (!results.LastEvaluatedKey) {
    return segments;
  }

  return segments;
};

const getSegments = async (table: string) => {
  const count = await getItemsCount(table);

  const segmentsNeeded = Math.ceil(count / MAX_LOANS_PER_SCAN);
  /**
   * Each loan object has 13 KB -> each object is consuming 4 DynamoDB RCUs
   * 1 segment scan = 25 loans => 100 RCUs
   * 100 segment scans / s => 100 * 100 = 10K RCUs
   *
   * The default limit for DynamoDB is 40K RCUs, so there are 30K available for prod
   *
   * The script below runs 100 segment scans each second on the loan table in order to get the id and additional fields (createdAt) and saves them into a json file.
   */
  const segmentsIndexes = Array.from(Array(segmentsNeeded).keys());

  const segmentsChunks = chunk(segmentsIndexes, 100);

  return {
    segmentsNeeded,
    segmentsChunks,
    count,
  };
};
export const getItems = async <T>(
  table: string,
  input: ScanCommandInput,
  type: string
): Promise<T[]> => {
  const startTime = DateTime.now();

  const { segmentsNeeded, segmentsChunks, count } = await getSegments(table);

  const items = [];
  for (const segmentChunk of segmentsChunks) {
    const scannedItems = await Promise.all(
      segmentChunk.map(async (segmentIndex: number) => {
        input.Segment = segmentIndex;
        input.TotalSegments = segmentsNeeded;
        console.log(
          `Scanning ${type} segment ${
            segmentIndex + 1
          } out of ${segmentsNeeded}...`
        );
        return getSegment<T>(input);
      })
    );

    items.push(...scannedItems.flat());
    console.log(`There are ${items.length} items processed out of ${count}.`);
  }

  const durationInSeconds = DateTime.now().diff(startTime).as("seconds");
  console.log(`It took ${durationInSeconds} seconds.`);
  return items;
};
