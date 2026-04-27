export default function Logo({ size = 52 }: { size?: number }) {
  return (
    <img
      src="/logo.png"
      alt="DPPForge"
      loading="eager"
      style={{
        height: size,
        width: 'auto',
        objectFit: 'contain',
        display: 'block',
      }}
    />
  )
}