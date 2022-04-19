import { TransactWriteItemsCommand } from "@aws-sdk/client-dynamodb";
import fs from "fs/promises";
import { DateTime } from "luxon";
import { LOANS_TABLE } from "./constants";
import { Loan } from "./types";
import getDynamoClient from "./utils/getDynamoClient";
import { chunk } from "./utils/getItems";

const updateLoans = async (loanIds: String[]) => {
  const dynamodb = getDynamoClient();
  const transactItems = loanIds.map((loanId) => {
    return {
      Update: {
        TableName: LOANS_TABLE,
        Key: {
          id: { S: loanId },
        },
        UpdateExpression: "SET loanStatus.autopayIntent = :autopayIntent",
        ExpressionAttributeValues: {
          ":autopayIntent": { BOOL: true },
        },
      },
    };
  });
  let transactions = 0;
  let index = 1;
  const segmentsChunks = chunk(transactItems, 25);
  for (const segmentChunk of segmentsChunks) {
    if (index === 1) {
      const input = {
        TransactItems: segmentChunk,
      };
      const command = new TransactWriteItemsCommand(input);
      await dynamodb.send(command);
      transactions += segmentChunk.length;
      console.log(
        `There are ${transactions} items updated out of ${transactItems.length}.`
      );
      index += 1;
    }
  }
};

async function main() {
  const filteredLoans = ["22-06-007990", "22-08-007697"];
  await updateLoans(filteredLoans);
}

main();