import fs from "fs/promises";
import { DateTime } from "luxon";
import getLoansWithAutoPayOutOfSync from "./utils/getLoansWithAutoPayOutOfSync";

async function main() {
  const loans = await getLoansWithAutoPayOutOfSync();
  await fs.writeFile(
    `${process.env.STAGE}-loans-${DateTime.now().toISO()}.json`,
    JSON.stringify(loans, null, 2)
  );
}

main();
