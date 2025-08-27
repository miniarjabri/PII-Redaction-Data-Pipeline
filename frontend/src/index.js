
import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import reportWebVitals from './reportWebVitals';

// Amplify Initialization - Import what we need
import { Amplify } from 'aws-amplify';
import '@aws-amplify/ui-react/styles.css';
import { configureAmplify } from "./services/aws_services";

// IMPORTANT: Make Amplify available globally to fix "window.Amplify is undefined" errors
window.Amplify = Amplify;

// Create a flag to track configuration state
window.amplifyConfigured = false;

/**
 * Wait for amplify.js script to load and check for window.authdata availability
 * Returns a promise that resolves with authdata or null if not found
 */
const waitForAmplifyScript = () => {
  return new Promise((resolve) => {
    // Check if authdata is already available
    if (window.authdata) {
      console.log('amplify.js already loaded with authdata');
      return resolve(window.authdata);
    }
    
    console.log('Waiting for amplify.js to load...');
    
    // Check for existing script element
    const existingScript = document.querySelector('script[src*="amplify.js"]');
    
    if (existingScript) {
      // Script exists but may not be loaded yet
      console.log('Found amplify.js script tag, waiting for load completion');
      
      // Define onload handler for the script
      const originalOnload = existingScript.onload;
      existingScript.onload = () => {
        console.log('amplify.js script loaded');
        
        // Call original onload if it exists
        if (originalOnload) originalOnload();
        
        // Give a small delay for authdata to be populated
        setTimeout(() => {
          console.log('Checking for authdata after script load');
          resolve(window.authdata);
        }, 100);
      };
      
      // In case script is already loaded but onload didn't fire for us
      if (existingScript.complete) {
        console.log('amplify.js script already complete, checking authdata');
        setTimeout(() => resolve(window.authdata), 0);
      }
    } else {
      console.log('No amplify.js script found in DOM, using polling');
      // Script doesn't exist yet or couldn't be detected, set up polling
      const maxAttempts = 20;
      let attempts = 0;
      
      const checkAuthData = () => {
        if (window.authdata) {
          console.log('authdata found after polling (attempt ' + attempts + ')');
          return resolve(window.authdata);
        }
        
        attempts++;
        if (attempts >= maxAttempts) {
          console.warn('Failed to find authdata after ' + maxAttempts + ' attempts');
          
          // Try to initialize from localStorage as fallback
          try {
            const storedAuthData = localStorage.getItem('auth_config');
            if (storedAuthData) {
              const authConfig = JSON.parse(storedAuthData);
              console.log('Using authdata from localStorage instead');
              window.authdata = authConfig; // Make it globally available
              return resolve(authConfig);
            }
          } catch (e) {
            console.error('Error using localStorage fallback:', e);
          }
          
          return resolve(null);
        }
        
        // Increase delay with each attempt (exponential backoff)
        const delay = Math.min(100 * Math.pow(1.5, attempts), 2000);
        console.log(`Attempt ${attempts}/${maxAttempts}, next check in ${delay}ms`);
        setTimeout(checkAuthData, delay);
      };
      
      // Start polling
      checkAuthData();
    }
  });
};

/**
 * Initialize Amplify with configuration from localStorage if available
 */
const initializeFromLocalStorage = () => {
  // Prioritize current window.authdata over localStorage
  if (window.authdata && window.authdata.Auth && window.authdata.Auth.userPoolWebClientId) {
    console.log('Using current window.authdata instead of localStorage');
    
    // Check if localStorage has a different client ID and clear it if needed
    try {
      const storedAuthData = localStorage.getItem('auth_config');
      if (storedAuthData) {
        const storedConfig = JSON.parse(storedAuthData);
        if (storedConfig.Auth && storedConfig.Auth.userPoolWebClientId !== window.authdata.Auth.userPoolWebClientId) {
          console.warn('Found outdated client ID in localStorage, clearing auth_config');
          localStorage.removeItem('auth_config');
        }
      }
    } catch (e) {
      console.error('Error checking localStorage client ID:', e);
    }
    
    return false;
  }
  
  try {
    const authConfig = JSON.parse(localStorage.getItem('auth_config'));
    if (!authConfig) return false;
    
    console.log('Initializing Amplify from localStorage config');
    
    // Set up the Cognito configuration
    const amplifyConfig = {
      Auth: {
        Cognito: {
          userPoolId: authConfig.Auth.userPoolId,
          userPoolClientId: authConfig.Auth.userPoolWebClientId,
          identityPoolId: authConfig.Auth.identityPoolId,
          loginWith: {
            username: true,
            email: true
          }
        }
      },
      Storage: {
        S3: {
          bucket: authConfig.Auth.RootBucket,
          region: authConfig.Auth.region
        }
      }
    };
    
    // Configure Amplify
    Amplify.configure(amplifyConfig);
    console.log('Amplify initialized from localStorage');
    window.amplifyConfigured = true;
    return true;
  } catch (e) {
    console.error('Error initializing Amplify from localStorage:', e);
    return false;
  }
};

/**
 * Main function to safely initialize Amplify
 */
const safelyInitializeAmplify = async () => {
  // Skip if already configured
  if (window.amplifyConfigured) {
    console.log('Amplify already configured, skipping initialization');
    return;
  }
  
  console.log('Starting Amplify initialization process');
  
  // Try to initialize from localStorage first as it's faster
  if (localStorage.getItem('auth_config') && initializeFromLocalStorage()) {
    return;
  }
  
  // Wait for amplify.js script to load and provide authdata
  const authdata = await waitForAmplifyScript();
  
  if (authdata) {
    console.log('authdata found, configuring Amplify');
    configureAmplify();
    window.amplifyConfigured = true;
    console.log('Amplify configured successfully');
  } else {
    console.error('Failed to get authdata, Amplify configuration incomplete');
  }
};

// Check for and clear stale auth data in localStorage if window.authdata is available
if (window.authdata && window.authdata.Auth && window.authdata.Auth.userPoolWebClientId) {
  try {
    const storedAuthData = localStorage.getItem('auth_config');
    if (storedAuthData) {
      const storedConfig = JSON.parse(storedAuthData);
      if (storedConfig.Auth && storedConfig.Auth.userPoolWebClientId !== window.authdata.Auth.userPoolWebClientId) {
        console.warn('Found outdated client ID in localStorage, clearing auth_config on startup');
        localStorage.removeItem('auth_config');
        console.log('Using fresh auth configuration from window.authdata');
      }
    }
  } catch (e) {
    console.error('Error checking localStorage client ID:', e);
  }
}

// Initialize as soon as possible
safelyInitializeAmplify();

// Also initialize on DOMContentLoaded to make sure it happens before React components need it
document.addEventListener('DOMContentLoaded', () => {
  console.log('DOMContentLoaded fired');
  if (!window.amplifyConfigured) {
    safelyInitializeAmplify();
  }
});

// Final safety net - initialize on window load if still not configured
window.addEventListener('load', () => {
  console.log('Window load event fired');
  if (!window.amplifyConfigured) {
    console.log('Last attempt to configure Amplify on window load');
    safelyInitializeAmplify();
  }
});

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

reportWebVitals();
