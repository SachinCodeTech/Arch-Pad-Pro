interface ToastProps {
  message: string | null;
  status: 'success' | 'info' | null;
}

export default function Toast({ message, status }: ToastProps) {
  if (!message) return null;

  return (
    <div
      id="toast"
      className={`fixed bottom-[90px] left-1/2 -translate-x-1/2 p-[7px_16px] rounded-[20px] font-mono text-[10px] tracking-[0.5px] z-[9000] transition-all duration-250 whitespace-nowrap shadow-md translate-y-0 opacity-100 ${
        status === 'success'
          ? 'bg-[var(--bg2)] border border-green-500/40 text-[#2ecc71] green'
          : 'bg-[var(--bg2)] border border-[var(--border2)] text-[var(--text)]'
      }`}
    >
      {message}
    </div>
  );
}
