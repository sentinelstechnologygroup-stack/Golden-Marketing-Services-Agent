import DesktopInstallButton from '@/components/DesktopInstallButton';
import React from "react";
import { ShieldCheck } from "lucide-react";
import BrandMark from "@/components/BrandMark";

const TRUST_FEATURES = ["Protected agent workspace", "Tenant-separated customer information", "Role-based permissions", "Accountable qualification and handoff"];

export default function AuthLayout({ title, subtitle, footer, children }) {
  return (
    <div className="min-h-screen flex flex-col lg:flex-row" style={{ background: "var(--offwhite)" }}>
      <section className="lg:w-[42%] xl:w-[40%] text-white flex flex-col p-7 sm:p-10 lg:p-12 relative overflow-hidden" style={{ background: "var(--shell)" }}>
        <div className="absolute top-0 left-0 right-0 h-px" style={{ background: "linear-gradient(90deg, var(--gold), transparent)" }} />
        <BrandMark className="[&_img]:w-[264px]" />
        <div className="mt-auto lg:my-auto pt-12 lg:pt-0">
          <h2 className="font-heading text-[34px] sm:text-[42px] leading-[1.05] font-semibold tracking-tight">Welcome back.</h2>
          <p className="mt-4 text-[15px] max-w-md leading-relaxed" style={{ color: "#BFD0CE" }}>Manage every lead from first response through qualification, appointment setting, live transfer, and final outcome — all in one protected workspace.</p>
          <ul className="mt-9 space-y-3 max-w-md">
            {TRUST_FEATURES.map((feature) => <li key={feature} className="flex items-start gap-3 text-[13.5px]" style={{ color: "#D9E6E3" }}><ShieldCheck className="w-[18px] h-[18px] mt-0.5 shrink-0" style={{ color: "var(--gold)" }} /><span>{feature}</span></li>)}
          </ul>
        </div>
        <p className="mt-10 lg:mt-12 text-[11.5px]" style={{ color: "#7FA09D" }}>© {new Date().getFullYear()} Golden Marketing Services. All rights reserved.</p>
      </section>
      <section className="flex-1 flex items-center justify-center p-6 sm:p-10">
        <div className="w-full max-w-[400px]">
          <p className="text-[10px] uppercase tracking-[.2em] mb-2" style={{ color: "var(--teal)" }}>Agent Portal</p>
          <h1 className="font-heading text-[26px] font-semibold leading-tight" style={{ color: "var(--shell)" }}>{title}</h1>
          {subtitle && <p className="mt-2 text-[13.5px]" style={{ color: "var(--muted-ink)" }}>{subtitle}</p>}
<div className="my-4"><DesktopInstallButton /></div>
          <div className="mt-7">{children}</div>
          {footer && <div className="mt-6 pt-6 border-t text-[12px]" style={{ borderColor: "var(--line)", color: "var(--muted-ink)" }}>{footer}</div>}
          <p className="mt-7 text-[11.5px] leading-5" style={{ color: "var(--muted-ink)" }}>Authorized personnel only. Access attempts and workspace activity may be logged for security and quality assurance.</p>
        </div>
      </section>
    </div>
  );
}

