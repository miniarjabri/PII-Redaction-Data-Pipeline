import React, { Suspense, useEffect, useState } from 'react';
import { Amplify } from 'aws-amplify';
import { signIn, fetchUserAttributes, fetchAuthSession, signInWithRedirect } from '@aws-amplify/auth';
import { Authenticator } from '@aws-amplify/ui-react';
import { configureAmplify, verifyAmplifyStorageConfig } from './services/aws_services';
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import Layout from 'src/components/Layout';
import Spinner from 'src/components/Spinner'
import { UserRoleProvider } from './context/UserRoleContext';
import '@aws-amplify/ui-react/styles.css';
import './App.css';
import logo from 'src/assets/logo.png';


const ProcessDocs = React.lazy(() => import('./pages/ProcessDocs'));
const ReviewDocs = React.lazy(() => import('./pages/ReviewDocs'));
const ReviewWf = React.lazy(() => import('./pages/ReviewDocs/ReviewWorkflow'));
const Home = React.lazy(() => import('src/pages/Home'));

const queryClient = new QueryClient();

// This component will handle fetching user attributes
function AuthenticatedApp({ signOut, user }) {
  const [userWithAttributes, setUserWithAttributes] = useState(user);
  const [authChecked, setAuthChecked] = useState(false);
  const [userRole, setUserRole] = useState('customer'); // Default to lowest permission level
  
  useEffect(() => {
    async function getUserAttributes() {
      if (user) {
        try {
          // Check if we have valid credentials
          const authSession = await fetchAuthSession();
          if (!authSession?.credentials?.accessKeyId) {
            console.warn('No valid credentials found, forcing sign out');
            signOut();
            return;
          }
          
          const attributes = await fetchUserAttributes();
          console.log('User attributes:', attributes);
          
          // Get user's Cognito groups from the token
          let userGroups = [];
          let detectedRole = 'customer'; // Default role
          
          // Extract groups from JWT claims if available
          try {
            if (authSession.tokens?.idToken?.payload) {
              // Get groups from cognito:groups claim in the ID token
              const payload = authSession.tokens.idToken.payload;
              if (payload['cognito:groups']) {
                userGroups = Array.isArray(payload['cognito:groups']) 
                  ? payload['cognito:groups'] 
                  : [payload['cognito:groups']];
                
                console.log('User groups from token:', userGroups);
                
                // Set role based on group membership
                if (userGroups.includes('admin')) {
                  detectedRole = 'admin';
                }
              }
            }
          } catch (tokenError) {
            console.warn('Error extracting groups from token:', tokenError);
            // Fallback to custom attribute if available
            detectedRole = attributes['custom:userRole'] || 'customer';
          }
          
          // Create a new user object with attributes
          const enhancedUser = { 
            ...user,
            username: user.username || attributes.email || 'User',
            given_name: attributes.given_name || '',
            family_name: attributes.family_name || '',
            role: detectedRole,
            groups: userGroups
          };
          
          // Set the user role state
          setUserRole(detectedRole);
          
          // Remove localStorage role storage - we're now using context
          setUserWithAttributes(enhancedUser);
          setAuthChecked(true);
        } catch (error) {
          console.error('Error fetching user attributes:', error);
          setUserWithAttributes(user);
          setAuthChecked(true);
          
          // If there's an authentication error, sign out
          if (error.message && error.message.toLowerCase().includes('auth')) {
            console.warn('Authentication error detected, signing out');
            signOut();
          }
        }
      }
    }
    getUserAttributes();
  }, [user, signOut]);
  
  return (
    <UserRoleProvider initialRole={userRole}>
      <App signOut={signOut} user={userWithAttributes || user} />
    </UserRoleProvider>
  );
}

function App({ signOut, user }) {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Layout user={user} signOut={signOut} />}>
            <Route path="/" element={<Suspense fallback={<Spinner/>}>
                                            <Home/>
                                      </Suspense>} />
            <Route path="/process" element={<Suspense fallback={<Spinner/>}>
                                                <ProcessDocs endToend={false}/>
                                            </Suspense>} />
            <Route path="/review" element={<Suspense fallback={<Spinner/>}>
                                                <ReviewDocs/>
                                          </Suspense>} />
            <Route path="/review/wf/:wfid" element={<Suspense fallback={<Spinner/>}>
                                                        <ReviewWf/>
                                                    </Suspense>} />
          </Route>
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  );
}

// Custom components for Authenticator
const components = {
  Header() {
    return (
      <div className='login-header'>
        <img src={logo} style={{width: '70px'}} alt="aws_logo" />
        <h4>Secure Shield : PII Redaction </h4>
      </div>
    );
  }
};

// Wrap the App with the new Authenticator component
export default function AppWithAuth() {
  const [isConfigured, setIsConfigured] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  
  // Ensure Amplify is configured before rendering Authenticator
  useEffect(() => {
    async function initializeAmplify() {
      console.log('Initializing Amplify before authentication...');
      try {
        // Attempt to configure Amplify
        await configureAmplify();
        
        // Verify the configuration was successful
        const isValid = verifyAmplifyStorageConfig();
        setIsConfigured(isValid);
        
        if (isValid) {
          console.log('Amplify successfully configured for authentication');
          
          // Log the configuration for debugging
          const config = Amplify.getConfig();
          console.log('Current Amplify config:', config);
          
          // In Amplify v6, redirect handling is automatic when using signInWithRedirect
          // We don't need to explicitly call handleRedirectResult as it's not exported
          console.log('Amplify v6 automatically handles redirects when using signInWithRedirect');
          
          // Check if we have valid credentials which would indicate successful auth
          try {
            const session = await fetchAuthSession();
            if (session?.credentials?.accessKeyId) {
              console.log('Valid credentials found - redirect must have been handled successfully');
            }
          } catch (sessionErr) {
            console.error('Error checking session after potential redirect:', sessionErr);
          }
        } else {
          console.error('Failed to configure Amplify properly - configuration invalid');
        }
      } catch (err) {
        console.error("Failed to configure Amplify:", err);
        setIsConfigured(false);
      } finally {
        setIsLoading(false);
      }
    }
    
    initializeAmplify();
  }, []);
  
  // Show a loading state while configuration is in progress
  if (isLoading) {
    return <div style={{
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      height: '100vh',
      flexDirection: 'column',
      gap: '20px'
    }}>
      <div>Loading authentication configuration...</div>
    </div>;
  }
  
  // Show an error message if configuration failed
  if (!isConfigured) {
    return <div style={{
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      height: '100vh',
      flexDirection: 'column',
      gap: '20px',
      color: 'red'
    }}>
      <div>Authentication configuration error!</div>
      <div>Please check the console for more details.</div>
      <button onClick={() => window.location.reload()}>
        Retry
      </button>
    </div>;
  }
  
  // Only render Authenticator once configuration is successful
  return (
    <Authenticator
        components={components}
        loginMechanisms={['username']}  
        signUpAttributes={[]}
        hideSignUp={true}
        initialState="signIn"
        services={{
          handleSignIn: async ({ username, password }) => {
            console.log('Handling sign in with input:', { username, password });
            try {
              console.log('About to sign in with:', { username, password: '***' });
              const result = await signIn({ username, password });
              console.log('Sign in result:', result);
              return result;
            } catch (error) {
              console.error('Sign in error:', error);
              throw error;
            }
          }
        }}
      >
        {({ signOut, user }) => {
          console.log('User authenticated:', user);
          return <AuthenticatedApp signOut={signOut} user={user} />;
        }}
      </Authenticator>
  );
}
