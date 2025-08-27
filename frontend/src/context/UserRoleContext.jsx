import React, { createContext, useState, useContext, useEffect } from 'react';
import { fetchAuthSession, getCurrentUser } from '@aws-amplify/auth';

// Create context with default values
const UserRoleContext = createContext({
  userRole: 'customer',
  isAdmin: false,
  setUserRole: () => {},
});

/**
 * UserRoleProvider component that wraps the application and provides
 * consistent role information to all components
 */
export function UserRoleProvider({ children, initialRole = null }) {
  // Default to 'customer' role (least privilege)
  const [userRole, setUserRoleState] = useState(initialRole || 'customer');
  
  // Derive isAdmin from the current role
  const isAdmin = userRole === 'admin';
  
  // Function to set the role with proper validation
  const setUserRole = (role) => {
    if (!role || (role !== 'admin' && role !== 'customer')) {
      console.warn('Invalid role specified:', role);
      return;
    }
    
    console.log('Setting user role to:', role);
    
    // Clear any previously stored role in localStorage to avoid confusion
    try {
      localStorage.removeItem('userRole');
    } catch (e) {
      console.warn('Could not clear localStorage:', e);
    }
    
    setUserRoleState(role);
  };
  
  // When the component mounts, try to fetch the user's role from Cognito
  useEffect(() => {
    async function fetchUserRole() {
      // Create a variable outside try/catch so it's available in both blocks
      let cognitoRole = initialRole || 'customer';
      
      try {
        console.log('UserRoleContext: Fetching role from Cognito...');
        
        // Check for authentication session first
        const session = await fetchAuthSession();
        
        if (!session?.tokens?.idToken) {
          console.warn('No ID token found, using default customer role');
          setUserRole('customer');
          return;
        }
        
        console.log('UserRoleContext: Auth session available, getting user');
        
        // Get the current authenticated user
        const user = await getCurrentUser();
        console.log('UserRoleContext: Got current user:', user);
        
        // Try to get role from Cognito user attributes
        const userAttributes = user.attributes || {};
        console.log('UserRoleContext: User attributes:', userAttributes);
        
        // Check token payload for additional claims
        const idToken = session.tokens.idToken;
        const tokenPayload = idToken?.payload || {};
        console.log('UserRoleContext: Token payload:', tokenPayload);
        
        // Try to extract role from various sources
        
        // 1. Check custom role attribute
        if (userAttributes['custom:role']) {
          cognitoRole = userAttributes['custom:role'];
          console.log('UserRoleContext: Found role in custom attributes:', cognitoRole);
        }
        
        // 2. Check for admin group in groups claim
        if (tokenPayload['cognito:groups']) {
          const groups = Array.isArray(tokenPayload['cognito:groups']) 
            ? tokenPayload['cognito:groups'] 
            : [tokenPayload['cognito:groups']];
            
          console.log('UserRoleContext: User groups from token:', groups);
          
          if (groups.includes('admin')) {
            cognitoRole = 'admin';
            console.log('UserRoleContext: User is in admin group, setting admin role');
          }
        }
        
        // 3. Check username for admin indicators (development fallback)
        const username = user.username || '';
        if (username.toLowerCase().includes('admin')) {
          console.log('UserRoleContext: Admin detected in username');
          cognitoRole = 'admin';
        }
        
        // 4. Check email for admin indicators (development fallback)
        const email = userAttributes.email || '';
        if (email.toLowerCase().includes('admin')) {
          console.log('UserRoleContext: Admin detected in email');
          cognitoRole = 'admin';
        }
        
        // 5. Check if we're on an admin URL (for development testing)
        if (window.location.href.includes('admin=true')) {
          console.log('UserRoleContext: Admin URL parameter detected');
          cognitoRole = 'admin';
        }
        
        // Log the determined role and update state
        console.log('UserRoleContext: Final determined role:', cognitoRole);
        setUserRole(cognitoRole);
        
      } catch (error) {
        console.error('UserRoleContext: Error fetching user role:', error);
        console.log('UserRoleContext: Falling back to default role:', cognitoRole);
        setUserRole(cognitoRole);
      }
    }
    
    fetchUserRole();
    
    // Add debugging function to the window for console use
    window._debugUserRole = {
      getCurrentRole: () => ({ userRole, isAdmin }),
      checkCognitoRole: fetchUserRole,
      forceRole: (role) => {
        if (role === 'admin' || role === 'customer') {
          setUserRole(role);
          console.log(`Role manually set to: ${role}`);
          return `Role now set to: ${role}`;
        } else {
          return 'Invalid role. Use "admin" or "customer"';
        }
      }
    };
    
  }, [initialRole]);
  
  // Context value object
  const contextValue = {
    userRole,
    isAdmin,
    setUserRole,
  };
  
  return (
    <UserRoleContext.Provider value={contextValue}>
      {children}
    </UserRoleContext.Provider>
  );
}

/**
 * Hook to use the user role context in any component
 */
export function useUserRole() {
  const context = useContext(UserRoleContext);
  
  if (!context) {
    throw new Error('useUserRole must be used within a UserRoleProvider');
  }
  
  return context;
}

export default UserRoleContext;
