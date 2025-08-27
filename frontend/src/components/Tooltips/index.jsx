import React, { useState, useEffect } from 'react';
import { View, Text, Link, Flex, Icon } from '@aws-amplify/ui-react';
import { FaInfoCircle } from 'react-icons/fa';

// Enhanced tooltip implementation with animations
const CustomTooltip = ({ content, children, position = 'top', width = '300px' }) => {
  const [isVisible, setIsVisible] = useState(false);
  const [style, setStyle] = useState({
    opacity: 0,
    transform: 'translateY(10px) scale(0.95)'
  });

  // Handle animation
  useEffect(() => {
    if (isVisible) {
      // Small delay to allow CSS transition to take effect
      setTimeout(() => {
        setStyle({
          opacity: 1,
          transform: 'translateY(0) scale(1)'
        });
      }, 20);
    } else {
      setStyle({
        opacity: 0,
        transform: 'translateY(10px) scale(0.95)'
      });
    }
  }, [isVisible]);

  // Calculate tooltip position
  const getTooltipPosition = () => {
    switch (position) {
      case 'top':
        return {
          bottom: 'calc(100% + 10px)',
          left: '50%',
          transform: `translateX(-50%) ${style.transform}`,
        };
      case 'right':
        return {
          left: 'calc(100% + 10px)',
          top: '50%',
          transform: `translateY(-50%) ${style.transform.replace('translateY', 'translateX')}`,
        };
      case 'bottom':
        return {
          top: 'calc(100% + 10px)',
          left: '50%',
          transform: `translateX(-50%) ${style.transform.replace('translateY', 'translateY')}`,
        };
      case 'left':
        return {
          right: 'calc(100% + 10px)',
          top: '50%',
          transform: `translateY(-50%) ${style.transform.replace('translateY', 'translateX')}`,
        };
      default:
        return {
          bottom: 'calc(100% + 10px)',
          left: '50%',
          transform: `translateX(-50%) ${style.transform}`,
        };
    }
  };

  // Calculate arrow position
  const getArrowStyles = () => {
    switch (position) {
      case 'top':
        return {
          bottom: '-6px',
          left: '50%',
          transform: 'translateX(-50%) rotate(180deg)',
          borderLeft: '6px solid transparent',
          borderRight: '6px solid transparent',
          borderTop: '6px solid var(--dark-bg-lighter)'
        };
      case 'right':
        return {
          left: '-6px',
          top: '50%',
          transform: 'translateY(-50%) rotate(90deg)',
          borderTop: '6px solid var(--dark-bg-lighter)',
          borderLeft: '6px solid transparent',
          borderRight: '6px solid transparent'
        };
      case 'bottom':
        return {
          top: '-6px',
          left: '50%',
          transform: 'translateX(-50%)',
          borderLeft: '6px solid transparent',
          borderRight: '6px solid transparent',
          borderBottom: '6px solid var(--dark-bg-lighter)'
        };
      case 'left':
        return {
          right: '-6px',
          top: '50%',
          transform: 'translateY(-50%) rotate(-90deg)',
          borderTop: '6px solid var(--dark-bg-lighter)',
          borderLeft: '6px solid transparent',
          borderRight: '6px solid transparent'
        };
      default:
        return {
          bottom: '-6px',
          left: '50%',
          transform: 'translateX(-50%) rotate(180deg)',
          borderLeft: '6px solid transparent',
          borderRight: '6px solid transparent',
          borderTop: '6px solid var(--dark-bg-lighter)'
        };
    }
  };

  return (
    <View position="relative" display="inline-block">
      <View
        onMouseEnter={() => setIsVisible(true)}
        onMouseLeave={() => setIsVisible(false)}
        style={{ cursor: 'help' }}
      >
        {children}
      </View>
      
      {isVisible && (
        <View
          position="absolute"
          background="linear-gradient(135deg, var(--dark-bg), var(--dark-bg-lighter))"
          color="var(--text-light)"
          padding="12px 16px"
          borderRadius="var(--border-radius)"
          boxShadow="var(--box-shadow)"
          zIndex="1000"
          maxWidth={width}
          fontSize="14px"
          opacity={style.opacity}
          style={{
            ...getTooltipPosition(),
            transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
            backdropFilter: 'blur(10px)',
            border: '1px solid rgba(255, 255, 255, 0.1)'
          }}
        >
          {/* Tooltip arrow */}
          <View
            width="0"
            height="0"
            position="absolute"
            style={getArrowStyles()}
          />
          {content}
        </View>
      )}
    </View>
  );
};

const linkStyle = { 
  color: 'var(--secondary-color)', 
  marginLeft: '2px', 
  textDecoration: 'underline',
  transition: 'opacity 0.2s ease',
  ':hover': {
    opacity: 0.8
  }
};

export const ClassifierTooltip = (
  <CustomTooltip content={
    <Flex direction="column" gap="8px">
      <Text color="var(--text-light)" fontWeight="500">
        Amazon Comprehend Classifier
      </Text>
      <Text color="var(--text-light)" fontSize="13px" lineHeight="1.5">
        Amazon Comprehend classifier ARN to classify input documents into predefined categories.
      </Text>
      <Link
        href="https://docs.aws.amazon.com/comprehend/latest/dg/how-document-classification.html"
        isExternal={true}
        color="var(--secondary-color)"
        style={linkStyle}
        fontSize="13px"
      >
        Learn more about document classification
      </Link>
    </Flex>
  }>
    <Flex 
      alignItems="center" 
      justifyContent="center"
      width="22px" 
      height="22px" 
      borderRadius="50%"
      backgroundColor="rgba(0, 210, 255, 0.15)"
      color="var(--secondary-color)"
    >
      <FaInfoCircle size={12} />
    </Flex>
  </CustomTooltip>
);

export const ErTooltip = (
  <CustomTooltip content={
    <Flex direction="column" gap="8px">
      <Text color="var(--text-light)" fontWeight="500">
        Entity Recognition
      </Text>
      <Text color="var(--text-light)" fontSize="13px" lineHeight="1.5">
        Use an Amazon Comprehend custom entity recognizer ARN to extract domain-specific entities from your documents.
      </Text>
      <Link
        href="https://docs.aws.amazon.com/comprehend/latest/dg/custom-entity-recognition.html"
        isExternal={true}
        color="var(--secondary-color)"
        style={linkStyle}
        fontSize="13px"
      >
        Learn more about custom entity recognition
      </Link>
    </Flex>
  }>
    <Flex 
      alignItems="center" 
      justifyContent="center"
      width="22px" 
      height="22px" 
      borderRadius="50%"
      backgroundColor="rgba(0, 210, 255, 0.15)"
      color="var(--secondary-color)"
    >
      <FaInfoCircle size={12} />
    </Flex>
  </CustomTooltip>
);

export const PiiTooltip = (
  <CustomTooltip 
    content={
      <Flex direction="column" gap="8px">
        <Text color="var(--text-light)" fontWeight="500">
          PII Detection Settings
        </Text>
        <Text color="var(--text-light)" fontSize="13px" lineHeight="1.5">
          Configure how Personal Identifiable Information (PII) should be detected and redacted in your documents.
        </Text>
        <Link
          href="https://docs.aws.amazon.com/comprehend/latest/dg/pii.html"
          isExternal={true}
          color="var(--secondary-color)"
          style={linkStyle}
          fontSize="13px"
        >
          Learn more about PII detection
        </Link>
      </Flex>
    }
    width="320px"
  >
    <Flex 
      alignItems="center" 
      justifyContent="center"
      width="22px" 
      height="22px" 
      borderRadius="50%"
      backgroundColor="rgba(0, 210, 255, 0.15)"
      color="var(--secondary-color)"
    >
      <FaInfoCircle size={12} />
    </Flex>
  </CustomTooltip>
);
