# scan-tables

    In order to create a json with the loans thant need to have autopayIntent fixed run:
        STAGE=${stage here} yarn scanLoansWithAutoPayOutOfSync

    In order to create a json with the loans thant need to have autopayIntent fixed and fix them run:
        STAGE=d${stage here} yarn scanLoansWithAutoPayOutOfSync --fixLoans

    In order to more manually fix loans:
        1. Go to src/updateLoansWithAutoPayIntent.ts
        2. Replace: `const filteredLoans = [];` with an array of loan ids generated above(or a subset for testing)
        3. Run: STAGE=${stage here} yarn updateLoansWithAutoPayIntent
