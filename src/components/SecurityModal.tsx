import React from 'react';
import { X, ShieldCheck, CheckCircle2 } from 'lucide-react';

interface SecurityModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SecurityModal: React.FC<SecurityModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md font-sans">
      <div className="bg-[#10131F] border border-[#272C3D] rounded-2xl max-w-3xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden text-[#F4F5F9]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-[#272C3D] flex items-center justify-between bg-[#171B29]/40">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-xl bg-[#67D9B0]/10 border border-[#67D9B0]/20 flex items-center justify-center text-[#67D9B0]">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-[#F4F5F9]">Security Architecture & Threat Model</h2>
              <p className="text-xs text-[#9AA1B5]">Strict OWASP and Firebase tenant-isolation safeguards</p>
            </div>
          </div>
          <button
            id="close-security-modal"
            onClick={onClose}
            className="p-1.5 rounded-xl text-[#9AA1B5] hover:text-[#F4F5F9] hover:bg-[#171B29] cursor-pointer transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-6 text-sm text-[#9AA1B5]">
          {/* Five Threat Zones Table */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#947CFF] mb-2.5">
              1. Five Threat Zones Analysis (Including Reflection → Action)
            </h3>
            <div className="overflow-x-auto border border-[#272C3D] rounded-2xl">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-[#171B29] text-[#F4F5F9]">
                  <tr>
                    <th className="p-3 border-b border-[#272C3D] font-semibold">Zone</th>
                    <th className="p-3 border-b border-[#272C3D] font-semibold">Threat Vector</th>
                    <th className="p-3 border-b border-[#272C3D] font-semibold">Implemented Countermeasures</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#272C3D]">
                  <tr className="hover:bg-[#171B29]/50">
                    <td className="p-3 font-semibold text-[#F4F5F9]">Input Surfaces</td>
                    <td className="p-3 text-[#9AA1B5]">Oversized payloads, script injection, malformed action requests</td>
                    <td className="p-3 text-[#9AA1B5]">
                      Express 10MB bounds, JSON parser pre-mount, length validation, zero-crash undefined sanitization in Firestore payload.
                    </td>
                  </tr>
                  <tr className="hover:bg-[#171B29]/50">
                    <td className="p-3 font-semibold text-[#F4F5F9]">Planning & Reasoning</td>
                    <td className="p-3 text-[#9AA1B5]">Prompt injection trying to solicit medical, psychiatric, or legal advice</td>
                    <td className="p-3 text-[#9AA1B5]">
                      Explicit system instruction framing; strict JSON schema enforcement; explicit disclaimer and prohibition of medical/psychiatric diagnosis.
                    </td>
                  </tr>
                  <tr className="hover:bg-[#171B29]/50">
                    <td className="p-3 font-semibold text-[#F4F5F9]">Tool Execution</td>
                    <td className="p-3 text-[#9AA1B5]">Gemini outage, rate limit exhaustion, key leakage</td>
                    <td className="p-3 text-[#9AA1B5]">
                      Strict server-side proxy; Resilient Model Fallback Ladder (gemini-3.6-flash &rarr; gemini-3.1-flash-lite &rarr; gemini-flash-latest &rarr; gemini-3.7-flash). Zero client-exposed keys.
                    </td>
                  </tr>
                  <tr className="hover:bg-[#171B29]/50">
                    <td className="p-3 font-semibold text-[#F4F5F9]">Memory & State</td>
                    <td className="p-3 text-[#9AA1B5]">Cross-tenant read/write, unauthorized document browsing</td>
                    <td className="p-3 text-[#9AA1B5]">
                      Owner-bound Firestore path isolation <code className="text-[#947CFF] font-mono bg-[#171B29] px-1 py-0.5 rounded border border-[#272C3D]">/users/{'{userId}'}/interactions</code>; verified <code className="text-[#947CFF] font-mono bg-[#171B29] px-1 py-0.5 rounded border border-[#272C3D]">request.auth.uid == userId</code>.
                    </td>
                  </tr>
                  <tr className="hover:bg-[#171B29]/50">
                    <td className="p-3 font-semibold text-[#F4F5F9]">Inter-System Comm</td>
                    <td className="p-3 text-[#9AA1B5]">Password breaches, credential theft, token tampering</td>
                    <td className="p-3 text-[#9AA1B5]">
                      Federated Google Identity via Firebase Auth. Zero password storage in application code.
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Active Firestore Security Rules */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#947CFF] mb-2.5">
              2. Active Firestore Security Rules (firestore.rules)
            </h3>
            <pre className="bg-[#080A12] border border-[#272C3D] p-4 rounded-2xl text-xs font-mono text-[#67D9B0] overflow-x-auto shadow-xs leading-relaxed">
{`rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // User profile document
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }

    // User-isolated journal entries and reflections
    match /users/{userId}/interactions/{interactionId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }

    // Default deny all other paths
    match /{document=**} {
      allow read, write: if false;
    }
  }
}`}
            </pre>
            <p className="text-xs text-[#9AA1B5] mt-2 flex items-center space-x-1.5">
              <CheckCircle2 className="w-4 h-4 text-[#67D9B0] inline shrink-0" />
              <span>Zero insecure defaults: Unauthorized reads and writes are rejected at the database engine level.</span>
            </p>
          </div>

          {/* Fallback Ladder Details */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#947CFF] mb-2.5">
              3. Resilient Gemini Fallback Ladder
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="p-3.5 bg-[#171B29] border border-[#272C3D] rounded-2xl">
                <span className="text-[#947CFF] font-bold block">1. Primary Target</span>
                <span className="font-mono text-[#F4F5F9] font-semibold">gemini-3.6-flash</span>
                <p className="text-[#9AA1B5] mt-1">High-speed conversational reflection and summarization.</p>
              </div>
              <div className="p-3.5 bg-[#171B29] border border-[#272C3D] rounded-2xl">
                <span className="text-[#947CFF] font-bold block">2. High-Availability Fallback</span>
                <span className="font-mono text-[#F4F5F9] font-semibold">gemini-3.1-flash-lite</span>
                <p className="text-[#9AA1B5] mt-1">Low-latency backup activated if primary is congested.</p>
              </div>
              <div className="p-3.5 bg-[#171B29] border border-[#272C3D] rounded-2xl">
                <span className="text-[#947CFF] font-bold block">3. Dynamic Alias</span>
                <span className="font-mono text-[#F4F5F9] font-semibold">gemini-flash-latest</span>
                <p className="text-[#9AA1B5] mt-1">Platform managed latest stable flash build.</p>
              </div>
              <div className="p-3.5 bg-[#171B29] border border-[#272C3D] rounded-2xl">
                <span className="text-[#947CFF] font-bold block">4. Deep Reasoning Fallback</span>
                <span className="font-mono text-[#F4F5F9] font-semibold">gemini-3.7-flash</span>
                <p className="text-[#9AA1B5] mt-1">Advanced reasoning engine for complex reflections.</p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 border-t border-[#272C3D] bg-[#171B29]/40 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 text-xs font-semibold bg-[#7C6CF2] hover:bg-[#947CFF] text-white rounded-xl shadow-xs shadow-[#7C6CF2]/20 transition-colors cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
