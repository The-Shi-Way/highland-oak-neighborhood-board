// Provides jest.fn() stubs for DynamoDB DocumentClient commands
// Usage: import { mockDynamo, resetMocks } from "./mockDynamo.mjs";
import { jest } from "@jest/globals";

const store = new Map();

export const mockSend = jest.fn();

jest.unstable_mockModule("@aws-sdk/lib-dynamodb", () => ({
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

class ConditionalCheckFailedException extends Error {
  constructor(message = "ConditionalCheckFailedException") {
    super(message);
    this.name = "ConditionalCheckFailedException";
  }
}

jest.unstable_mockModule("@aws-sdk/client-dynamodb", () => ({
  DynamoDBClient: jest.fn(() => ({})),
  ConditionalCheckFailedException,
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
