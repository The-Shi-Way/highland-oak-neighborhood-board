import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient,
  GetCommand,
  PutCommand,
  UpdateCommand,
  DeleteCommand,
  QueryCommand,
  TransactWriteCommand,
  ScanCommand,
} from "@aws-sdk/lib-dynamodb";

const client = new DynamoDBClient({
  region: process.env.AWS_REGION || "us-east-1",
});

const docClient = DynamoDBDocumentClient.from(client, {
  marshallOptions: {
    removeUndefinedValues: true,
  },
});

const TABLE_NAME = process.env.TABLE_NAME;

export async function getItem(pk, sk) {
  const result = await docClient.send(
    new GetCommand({
      TableName: TABLE_NAME,
      Key: { PK: pk, SK: sk },
    })
  );
  return result.Item || null;
}

export async function putItem(item) {
  await docClient.send(
    new PutCommand({
      TableName: TABLE_NAME,
      Item: item,
    })
  );
  return item;
}

export async function putItemConditional(item, conditionExpression, expressionAttributeNames, expressionAttributeValues) {
  const params = {
    TableName: TABLE_NAME,
    Item: item,
    ConditionExpression: conditionExpression,
  };
  if (expressionAttributeNames) params.ExpressionAttributeNames = expressionAttributeNames;
  if (expressionAttributeValues) params.ExpressionAttributeValues = expressionAttributeValues;
  await docClient.send(new PutCommand(params));
  return item;
}

export async function updateItem(pk, sk, updates) {
  const expressionParts = [];
  const expressionNames = {};
  const expressionValues = {};

  for (const [key, value] of Object.entries(updates)) {
    const nameKey = `#${key}`;
    const valueKey = `:${key}`;
    expressionParts.push(`${nameKey} = ${valueKey}`);
    expressionNames[nameKey] = key;
    expressionValues[valueKey] = value;
  }

  const result = await docClient.send(
    new UpdateCommand({
      TableName: TABLE_NAME,
      Key: { PK: pk, SK: sk },
      UpdateExpression: `SET ${expressionParts.join(", ")}`,
      ExpressionAttributeNames: expressionNames,
      ExpressionAttributeValues: expressionValues,
      ReturnValues: "ALL_NEW",
    })
  );
  return result.Attributes;
}

export async function updateItemExpression(pk, sk, updateExpression, expressionNames, expressionValues, conditionExpression) {
  const params = {
    TableName: TABLE_NAME,
    Key: { PK: pk, SK: sk },
    UpdateExpression: updateExpression,
    ExpressionAttributeNames: expressionNames,
    ExpressionAttributeValues: expressionValues,
    ReturnValues: "ALL_NEW",
  };
  if (conditionExpression) params.ConditionExpression = conditionExpression;
  const result = await docClient.send(new UpdateCommand(params));
  return result.Attributes;
}

export async function deleteItem(pk, sk) {
  await docClient.send(
    new DeleteCommand({
      TableName: TABLE_NAME,
      Key: { PK: pk, SK: sk },
    })
  );
}

export async function queryItems(params) {
  const result = await docClient.send(
    new QueryCommand({
      TableName: TABLE_NAME,
      ...params,
    })
  );
  return {
    items: result.Items || [],
    lastEvaluatedKey: result.LastEvaluatedKey,
  };
}

export async function scanItems(params) {
  const result = await docClient.send(
    new ScanCommand({
      TableName: TABLE_NAME,
      ...params,
    })
  );
  return {
    items: result.Items || [],
    lastEvaluatedKey: result.LastEvaluatedKey,
  };
}

export async function transactWrite(ops) {
  await docClient.send(
    new TransactWriteCommand({
      TransactItems: ops,
    })
  );
}

export { TABLE_NAME };
