export default function AdminLogo({ size = "md", className = "" }) {
  const sizes = {
    sm: "h-10 w-10",
    md: "h-14 w-14",
    lg: "h-20 w-20",
    xl: "h-24 w-24",
  };

  return (
    <img
      src="/Assets/Logo.png"
      alt="Fix It Now"
      className={`${sizes[size] || sizes.md} object-contain ${className}`}
    />
  );
}
