//Represents current authenticate user and security context
//validated application identity/context
export type Actor = {
  administratorId: bigint;
  businessId: bigint;
  sessionId: bigint;
};

export type Page = { page: number; pageSize: number };
