import React from 'react';

interface MobileyeLogoIconProps extends React.SVGProps<SVGSVGElement> {
  className?: string;
}

const MobileyeLogoIcon: React.FC<MobileyeLogoIconProps> = ({ className, ...props }) => {
  return (
    <svg 
      version="1.1" 
      xmlns="http://www.w3.org/2000/svg" 
      xmlnsXlink="http://www.w3.org/1999/xlink" 
      x="0px" 
      y="0px"
      viewBox="0 0 166 86" 
      xmlSpace="preserve"
      className={className}
      {...props}
    >
      <g id="Layer_1">
        <g>
          <g>
            <path fill="currentColor" d="M99.28,1.4c-0.08,0-0.16,0-0.24,0v0H58.69L30.14,29.26h12.02h0.02c7.16,0.04,10.89,4.82,10.89,12.3V84.6h28.67l0-55.34h11.9c0.02,0,0.04,0,0.06,0c0.02,0,0.04,0,0.06,0h0.02c7.16,0.04,10.9,4.82,10.9,12.3V84.6h28.67V34.32C133.35,14.19,122.05,1.4,99.28,1.4"/>
          </g>
          <polygon fill="currentColor" points="1.47,57.22 1.47,84.6 30.14,84.6 30.14,29.25 "/>
          <rect fill="currentColor" x="1.47" y="1.4" width="28.67" height="27.85"/>
          <path fill="currentColor" d="M164.53,84.6h-1.58v-7.57l-2.7,5.08h-1.37l-2.73-5.15v7.64h-1.58v-9.14H157l2.59,4.83l2.52-4.83h2.42V84.6z M145.16,75.45h8.27v1.51h-3.36v7.64h-1.58v-7.64h-3.33V75.45z"/>
        </g>
      </g>
      {/* <g id="DESIGN"></g> */}
    </svg>
  );
};

export default MobileyeLogoIcon; 