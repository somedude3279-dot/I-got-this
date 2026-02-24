
import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  fullWidth?: boolean;
}

const Button: React.FC<ButtonProps> = ({ 
  children, 
  variant = 'primary', 
  fullWidth = false, 
  className = '', 
  ...props 
}) => {
  const baseStyles = "duo-button rounded-2xl px-6 py-3 font-extrabold uppercase tracking-wide transition-all duration-100 flex items-center justify-center gap-2 text-sm md:text-base";
  
  const variants = {
    primary: "bg-[#1cb0f6] text-white border-b-4 border-[#1899d6] hover:bg-[#20bdff]",
    secondary: "bg-[#78c2ff] text-white border-b-4 border-[#5ca8e6] hover:bg-[#8fd0ff]",
    danger: "bg-[#ff4b4b] text-white border-b-4 border-[#d33131] hover:bg-[#ff5a5a]",
    ghost: "bg-white text-[#afafaf] border-2 border-[#e5e5e5] hover:bg-[#f7f7f7]"
  };

  return (
    <button 
      className={`${baseStyles} ${variants[variant]} ${fullWidth ? 'w-full' : ''} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
};

export default Button;
