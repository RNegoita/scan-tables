import { TransactWriteItemsCommand } from "@aws-sdk/client-dynamodb";
import { CONSUMER_PAYMENT_INFO_TABLE, LOANS_TABLE } from "../constants";
import { ConsumerPaymentInfo, Loan } from "../types";
import getDynamoClient from "./getDynamoClient";
import { chunk, getItems } from "./getItems";

const updateLoans = async (loans: Loan[]) => {
  const dynamodb = getDynamoClient();
  const transactItems = loans.map((loan) => {
    return {
      Update: {
        TableName: LOANS_TABLE,
        Key: {
          id: { S: loan.id },
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

const getLoansWithAutoPayOutOfSync = async (): Promise<Loan[]> => {
  const loansScanCommandInput = {
    TableName: LOANS_TABLE,
    FilterExpression:
      "loanStatus.autopayIntent = :autopayIntent AND loanStatus.application <> :appCanceled AND loanStatus.application <> :appDeclined AND createdAt >= :createdAt",
    ExpressionAttributeValues: {
      ":autopayIntent": { BOOL: false },
      ":appCanceled": { S: "Canceled" },
      ":appDeclined": { S: "Declined" },
      ":createdAt": { S: "2022-03-15T00:00:00.686Z" },
    },
    ProjectionExpression:
      "id, loanStatus.autopayIntent, loanStatus.application, createdAt",
  };
  const loans = await getItems<Loan>(
    LOANS_TABLE,
    loansScanCommandInput,
    "Loans"
  );

  const loansPaymentInfoScanCommandInput = {
    TableName: CONSUMER_PAYMENT_INFO_TABLE,
    FilterExpression: "achValidationStatus <> :achValidationStatus",
    ExpressionAttributeValues: {
      ":achValidationStatus": { S: "OptOut" },
    },
  };

  const loansConsumerPaymentInfo = await getItems<ConsumerPaymentInfo>(
    CONSUMER_PAYMENT_INFO_TABLE,
    loansPaymentInfoScanCommandInput,
    "PaymentInfo"
  );

  const filteredLoans = loans.filter((loan) => {
    return (
      loansConsumerPaymentInfo.findIndex(
        (loanConsumerPaymentInfo) => loanConsumerPaymentInfo.loanId === loan.id
      ) > -1
    );
  });
  console.log("Number of affected loans: ", filteredLoans.length);
  /*if (filteredLoans.length > 0) {
    await updateLoans(filteredLoans);
  }*/
  // @ts-ignore
  return filteredLoans.map((filteredLoan) => filteredLoan.id);
};

export default getLoansWithAutoPayOutOfSync;
