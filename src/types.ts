export type Loan = {
  id: string;
  createdAt: string;
  loanStatus: {
    autopayIntent: boolean;
    application: string;
  };
};

export type ConsumerPaymentInfo = {
  loanId: string;
  achValidationStatus: string;
};
