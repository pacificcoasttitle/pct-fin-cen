"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger, SheetClose } from "@/components/ui/sheet";
import { Menu } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { BRAND } from "@/lib/brand";

export function Header() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const navLinks = [
    { href: "#features", label: "Features" },
    { href: "#pricing", label: "Pricing" },
    { href: "#security", label: "Security" },
    { href: "#about", label: "About" },
  ];

  // Handle smooth scroll for anchor links
  const handleAnchorClick = useCallback((e: React.MouseEvent<HTMLAnchorElement>, href: string) => {
    if (href.startsWith("#")) {
      e.preventDefault();
      const targetId = href.slice(1);
      const targetElement = document.getElementById(targetId);
      if (targetElement) {
        targetElement.scrollIntoView({ behavior: "smooth" });
        // Update URL without triggering navigation
        window.history.pushState(null, "", href);
      }
      // Close mobile menu if open
      setMobileMenuOpen(false);
    }
  }, []);

  return (
    <>
      {/* Top announcement bar */}
      <div className="fixed top-0 left-0 right-0 z-50 bg-slate-900 text-slate-300 text-xs py-1.5 text-center border-b border-slate-800">
        <span>Support: </span>
        <a href="mailto:clear@fincenclear.com" className="text-teal-400 hover:text-teal-300 font-medium">
          clear@fincenclear.com
        </a>
        <span className="mx-2 hidden sm:inline">•</span>
        <span className="hidden sm:inline">FinCEN compliance deadline: March 1, 2026</span>
      </div>
      <header
      className={`fixed top-7 left-0 right-0 z-40 transition-all duration-300 ${
        isScrolled
          ? "bg-card/95 backdrop-blur-md shadow-sm border-b border-border"
          : "bg-transparent"
      }`}
    >
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 lg:h-20">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-3">
            <Image 
              src={BRAND.logo}
              alt={BRAND.name}
              width={140}
              height={40}
              className="h-8 w-auto hidden sm:block"
              priority
            />
            <Image 
              src={BRAND.logoIcon}
              alt={BRAND.name}
              width={40}
              height={40}
              className="h-9 w-9 sm:hidden"
              priority
            />
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden lg:flex items-center gap-8">
            {navLinks.map((link) => (
              <a
                key={link.href}
                href={link.href}
                onClick={(e) => handleAnchorClick(e, link.href)}
                className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
              >
                {link.label}
              </a>
            ))}
          </nav>

          {/* Desktop CTAs */}
          <div className="hidden lg:flex items-center gap-4">
            <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground" asChild>
              <Link href="/login">Login</Link>
            </Button>
            <Button size="sm" className="bg-teal-500 hover:bg-teal-600 text-white font-semibold shadow-md shadow-teal-500/20" asChild>
              <a href="mailto:clear@fincenclear.com">Contact Us</a>
            </Button>
          </div>

          {/* Mobile Menu */}
          <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
            <SheetTrigger asChild className="lg:hidden">
              <Button variant="ghost" size="icon">
                <Menu className="h-6 w-6" />
                <span className="sr-only">Open menu</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-[300px] bg-card">
              <nav className="flex flex-col gap-4 mt-8">
                {navLinks.map((link) => (
                  <a
                    key={link.href}
                    href={link.href}
                    onClick={(e) => handleAnchorClick(e, link.href)}
                    className="text-lg font-medium text-foreground hover:text-primary transition-colors py-2 cursor-pointer"
                  >
                    {link.label}
                  </a>
                ))}
                <hr className="my-4 border-border" />
                <Button variant="outline" className="w-full bg-transparent" asChild>
                  <Link href="/login">Login</Link>
                </Button>
                <Button className="w-full bg-teal-500 hover:bg-teal-600 text-white font-semibold" asChild>
                  <a href="mailto:clear@fincenclear.com">Contact Us</a>
                </Button>
              </nav>
            </SheetContent>
          </Sheet>
        </div>
      </div>
      </header>
    </>
  );
}
