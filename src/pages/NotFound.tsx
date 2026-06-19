export default function NotFound() {
  return (
    <div className="h-full flex flex-col items-center justify-center mesh-bg text-center px-6">
      <div className="mesh-layer mesh-layer-1" />
      <div className="mesh-layer mesh-layer-2" />
      <div className="relative z-10">
        <p className="text-[#10B981] text-7xl font-heading font-bold">404</p>
        <h2 className="text-white text-xl font-heading font-bold mt-3">Page Not Found</h2>
        <p className="text-white/60 text-sm mt-2">This page no dey, oga! 😄</p>
        <button onClick={() => window.location.href = '/'}
          className="mt-6 px-6 py-3 rounded-xl text-white font-semibold text-sm"
          style={{ background: 'linear-gradient(135deg, #10B981, #059669)' }}>
          Go Home
        </button>
      </div>
    </div>
  );
}
