import SupportMessenger from "../Components/SupportMessenger.jsx";

export default function SupportMessages() {
  return (
    <div className="p-4 sm:p-6">
      <div className="mb-5"><h1 className="text-2xl font-bold text-slate-900">Support Messages</h1><p className="mt-1 text-sm text-slate-500">Chat directly with customers and workers.</p></div>
      <SupportMessenger />
    </div>
  );
}
