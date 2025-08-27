
// Import modules from their specific packages as required for Amplify v6
import { Amplify } from 'aws-amplify';
import { fetchAuthSession, fetchUserAttributes, signInWithRedirect } from '@aws-amplify/auth';

// Global variables to track configuration state
let isAmplifyConfigured = false;
let configuredBucketName = null;
let configuredRegion = null;

/**
 * This function configures AWS Amplify for the Application
 * @returns {Object} The configuration that was applied, or null if configuration failed
 */
export function configureAmplify() {  
    console.group('Amplify Configuration');
    try {
        // Check if we've already configured Amplify in this session
        if (isAmplifyConfigured && configuredBucketName) {
            console.log('Amplify was already configured by this function with bucket:', configuredBucketName);
            console.groupEnd();
            return { bucket: configuredBucketName, region: configuredRegion };
        }
        
        // First check if Amplify is already configured elsewhere
        const existingConfig = Amplify.getConfig();
        if (existingConfig && 
            existingConfig.Auth?.Cognito?.userPoolId && 
            existingConfig.Storage?.S3?.bucket) {
            console.log('Amplify appears to be already configured with bucket:', existingConfig.Storage.S3.bucket);
            // Store this for our tracking
            configuredBucketName = existingConfig.Storage.S3.bucket;
            configuredRegion = existingConfig.Storage.S3.region;
            isAmplifyConfigured = true;
            console.groupEnd();
            return { bucket: configuredBucketName, region: configuredRegion };
        }
        
        // Add detailed debugging to check the authdata object
        console.log('Auth data object:', window.authdata);
        console.log('Auth region:', window.authdata?.Auth?.region);
        console.log('Auth userPoolId:', window.authdata?.Auth?.userPoolId);
        console.log('Auth userPoolWebClientId:', window.authdata?.Auth?.userPoolWebClientId);
        console.log('Auth identityPoolId:', window.authdata?.Auth?.identityPoolId);
        console.log('Auth RootBucket:', window.authdata?.Auth?.RootBucket);
        
        if (!window.authdata || !window.authdata.Auth) {
            console.error('ERROR: window.authdata or window.authdata.Auth is undefined!');
            // Try to load from local storage as a fallback
            const storedAuthData = localStorage.getItem('auth_config');
            if (storedAuthData) {
                try {
                    window.authdata = JSON.parse(storedAuthData);
                    console.log('Loaded authdata from localStorage:', window.authdata);
                } catch (parseError) {
                    console.error('Failed to parse stored auth data:', parseError);
                }
            }
            
            // If still no authdata, we can't proceed
            if (!window.authdata || !window.authdata.Auth) {
                console.error('No valid authdata available, cannot configure Amplify');
                console.groupEnd();
                return null;
            }
        } else {
            // Store auth data in localStorage for future use
            try {
                localStorage.setItem('auth_config', JSON.stringify(window.authdata));
                console.log('Stored authdata in localStorage');
            } catch (storeError) {
                console.warn('Failed to store auth data in localStorage:', storeError);
            }
        }
    
        // Convert the legacy config format to the new Amplify v6 format
        const authConfig = {
            Cognito: {
                userPoolId: window.authdata.Auth.userPoolId,
                userPoolClientId: window.authdata.Auth.userPoolWebClientId, // Using current client ID without fallback
                identityPoolId: window.authdata.Auth.identityPoolId,
                loginWith: {
                    username: true, 
                    email: true      
                }
            }
        };

        console.log('Auth config:', authConfig);

        // Save the bucket name and region to guarantee access to them
        const bucketName = window.authdata.Auth.RootBucket;
        const region = window.authdata.Auth.region;
        
        // Fail early if no bucket name is available
        if (!bucketName) {
            console.error('ERROR: No bucket name available in window.authdata.Auth.RootBucket');
            console.groupEnd();
            return null;
        }
        
        console.log('About to configure Amplify with bucket:', bucketName, 'region:', region);
        
        // Store bucket name in localStorage for persistence across reloads
        try {
            localStorage.setItem('s3_bucket_name', bucketName);
            localStorage.setItem('s3_region', region);
            console.log('Stored bucket and region in localStorage');
        } catch (e) {
            console.warn('Failed to store bucket info in localStorage:', e);
        }
        
        try {
            // Reset any existing Amplify configuration to ensure clean state
            Amplify.reset();
            console.log('Reset existing Amplify configuration');
        } catch (resetError) {
            console.warn('Error resetting Amplify configuration (this may be normal):', resetError);
        }
        
        // CRITICAL CHANGE: Configure Amplify completely with a single call - do not make multiple calls to configure
        // as this can cause previous configuration to be lost
        const fullConfig = {
            Auth: authConfig,
            Storage: {
                S3: {
                    bucket: bucketName,
                    region: region
                }
            }
        };
        
        console.log('Configuring Amplify with full config:', JSON.stringify(fullConfig, null, 2));
        Amplify.configure(fullConfig);
        
        console.log('Amplify configured successfully');
        
        // Test if auth and storage are properly configured
        const configResult = Amplify.getConfig();
        console.log('After initial configuration, Amplify.getConfig():', configResult);
        console.log('Storage bucket in configuration:', configResult?.Storage?.S3?.bucket);
        
        // Check if the configuration was successful
        if (!configResult?.Storage?.S3?.bucket) {
            console.error('ERROR: Bucket missing after configuration!');
            console.groupEnd();
            return null;
        }
        
        // Store configuration status
        configuredBucketName = bucketName;
        configuredRegion = region;
        isAmplifyConfigured = true;
        
        // Verify Lambda function URLs are available
        if (!window.authdata.FunctionUrls || !window.authdata.FunctionUrls.GetWfFunctionUrl) {
            console.warn('WARNING: Lambda function URLs may be missing or incorrect:', window.authdata.FunctionUrls);
        } else {
            console.log('Lambda function URLs available:', Object.keys(window.authdata.FunctionUrls));
        }
        
        console.log('Amplify configuration complete with bucket:', bucketName);
        console.groupEnd();
        return { bucket: bucketName, region: region };
    } catch (error) {
        console.error('Error configuring Amplify:', error);
        console.groupEnd();
        return null;
    }
}

/**
 * Verifies that Amplify is configured with Storage S3 bucket
 * @returns {boolean} - true if properly configured, false otherwise
 */
export function verifyAmplifyStorageConfig() {
    try {
        const config = Amplify.getConfig();
        if (config?.Storage?.S3?.bucket) {
            return true;
        }
        
        // If not configured, try to configure again
        const configResult = configureAmplify();
        return configResult !== null;
    } catch (error) {
        console.error('Error verifying Amplify config:', error);
        return false;
    }
}

// SetS3Config function removed as it's no longer needed in Amplify v6
// Storage configuration is now passed directly in each storage operation

// Export functions needed for the application
export { 
  fetchAuthSession, 
  fetchUserAttributes,
  signInWithRedirect,
  
  // Re-export the Amplify object for global configuration
  Amplify
};
