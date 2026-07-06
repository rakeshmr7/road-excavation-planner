"use client";

import React from "react";
import { useParams } from "next/navigation";
import ProposalDetailView from "../../../../components/ProposalDetailView";

export default function PlannerProposalDetailPage() {
  const params = useParams();
  const id = params.id as string;

  return <ProposalDetailView id={id} currentRole="planner" />;
}
