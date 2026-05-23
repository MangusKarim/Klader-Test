// src/app/partners/page.tsx
"use client";

import React from "react";
import DashboardLayout from "@/components/DashboardLayout";
import PartnersManager from "@/components/PartnersManager";

export default function PartnersPage() {
  return (
    <DashboardLayout>
      <PartnersManager />
    </DashboardLayout>
  );
}
