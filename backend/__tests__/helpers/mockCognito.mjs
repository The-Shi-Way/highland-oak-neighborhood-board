jest.mock("@aws-sdk/client-cognito-identity-provider", () => ({
  CognitoIdentityProviderClient: jest.fn(() => ({ send: mockCognitoSend })),
  AdminCreateUserCommand: jest.fn((p) => ({ type: "AdminCreateUser", ...p })),
  AdminSetUserPasswordCommand: jest.fn((p) => ({ type: "AdminSetUserPassword", ...p })),
  AdminUpdateUserAttributesCommand: jest.fn((p) => ({ type: "AdminUpdateUserAttributes", ...p })),
  AdminDeleteUserCommand: jest.fn((p) => ({ type: "AdminDeleteUser", ...p })),
  InitiateAuthCommand: jest.fn((p) => ({ type: "InitiateAuth", ...p })),
  GlobalSignOutCommand: jest.fn((p) => ({ type: "GlobalSignOut", ...p })),
  ForgotPasswordCommand: jest.fn((p) => ({ type: "ForgotPassword", ...p })),
  ConfirmForgotPasswordCommand: jest.fn((p) => ({ type: "ConfirmForgotPassword", ...p })),
}));

export const mockCognitoSend = jest.fn();

export function resetCognitoMocks() { mockCognitoSend.mockReset(); }
