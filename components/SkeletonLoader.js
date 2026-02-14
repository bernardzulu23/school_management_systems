import React from 'react';

const SkeletonLoader = ({ 
  variant = 'text', 
  width = '100%', 
  height, 
  count = 1, 
  className = '' 
}) => {
  const baseClasses = 'animate-pulse bg-gray-200 dark:bg-gray-700 rounded';
  
  const variants = {
    text: 'h-4 w-full mb-2',
    title: 'h-6 w-3/4 mb-4',
    avatar: 'h-12 w-12 rounded-full',
    card: 'h-48 w-full rounded-xl',
    button: 'h-10 w-24 rounded-lg',
    rectangular: 'w-full'
  };

  const items = Array.from({ length: count });

  return (
    <>
      {items.map((_, index) => (
        <div
          key={index}
          className={`${baseClasses} ${variants[variant] || ''} ${className}`}
          style={{ 
            width: width, 
            height: height 
          }}
          role="status"
          aria-label="loading placeholder"
        >
          <span className="sr-only">Loading...</span>
        </div>
      ))}
    </>
  );
};

export default SkeletonLoader;
