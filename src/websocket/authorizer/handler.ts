import {
  APIGatewayRequestAuthorizerEvent,
  CustomAuthorizerResult,
} from "aws-lambda";
import * as jwt from "jsonwebtoken";
import jwkToPem from "jwk-to-pem";
import axios from "axios";

// Replace with your Cognito User Pool ID and AWS Region
const COGNITO_USER_POOL_ID = process.env.COGNITO_USER_POOL_ID;
const AWS_REGION = process.env.AWS_REGION;

const COGNITO_ISSUER = `https://cognito-idp.${AWS_REGION}.amazonaws.com/${COGNITO_USER_POOL_ID}`;

async function getJwks() {
  const jwksUrl = `${COGNITO_ISSUER}/.well-known/jwks.json`;
  const response = await axios.get(jwksUrl);
  return response.data.keys;
}

async function validateToken(
  event: APIGatewayRequestAuthorizerEvent
): Promise<CustomAuthorizerResult> {
  // const token = event.headers["Auth"];
  console.log("headers %j", event.queryStringParameters);
  const token = event.queryStringParameters["Auth"];
  console.log("token %j", token);
  const decodedToken = jwt.decode(token, { complete: true });

  if (!decodedToken || typeof decodedToken === "string") {
    throw new Error("Invalid token");
  }

  const jwks = await getJwks();
  const jwk = jwks.find((key: any) => key.kid === decodedToken.header.kid);
  if (!jwk) {
    throw new Error("Invalid token");
  }

  const pem = jwkToPem(jwk);
  return new Promise((resolve, reject) => {
    jwt.verify(token, pem, { issuer: COGNITO_ISSUER }, (err, decoded) => {
      if (err) {
        reject("Unauthorized");
      } else {
        resolve({
          principalId: decoded.sub,
          policyDocument: {
            Version: "2012-10-17",
            Statement: [
              {
                Action: "execute-api:Invoke",
                Effect: "Allow",
                Resource: "*",
              },
            ],
          },
        });
      }
    });
  });
}

export const authorizer = async (
  event: APIGatewayRequestAuthorizerEvent
): Promise<CustomAuthorizerResult> => {
  try {
    return await validateToken(event);
  } catch (error) {
    console.error("Token validation error:", error);
    return {
      principalId: "user",
      policyDocument: {
        Version: "2012-10-17",
        Statement: [
          {
            Action: "execute-api:Invoke",
            Effect: "Deny",
            Resource: event.methodArn,
          },
        ],
      },
    };
  }
};
