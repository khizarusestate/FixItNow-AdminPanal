import { useEffect, useState } from "react";
import { runAdminBootstrap } from "../utils/adminBootstrap";
import AdminLogo from "./shared/AdminLogo";

export default function AdminBootstrapGate({ children }) {
  const [ready, setReady] = useState(false);
  const [step, setStep] = useState("Getting things ready…");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      await runAdminBootstrap(setStep);
      if (!cancelled) setReady(true);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (!ready) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-slate-50 to-orange-50/40">
        <div className="text-center px-6 max-w-sm w-full">
          <AdminLogo size="md" className="mx-auto mb-6 opacity-90" />
          <h2 className="text-xl font-bold text-slate-900">Preparing admin panel</h2>
          <p className="mt-2 text-sm text-slate-500">{step}</p>
          <div className="mt-6 h-1.5 w-full overflow-hidden rounded-full bg-slate-200">
            <div className="admin-bootstrap-progress h-full rounded-full bg-gradient-to-r from-orange-400 to-orange-600" />
          </div>
        </div>
      </div>
    );
  }

  return children;
}
