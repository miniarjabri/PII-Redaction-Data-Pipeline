// Import directly from package to avoid tree-shaking issues
import * as StorageModule from '@aws-amplify/storage';
// Import Amplify for direct access
import { Amplify } from 'aws-amplify';
// Import the Amplify configuration helpers
import { verifyAmplifyStorageConfig } from 'src/services/aws_services';

const { uploadData, getUrl, list, remove, getProperties, copy } = StorageModule;

/**
 * Ensures that window.Amplify is always available and properly configured with Storage
 * This serves as an emergency recovery function if Amplify is undefined or improperly configured
 * @returns {boolean} true if recovery was needed and applied, false if everything was already fine
 */
function ensureAmplifyAvailable() {
    // First check if window.Amplify exists
    if (!window.Amplify) {
        console.warn('window.Amplify is undefined! Creating global reference');
        // Make Amplify available globally
        window.Amplify = Amplify;
    }
    
    // Check if we have authdata with bucket information
    if (!window.authdata?.Auth?.RootBucket) {
        console.error('No authdata with bucket information found!');
        return false;
    }
    
    // Get current Amplify configuration
    let currentConfig;
    try {
        currentConfig = window.Amplify.getConfig();
    } catch (e) {
        console.error('Error accessing Amplify.getConfig:', e);
        currentConfig = {};
    }
    
    // Check if Storage configuration needs to be fixed
    if (!currentConfig?.Storage?.S3?.bucket) {
        console.warn('Amplify Storage configuration is missing - fixing it now');
        
        // Configure Amplify with the bucket information from authdata
        try {
            window.Amplify.configure({
                Storage: {
                    S3: {
                        bucket: window.authdata.Auth.RootBucket,
                        region: window.authdata.Auth.region || 'us-east-1'
                    }
                }
            });
            
            // Save to localStorage for persistence
            localStorage.setItem('s3_bucket_name', window.authdata.Auth.RootBucket);
            localStorage.setItem('s3_region', window.authdata.Auth.region || 'us-east-1');
            
            console.log('Amplify Storage configuration fixed with bucket:', window.authdata.Auth.RootBucket);
            return true;
        } catch (e) {
            console.error('Failed to fix Amplify Storage configuration:', e);
            return false;
        }
    }
    
    return false; // No recovery was needed
}

export default class storage_service {
    constructor(props) {
        console.log('Storage service constructor called with props:', props);
        
        // HARDCODED BUCKET NAME - Only used as absolute last resort fallback
        const HARDCODED_BUCKET = 'redaction-pipeline-bucket00';
        const HARDCODED_REGION = 'us-east-1';
        
        // First, make sure Amplify is available and properly configured
        ensureAmplifyAvailable();
        
        console.log('Verifying Amplify Storage configuration...');
        // Then verify the configuration is correct
        const isConfigured = verifyAmplifyStorageConfig();
        if (!isConfigured) {
            console.warn('Amplify Storage may not be properly configured before creating StorageService');
            // Try emergency recovery
            ensureAmplifyAvailable();
        }
        
        // Get the most up-to-date Amplify configuration
        let amplifyConfig = null;
        try {
            if (window.Amplify && typeof window.Amplify.getConfig === 'function') {
                amplifyConfig = window.Amplify.getConfig();
                console.log('Got current Amplify config:', 
                    amplifyConfig?.Storage?.S3?.bucket ? 
                    `bucket: ${amplifyConfig.Storage.S3.bucket}` : 
                    'No Storage bucket in config');
            }
        } catch (e) {
            console.error('Error getting Amplify config:', e);
        }
        
        console.log('Available window.authdata:', 
            window.authdata ? 
            `bucket: ${window.authdata?.Auth?.RootBucket}` : 
            'undefined');
        
        // First check if we can get bucket from props
        let setBucket = props?.bucket;
        
        // If not in props, try Amplify config first (most reliable as it's the active configuration)
        if (!setBucket && amplifyConfig?.Storage?.S3?.bucket) {
            console.log('Using bucket from Amplify config:', amplifyConfig.Storage.S3.bucket);
            setBucket = amplifyConfig.Storage.S3.bucket;
        }
        
        // Then try window.authdata
        if (!setBucket && window.authdata?.Auth?.RootBucket) {
            console.log('Using bucket from window.authdata:', window.authdata.Auth.RootBucket);
            setBucket = window.authdata.Auth.RootBucket;
        }
        
        // Check localStorage as another fallback
        if (!setBucket) {
            try {
                const storedBucket = localStorage.getItem('s3_bucket_name');
                if (storedBucket) {
                    console.log('Using bucket from localStorage:', storedBucket);
                    setBucket = storedBucket;
                }
            } catch (e) {
                console.warn('Error reading from localStorage:', e);
            }
        }
        
        // Only use hardcoded value as last resort
        if (!setBucket) {
            console.warn('WARNING: No bucket found in any configuration source, using hardcoded fallback');
            setBucket = HARDCODED_BUCKET;
        }
        
        // Add persistent storage of the bucket name in localStorage
        if (setBucket) {
            try {
                localStorage.setItem('s3_bucket_name', setBucket);
                console.log('Stored bucket name in localStorage:', setBucket);
            } catch (e) {
                console.warn('Could not store bucket name in localStorage:', e);
            }
        }
        
        const setScope = (props) ? props.scope : 'public';
        console.log('Final bucket setting:', setBucket);

        // Store bucket and scope for use in storage operations
        this.bucket = setBucket;
        this.scope = setScope;
        
        // Same approach for region - prioritize most reliable sources first
        this.region = 
            // First try props
            props?.region || 
            // Then Amplify config (most reliable)
            amplifyConfig?.Storage?.S3?.region || 
            // Then authdata
            window.authdata?.Auth?.region || 
            // Then localStorage
            localStorage.getItem('s3_region') || 
            // Fallback region
            HARDCODED_REGION; 
                     
        // Store region in localStorage for persistence
        try {
            localStorage.setItem('s3_region', this.region);
        } catch (e) {
            console.warn('Could not store region in localStorage:', e);
        }
                     
        this.identityPoolId = window.authdata?.Auth?.identityPoolId;
        
        console.log('Storage service initialized with bucket:', this.bucket, 
                    'region:', this.region, 
                    'identityPoolId:', this.identityPoolId);
        
        // IMPORTANT: Try to ensure Amplify configuration matches what we're using
        this.syncAmplifyConfig();
    }
    
    /**
     * Attempt to synchronize this instance's bucket and region with Amplify's config
     * to ensure consistency and prevent NoBucket errors
     */
    syncAmplifyConfig() {
        try {
            if (window.Amplify && typeof window.Amplify.getConfig === 'function' && this.bucket) {
                const currentConfig = window.Amplify.getConfig();
                
                // If bucket is missing or different in Amplify config, try to update it
                if (!currentConfig?.Storage?.S3?.bucket || 
                    currentConfig.Storage.S3.bucket !== this.bucket) {
                    
                    console.log('Synchronizing Amplify config to use bucket:', this.bucket);
                    
                    // Configure just the Storage part to avoid affecting other settings
                    window.Amplify.configure({
                        Storage: {
                            S3: {
                                bucket: this.bucket,
                                region: this.region
                            }
                        }
                    });
                    
                    // Verify the sync worked
                    const updatedConfig = window.Amplify.getConfig();
                    console.log('After sync, Amplify Storage bucket:', 
                        updatedConfig?.Storage?.S3?.bucket || 'still undefined');
                }
            }
        } catch (e) {
            console.error('Error synchronizing Amplify config:', e);
        }
    }

    /**
     * Common storage options used across methods
     * Ensures bucket is set and Amplify config is synchronized
     */
    getStorageOptions(level = this.scope) {
        // Double check bucket is set with multiple fallbacks
        if (!this.bucket) {
            console.error('ERROR: Bucket is undefined in getStorageOptions!');
            
            // First check current Amplify config
            try {
                if (window.Amplify && typeof window.Amplify.getConfig === 'function') {
                    const config = window.Amplify.getConfig();
                    if (config?.Storage?.S3?.bucket) {
                        console.log('Recovered bucket from Amplify config:', config.Storage.S3.bucket);
                        this.bucket = config.Storage.S3.bucket;
                        this.region = config.Storage.S3.region || this.region;
                    }
                }
            } catch (e) {
                console.warn('Could not retrieve bucket from Amplify config:', e);
            }
            
            // Then try localStorage
            if (!this.bucket) {
                try {
                    const storedBucket = localStorage.getItem('s3_bucket_name');
                    if (storedBucket) {
                        console.log('Recovered bucket name from localStorage:', storedBucket);
                        this.bucket = storedBucket;
                    }
                } catch (e) {
                    console.warn('Could not retrieve bucket from localStorage:', e);
                }
            }
            
            // Check authdata
            if (!this.bucket && window.authdata?.Auth?.RootBucket) {
                console.log('Recovered bucket from authdata:', window.authdata.Auth.RootBucket);
                this.bucket = window.authdata.Auth.RootBucket;
            }
            
            // If still no bucket, use hardcoded fallback
            if (!this.bucket) {
                this.bucket = 'redaction-pipeline-bucket00';
                console.warn('Using hardcoded bucket fallback:', this.bucket);
            }
            
            // Try to resynchronize Amplify config with our recovered bucket
            this.syncAmplifyConfig();
        }
        
        // Ensure we have valid values
        const options = {
            S3: {
                bucket: this.bucket,
                region: this.region
            },
            identityPoolId: this.identityPoolId,
            level
        };
        
        console.log('Generated storage options with bucket:', this.bucket);
        return options;
    }

    async list(key) {
        try {
            const options = this.getStorageOptions();
            const result = await list({ path: key }, options);
            return result.items;
        } catch (error) {
            throw(error);
        }
    }

    async upload(file, prefix = "", progressUpdate) {
        console.log('Upload called with file:', file.name, 'prefix:', prefix);
        try {
            // First ensure Amplify is available
            ensureAmplifyAvailable();
            
            // Then verify Amplify is properly configured
            verifyAmplifyStorageConfig();
            
            // Double check bucket is set and sync with Amplify config before proceeding
            if (!this.bucket) {
                console.error('ERROR: Bucket is undefined in upload method!');
                
                // Try to recover from multiple sources in preferred order
                const amplifyConfig = window.Amplify?.getConfig?.();
                const configBucket = amplifyConfig?.Storage?.S3?.bucket;
                const storedBucket = localStorage.getItem('s3_bucket_name');
                const authdataBucket = window.authdata?.Auth?.RootBucket;
                
                console.log('Potential bucket sources:', {
                    amplifyConfig: configBucket, // Most reliable source
                    localStorage: storedBucket,
                    authdata: authdataBucket
                });
                
                // Use first available source
                this.bucket = configBucket || storedBucket || authdataBucket || 'redaction-pipeline-bucket00';
                console.warn('Attempting with recovered/fallback bucket:', this.bucket);
                
                // Make sure Amplify config is synced with our bucket
                this.syncAmplifyConfig();
            } else {
                // Even if bucket is set, make sure it's synced with Amplify config
                this.syncAmplifyConfig();
            }
            
            const options = this.getStorageOptions();
            if (!options.S3.bucket) {
                throw new Error('No bucket available for upload after recovery attempts');
            }
            
            console.log('Upload with bucket:', options.S3.bucket);
            
            const key = `${prefix}${file.name}`;
            console.log('Upload key:', key);
            
            try {
                // Use uploadData function with proper bucket verification
                const result = await uploadData({
                    key,
                    data: file,
                    options: {
                        contentType: file.type,
                        onProgress: (progress) => {
                            if (progress && progress.total) {
                                const total = (progress.loaded / progress.total) * 100;
                                if (progressUpdate) {
                                    progressUpdate({ filename: file.name, progressValue: Math.trunc(total) });
                                }
                            }
                        }
                    }
                }, options);
                
                console.log('Upload successful');
                return result;
            } catch (uploadError) {
                if (uploadError.name === 'NoBucket') {
                    console.error('NoBucket error - attempting emergency recovery');
                    
                    // Ensure Amplify is available and properly configured
                    ensureAmplifyAvailable();
                    
                    // Special handling for NoBucket errors - try one last time with direct config
                    const emergencyOptions = {
                        S3: {
                            bucket: this.bucket,
                            region: this.region
                        },
                        level: this.scope
                    };
                    
                    // Force Amplify reconfiguration
                    if (window.Amplify && typeof window.Amplify.configure === 'function') {
                        window.Amplify.configure({
                            Storage: emergencyOptions.S3
                        });
                    }
                    
                    console.log('Emergency retry with explicit bucket:', this.bucket);
                    
                    // Try again with emergency options
                    const retryResult = await uploadData({
                        key,
                        data: file,
                        options: {
                            contentType: file.type
                        }
                    }, emergencyOptions);
                    
                    console.log('Emergency retry successful');
                    return retryResult;
                }
                
                throw(uploadError);
            }
        } catch (error) {
            console.error('Error in upload method:', error);
            throw(error);
        }
    }

    async uploadFile(file, prefix = "", progressUpdate) {
        console.log('uploadFile called with prefix:', prefix);
        try {
            // First ensure Amplify is available
            ensureAmplifyAvailable();
            
            // Then verify Amplify is properly configured
            verifyAmplifyStorageConfig();
            
            // Make sure our bucket is synced with Amplify config
            this.syncAmplifyConfig();
            
            const options = this.getStorageOptions();
            console.log('uploadFile options with bucket:', options.S3.bucket);
            
            try {
                const result = await uploadData({
                    key: prefix,
                    data: file,
                    options: {
                        contentType: file.type,
                        onProgress: (progress) => {
                            if (progress && progress.total) {
                                const total = (progress.loaded / progress.total) * 100;
                                if (progressUpdate) progressUpdate(Math.trunc(total));
                            }
                        }
                    }
                }, options);
                
                console.log('uploadFile successful');
                return result;
            } catch (uploadError) {
                if (uploadError.name === 'NoBucket') {
                    console.error('NoBucket error in uploadFile - attempting emergency recovery');
                    
                    // Ensure Amplify is available and properly configured
                    ensureAmplifyAvailable();
                    
                    // Emergency fix for NoBucket - reconfigure Amplify directly
                    if (window.Amplify && typeof window.Amplify.configure === 'function') {
                        window.Amplify.configure({
                            Storage: {
                                S3: {
                                    bucket: this.bucket,
                                    region: this.region
                                }
                            }
                        });
                    }
                    
                    // Retry with direct options
                    const emergencyOptions = {
                        S3: {
                            bucket: this.bucket,
                            region: this.region
                        },
                        level: this.scope
                    };
                    
                    console.log('Emergency retry with explicit bucket:', this.bucket);
                    
                    // Try again with emergency options
                    const retryResult = await uploadData({
                        key: prefix,
                        data: file,
                        options: {
                            contentType: file.type
                        }
                    }, emergencyOptions);
                    
                    console.log('Emergency retry successful');
                    return retryResult;
                }
                
                throw(uploadError);
            }
        } catch (error) {
            console.error('Error in uploadFile method:', error);
            throw(error);
        }
    }

    async writeFile(text, filename = "data.txt") {
        console.log('writeFile called with filename:', filename);
        try {
            // First ensure Amplify is available
            ensureAmplifyAvailable();
            
            // Then verify Amplify is properly configured
            verifyAmplifyStorageConfig();
            
            // Make sure our bucket is synced with Amplify config
            this.syncAmplifyConfig();
            
            const options = this.getStorageOptions();
            console.log('writeFile options with bucket:', options.S3.bucket);
            
            try {
                const result = await uploadData({
                    key: filename,
                    data: text,
                    options: {
                        contentType: 'text/plain'
                    }
                }, options);
                
                console.log('writeFile successful for:', filename);
                return result;
            } catch (uploadError) {
                if (uploadError.name === 'NoBucket') {
                    console.error('NoBucket error in writeFile - attempting emergency recovery');
                    
                    // Ensure Amplify is available and properly configured
                    ensureAmplifyAvailable();
                    
                    // Emergency fix for NoBucket - reconfigure Amplify directly
                    if (window.Amplify && typeof window.Amplify.configure === 'function') {
                        window.Amplify.configure({
                            Storage: {
                                S3: {
                                    bucket: this.bucket,
                                    region: this.region
                                }
                            }
                        });
                    }
                    
                    // Retry with direct options
                    const emergencyOptions = {
                        S3: {
                            bucket: this.bucket,
                            region: this.region
                        },
                        level: this.scope
                    };
                    
                    console.log('Emergency retry with explicit bucket:', this.bucket);
                    
                    // Try again with emergency options
                    const retryResult = await uploadData({
                        key: filename,
                        data: text,
                        options: {
                            contentType: 'text/plain'
                        }
                    }, emergencyOptions);
                    
                    console.log('Emergency retry successful');
                    return retryResult;
                }
                throw(uploadError);
            }
        } catch (error) {
            console.error('Error in writeFile method:', error);
            throw(error);
        }
    }

    /**
     * 
     * @param {*} srcPrefix 
     * @param {*} destPrefix      
     * Given a list of source and destination prefixes, copies all files from
     * srcPrefix to destPrefix within /Public access level. This action is not
     * cancellable since cancelling may cause unintented / partial contents to
     * be published.
     * WARNING!!! This is specifically built for vision and blog articles to 
     * support "Save as Draft" and "Publish" functionality. Copies all assets
     * from drafts/ prefix to published content prefix at the root
     */
    async copyAll(srcPrefix, destPrefix) {
        let sourceFiles;
        try {
            const options = this.getStorageOptions('public');
            sourceFiles = await list({ path: srcPrefix }, options);
            
            if (sourceFiles.items.length > 0) {
                for (const file of sourceFiles.items) {
                    if (!file.key.includes('manifest.json')) {
                        const filename = file.key.split('\\').pop().split('/').pop(); //get file object name out of the full prefix key
                        await copy({ 
                            key: file.key, 
                            targetKey: `${destPrefix}/${filename}`,
                            options: { level: 'public' }
                        }, options);
                    }
                }
            }
        } catch (error) {
            throw error;
        }
    }

    async readFile(key) {
        try {
            const options = this.getStorageOptions();
            
            // Get the signed URL
            const signedURL = await getUrl({
                key,
                options: {
                    expiresIn: 20000,
                    cacheControl: 'no-cache',
                    contentType: 'text/plain'
                }
            }, options);
            
            // Fetch the content
            const response = await fetch(signedURL.url.toString());
            const text = await response.text();
            return text;
        } catch (error) {
            return "";
        }
    }

    async genSignedURL(key, download) {
        try {
            const options = this.getStorageOptions();
            
            // Check if file exists
            const files = await list({ path: key }, options);
            
            if (files.items.length > 0) {
                // Get signed URL
                const result = await getUrl({
                    key,
                    options: {
                        expiresIn: 7200,
                        cacheControl: 'no-cache',
                        download
                    }
                }, options);
                
                // Get content type
                const properties = await getProperties({ key }, options);
                
                return {
                    url: result.url.toString(),
                    contentType: properties.contentType
                };
            } else {
                return undefined;
            }
        } catch (error) {
            throw error;
        }
    }

    async delete(filename, prefix = "") {
        try {
            const options = this.getStorageOptions();
            const key = `${prefix}${filename}`;
            
            const result = await remove({ key }, options);
            return result;
        } catch (error) {
            throw(error);
        }
    }

    // Note: cancel operation is not directly supported in Amplify v6
    // This method is kept for backward compatibility but won't have the same effect
    cancel(promise) {
        console.warn('Storage.cancel is not supported in Amplify v6');
    }
}
