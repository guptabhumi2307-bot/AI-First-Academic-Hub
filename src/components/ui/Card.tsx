/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from "react";

export const Card = ({ children, className = "" }: { children: React.ReactNode; className?: string }) => (
  <div className={`glass rounded-[2rem] p-6 border-white/60 shadow-xl ${className}`}>
    {children}
  </div>
);
