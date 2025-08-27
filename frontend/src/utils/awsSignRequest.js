/**
 * AWS Request Signing Utility
 * This file provides utilities to sign AWS requests using signature v4
 */

// Define default region and service
const DEFAULT_REGION = 'us-east-1';
const DEFAULT_SERVICE = 'lambda';

/**
 * Formats a date as YYYYMMDD
 */
function getDateStamp(now) {
  const year = now.getUTCFullYear();
  const month = (now.getUTCMonth() + 1).toString().padStart(2, '0');
  const day = now.getUTCDate().toString().padStart(2, '0');
  return `${year}${month}${day}`;
}

/**
 * Formats a date as YYYYMMDDTHHMMSSZ
 */
function getAmzDate(now) {
  const datestamp = getDateStamp(now);
  const hour = now.getUTCHours().toString().padStart(2, '0');
  const minute = now.getUTCMinutes().toString().padStart(2, '0');
  const second = now.getUTCSeconds().toString().padStart(2, '0');
  return `${datestamp}T${hour}${minute}${second}Z`;
}

/**
 * Converts a hex string to a Uint8Array
 */
function hexToBytes(hex) {
  const bytes = new Uint8Array(Math.ceil(hex.length / 2));
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  }
  return bytes;
}

/**
 * Converts a string to a Uint8Array
 */
function stringToBytes(str) {
  return new TextEncoder().encode(str);
}

/**
 * Converts a Uint8Array to a hex string
 */
function bytesToHex(bytes) {
  return Array.from(bytes)
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Creates a SHA-256 hash of the provided content
 */
async function sha256(content) {
  const msgBuffer = typeof content === 'string' ? stringToBytes(content) : content;
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
  return new Uint8Array(hashBuffer);
}

/**
 * Creates HMAC-SHA256 signature
 */
async function hmacSha256(key, message) {
  const keyBytes = typeof key === 'string' ? stringToBytes(key) : key;
  const messageBytes = typeof message === 'string' ? stringToBytes(message) : message;
  
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    keyBytes,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  
  const signature = await crypto.subtle.sign('HMAC', cryptoKey, messageBytes);
  return new Uint8Array(signature);
}

/**
 * Signs a request with AWS Signature Version 4
 * @param {object} request - The request object with url, method, headers, etc.
 * @param {object} credentials - AWS credentials with accessKeyId and secretAccessKey
 * @param {string} region - AWS region
 * @param {string} service - AWS service
 * @returns {object} - The signed request with updated headers
 */
export async function signRequest(request, credentials, region = DEFAULT_REGION, service = DEFAULT_SERVICE) {
  if (!credentials || !credentials.accessKeyId || !credentials.secretAccessKey) {
    console.error('Invalid credentials object:', JSON.stringify(credentials, (key, value) => 
      key === 'secretAccessKey' ? '[REDACTED]' : value
    ));
    throw new Error('No valid AWS credentials provided');
  }
  
  // Parse the URL
  const url = new URL(request.url);
  
  // Prepare request components
  const method = request.method || 'GET';
  const payload = request.body || '';
  
  // Create a canonical request
  const now = new Date();
  const amzdate = getAmzDate(now);
  const datestamp = getDateStamp(now);
  
  // Initialize headers
  const headers = {
    'host': url.hostname,
    'x-amz-date': amzdate,
    ...(request.headers || {})
  };
  
  // Add the security token if available
  if (credentials.sessionToken) {
    headers['x-amz-security-token'] = credentials.sessionToken;
  }
  
  // Create canonical headers
  const canonicalHeaders = Object.keys(headers)
    .sort()
    .map(key => `${key.toLowerCase()}:${headers[key].trim()}\n`)
    .join('');
  
  const signedHeaders = Object.keys(headers)
    .sort()
    .map(key => key.toLowerCase())
    .join(';');
  
  // Create canonical request
  const canonicalUri = url.pathname || '/';
  
  // Parse and sort query parameters
  const searchParams = new URLSearchParams(url.search);
  const sortedParams = new URLSearchParams();
  
  Array.from(searchParams.keys()).sort().forEach(key => {
    sortedParams.append(key, searchParams.get(key));
  });
  
  const canonicalQueryString = sortedParams.toString().replace(/\+/g, '%20');
  
  // Hash the payload
  const payloadHash = bytesToHex(await sha256(payload));
  
  const canonicalRequest = [
    method,
    canonicalUri,
    canonicalQueryString,
    canonicalHeaders,
    signedHeaders,
    payloadHash
  ].join('\n');
  
  // Create string to sign
  const algorithm = 'AWS4-HMAC-SHA256';
  const credentialScope = `${datestamp}/${region}/${service}/aws4_request`;
  
  const stringToSign = [
    algorithm,
    amzdate,
    credentialScope,
    bytesToHex(await sha256(canonicalRequest))
  ].join('\n');
  
  // Calculate the signature
  const kDate = await hmacSha256(
    stringToBytes(`AWS4${credentials.secretAccessKey}`),
    datestamp
  );
  const kRegion = await hmacSha256(kDate, region);
  const kService = await hmacSha256(kRegion, service);
  const kSigning = await hmacSha256(kService, 'aws4_request');
  const signature = bytesToHex(await hmacSha256(kSigning, stringToSign));
  
  // Create authorization header
  const authorizationHeader = [
    `${algorithm} Credential=${credentials.accessKeyId}/${credentialScope}`,
    `SignedHeaders=${signedHeaders}`,
    `Signature=${signature}`
  ].join(', ');
  
  // Add authorization header to the request headers
  headers['Authorization'] = authorizationHeader;
  
  // Return the modified request
  return {
    ...request,
    headers
  };
}

/**
 * Gets AWS credentials from various sources
 * In a browser environment, this would typically come from Cognito or similar
 */
export async function getCredentials() {
  // For simplicity in this example, we'll use hardcoded credentials for development only
  // NOTE: NEVER use hardcoded credentials in production code!
  
  // Here we're using localStorage as a simulated credential source
  // In production, you would integrate with Cognito or use other secure methods
  try {
    const storedCredentials = localStorage.getItem('aws_dev_credentials');
    if (storedCredentials) {
      return JSON.parse(storedCredentials);
    }
    
    // Try to get credentials from session using Amplify v6 format
    try {
      const { fetchAuthSession } = await import('@aws-amplify/auth');
      const authSession = await fetchAuthSession();
      console.log('Auth session retrieved for credentials:', 
                 authSession ? 'Success' : 'Failed');
      
      if (authSession && authSession.credentials) {
        // Log credentials structure (safely - don't log actual secret values)
        console.log('Credentials available in auth session with keys:', 
                   Object.keys(authSession.credentials).join(', '));
        
        // Amplify v6 provides credentials in a slightly different structure
        return {
          accessKeyId: authSession.credentials.accessKeyId,
          secretAccessKey: authSession.credentials.secretAccessKey,
          sessionToken: authSession.credentials.sessionToken
        };
      } else if (authSession && authSession.identityId) {
        console.warn('Identity found but no credentials in session');
      }
    } catch (authError) {
      console.error('Error retrieving authentication session:', authError);
    }
  } catch (e) {
    console.warn('Could not retrieve credentials from localStorage or session', e);
  }
  
  // If credentials aren't in localStorage, you might want to prompt the user
  // or use an alternative method to get them
  
  // For development purposes ONLY, you might want to use environment variables
  // but we cannot directly access them in browser code
  
  console.warn('No AWS credentials available. Lambda function calls will likely fail.');
  return null;
}

/**
 * Utility function to set credentials for development use
 * This can be called from the developer console to configure credentials
 * Example usage: 
 *   window.setDevCredentials({ accessKeyId: 'AKIAEXAMPLE', secretAccessKey: 'abcd1234', sessionToken: 'xyz' })
 */
export function setDevCredentials(credentials) {
  if (!credentials || !credentials.accessKeyId || !credentials.secretAccessKey) {
    console.error('Invalid credentials format. Must contain accessKeyId and secretAccessKey');
    return false;
  }
  
  try {
    localStorage.setItem('aws_dev_credentials', JSON.stringify(credentials));
    console.log('Development credentials saved successfully');
    
    // Expose a simple way to check current credentials
    window.checkDevCredentials = () => {
      try {
        const creds = JSON.parse(localStorage.getItem('aws_dev_credentials'));
        if (creds) {
          // Only show first few chars of secret values for security
          return {
            accessKeyId: creds.accessKeyId,
            secretAccessKey: creds.secretAccessKey.substring(0, 4) + '...' + 
                            (creds.secretAccessKey.length > 8 ? 
                             creds.secretAccessKey.substring(creds.secretAccessKey.length - 4) : ''),
            sessionToken: creds.sessionToken ? '[SESSION TOKEN PRESENT]' : undefined
          };
        }
        return null;
      } catch (e) {
        return null;
      }
    };
    
    return true;
  } catch (e) {
    console.error('Failed to save credentials to localStorage', e);
    return false;
  }
}

// Expose the credential setter to the window object for easy access in dev console
if (process.env.NODE_ENV === 'development') {
  window.setDevCredentials = setDevCredentials;
}

/**
 * Signs a URL for AWS request
 * This is a simpler wrapper around signRequest for GET requests
 */
export async function signUrl(url, credentials, region = DEFAULT_REGION, service = DEFAULT_SERVICE) {
  const request = {
    method: 'GET',
    url,
    headers: {
      'Content-Type': 'application/json'
    }
  };
  
  const signedRequest = await signRequest(request, credentials, region, service);
  return signedRequest;
}
