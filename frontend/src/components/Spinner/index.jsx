import React from 'react';
import { Loader, Flex } from '@aws-amplify/ui-react';

const Spinner = () => {
  return (
    <Flex 
      direction="column" 
      alignItems="center" 
      justifyContent="center" 
      marginTop="50px"
    >
      <Loader size="large" emptyColor="#f3f3f3" filledColor="#9E9E9E" />
    </Flex>
  );
}

export default Spinner;
