import React from 'react';
import { UserProfile } from '../types';
import { ShieldCheck, LogOut, User as UserIcon, Sparkles } from 'lucide-react';

interface NavbarProps {
  user: UserProfile | null;
  onSignOut: () => void;
  onOpenSecurity: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ user, onSignOut, onOpenSecurity }) => {
  return (
    <header className="h-14 sm:h-16 px-4 sm:px-6 flex items-center justify-between bg-[#080A12]/90 backdrop-blur-md border-b border-[#272C3D] shrink-0 sticky top-0 z-40">
      {/* Brand Identity */}
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 bg-gradient-to-tr from-[#7C6CF2] to-[#947CFF] rounded-xl flex items-center justify-center text-white font-bold text-sm shadow-xs shadow-[#7C6CF2]/20">
          <Sparkles className="w-4 h-4 text-white" />
        </div>
        <div className="flex items-center gap-2.5">
          <div className="flex flex-col sm:flex-row sm:items-baseline sm:gap-2">
            <span className="text-base sm:text-lg font-bold tracking-tight text-[#F4F5F9] font-sans">
              REFLECTRA
            </span>
            <span className="text-[11px] text-[#9AA1B5] font-normal hidden md:inline">
              Reflect. Realize. Act.
            </span>
          </div>
          <span className="hidden sm:inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-[#171B29] text-[#9AA1B5] border border-[#272C3D]">
            AI Engine Active
          </span>
        </div>
      </div>

      {/* Right User & Security Controls */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Security & Threat Model Info */}
        <button
          id="security-specs-button"
          onClick={onOpenSecurity}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium text-[#9AA1B5] hover:text-[#F4F5F9] bg-[#171B29] hover:bg-[#171B29]/80 border border-[#272C3D] transition-all cursor-pointer"
          title="View Security Model & Firestore Isolation Rules"
        >
          <ShieldCheck className="w-4 h-4 text-[#67D9B0]" />
          <span className="hidden md:inline">Security Specs</span>
        </button>

        {user && (
          <div className="flex items-center gap-2.5 sm:gap-3 pl-2 sm:pl-3 border-l border-[#272C3D]">
            <div className="flex items-center gap-2.5">
              <div className="hidden sm:flex flex-col items-end">
                <span className="text-xs sm:text-sm font-semibold text-[#F4F5F9] leading-tight">
                  {user.displayName || 'Alex Rivera'}
                </span>
                <span className="text-[11px] text-[#6B7280]">
                  {user.email ? 'Google Account' : 'Pro Member'}
                </span>
              </div>

              <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-[#171B29] border border-[#272C3D] overflow-hidden flex items-center justify-center shrink-0">
                {user.photoURL ? (
                  <img
                    src={user.photoURL}
                    alt={user.displayName || 'User avatar'}
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="w-full h-full bg-gradient-to-tr from-[#7C6CF2] to-[#947CFF] flex items-center justify-center text-white">
                    <UserIcon className="w-4 h-4" />
                  </div>
                )}
              </div>
            </div>

            <button
              id="sign-out-button"
              onClick={onSignOut}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium text-[#9AA1B5] hover:text-rose-300 bg-[#171B29] hover:bg-rose-950/30 border border-[#272C3D] hover:border-rose-900/40 transition-all cursor-pointer"
              title="Sign out of your account"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Sign Out</span>
            </button>
          </div>
        )}
      </div>
    </header>
  );
};

