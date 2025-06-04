"use client";
import React, { useState, ReactNode } from "react";

export default function LoginLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      {/* <!-- ===== Main Content Start ===== --> */}
      <main>
        <div className="mx-auto md:p-6">
          {children}
        </div>
      </main>
      {/* <!-- ===== Main Content End ===== --> */}
    </>
  );
}
