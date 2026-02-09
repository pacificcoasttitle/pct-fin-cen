"use client";

import Link from "next/link";
import Image from "next/image";
import { Shield } from "lucide-react";
import { BRAND } from "@/lib/brand";

export function Footer() {
  const productLinks = [
    { href: "#features", label: "Features" },
    { href: "#pricing", label: "Pricing" },
    { href: "#security", label: "Security" },
  ];

  const resourceLinks = [
    { href: "/#faq", label: "FAQ" },
    { href: "/help", label: "Help & Support" },
  ];

  const companyLinks = [
    { href: "#about", label: "About Us" },
    { href: "/contact", label: "Contact" },
    { href: "/privacy", label: "Privacy Policy" },
    { href: "/terms", label: "Terms of Service" },
  ];

  return (
    <footer className="bg-slate-900 text-white">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-12 lg:py-16">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 lg:gap-12">
          {/* Brand Column */}
          <div className="col-span-2 md:col-span-1">
            <Link href="/" className="block mb-4">
              <Image 
                src={BRAND.logoWhite}
                alt={BRAND.name}
                width={140}
                height={40}
                className="h-10 w-auto"
              />
            </Link>
            <p className="text-sm text-slate-400 mb-6">{BRAND.tagline}</p>
            {/* Support Email */}
            <div className="mt-4 pt-4 border-t border-slate-700">
              <p className="text-sm text-slate-400">
                Questions? Reach us at{" "}
                <a 
                  href="mailto:clear@fincenclear.com" 
                  className="text-teal-400 hover:text-teal-300 font-medium"
                >
                  clear@fincenclear.com
                </a>
              </p>
            </div>
          </div>

          {/* Product Column */}
          <div>
            <h4 className="font-semibold text-white mb-4">Product</h4>
            <ul className="space-y-3">
              {productLinks.map((link, index) => (
                <li key={index}>
                  <Link
                    href={link.href}
                    className="text-sm text-slate-400 hover:text-teal-400 transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Resources Column */}
          <div>
            <h4 className="font-semibold text-white mb-4">Resources</h4>
            <ul className="space-y-3">
              {resourceLinks.map((link, index) => (
                <li key={index}>
                  <Link
                    href={link.href}
                    className="text-sm text-slate-400 hover:text-teal-400 transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Company Column */}
          <div>
            <h4 className="font-semibold text-white mb-4">Company</h4>
            <ul className="space-y-3">
              {companyLinks.map((link, index) => (
                <li key={index}>
                  <Link
                    href={link.href}
                    className="text-sm text-slate-400 hover:text-teal-400 transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="mt-12 pt-8 border-t border-slate-800 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-sm text-slate-500">
            © 2026 {BRAND.legalName}. All rights reserved.
          </p>
          <div className="flex items-center gap-2 text-sm text-slate-500">
            <Shield className="h-4 w-4 text-teal-400" />
            <span>Enterprise Security • CCPA Compliant</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
