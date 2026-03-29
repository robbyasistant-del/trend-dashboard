export default function ComingSoon({ title, icon, description }: { title: string; icon: string; description: string }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh]">
      <div className="text-6xl mb-6">{icon}</div>
      <h1 className="text-2xl font-bold text-white mb-2">{title}</h1>
      <p className="text-slate-500 text-center max-w-md mb-8">{description}</p>
      <div className="flex items-center gap-2 text-xs text-slate-600 bg-dark-800 px-4 py-2 rounded-full">
        <span className="w-2 h-2 rounded-full bg-neon-amber pulse-neon" />
        Coming Soon — Data collection agents being configured
      </div>
    </div>
  );
}
