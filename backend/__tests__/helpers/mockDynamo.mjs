// Provides jest.fn() stubs for DynamoDB DocumentClient commands
// Usage: import { mockDynamo, resetMocks } from "./mockDynamo.mjs";

const store = new Map();

export const mockSend = jest.fn();

jest.mock("@aws-sdk/lib-dynamodb", () => ({
  DynamoDBDocumentClient: {
    from: jest.fn(() => ({ send: mockSend })),
  },
  GetCommand: jest.fn((params) => ({ type: "Get", ...params })),
  PutCommand: jest.fn((params) => ({ type: "Put", ...params })),
  UpdateCommand: jest.fn((params) => ({ type: "Update", ...params })),
  DeleteCommand: jest.fn((params) => ({ type: "Delete", ...params })),
  QueryCommand: jest.fn((params) => ({ type: "Query", ...params })),
  ScanCommand: jest.fn((params) => ({ type: "Scan", ...params })),
  TransactWriteCommand: jest.fn((params) => ({ type: "TransactWrite", ...params })),
}));

jest.mock("@aws-sdk/client-dynamodb", () => ({
  DynamoDBClient: jest.fn(() => ({})),
}));

export function resetMocks() {
  mockSend.mockReset();
  store.clear();
}

export function mockGet(item) {
  mockSend.mockResolvedValueOnce({ Item: item });
}

export function mockPut() {
  mockSend.mockResolvedValueOnce({});
}

export function mockQuery(items) {
  mockSend.mockResolvedValueOnce({ Items: items, Count: items.length });
}

export function mockNotFound() {
  mockSend.mockResolvedValueOnce({ Item: undefined });
}

export function mockConditionCheckFailed() {
  const error = new Error("ConditionalCheckFailedException");
  error.name = "ConditionalCheckFailedException";
  mockSend.mockRejectedValueOnce(error);
}
