import { Check } from "lucide-react";

/**
 * WhatsApp-style delivery ticks: orange = customer done, blue = worker done.
 */
export default function CompletionTicks({
  customerMarkedDone = false,
  workerMarkedDone = false,
  size = 18,
  className = "",
}) {
  const show =
    customerMarkedDone ||
    workerMarkedDone ||
    className.includes("always");
  if (!show) return null;

  return (
    <div
      className={`inline-flex items-center ${className}`}
      title={
        customerMarkedDone && workerMarkedDone
          ? "Customer and worker both marked done"
          : customerMarkedDone
            ? "Customer marked done"
            : workerMarkedDone
              ? "Worker marked done"
              : "Completion status"
      }
      aria-label="Job completion confirmations"
    >
      <Check
        size={size}
        strokeWidth={2.75}
        className={
          customerMarkedDone
            ? "text-orange-500"
            : "text-slate-300"
        }
      />
      <Check
        size={size}
        strokeWidth={2.75}
        className={`-ml-2 ${workerMarkedDone ? "text-blue-500" : "text-slate-300"}`}
      />
    </div>
  );
}
