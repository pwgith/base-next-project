"use client";

import { useCallback, useState } from "react";
import { IfcViewer } from "@/components/ifc/ifcViewer";
import { AiChatPanel } from "@/components/ifc/aiChatPanel";

interface WorkspaceLayoutProps {
  projectId: string;
  projectName: string;
  currentVersion: number;
  elementCount: number;
}

export function WorkspaceLayout({
  projectId,
  projectName,
  currentVersion,
  elementCount,
}: WorkspaceLayoutProps) {
  const [version, setVersion] = useState(currentVersion);
  const [reloadKey, setReloadKey] = useState(0);

  const handleNewVersion = useCallback((newVersion: number) => {
    setVersion(newVersion);
    setReloadKey((k) => k + 1);
  }, []);

  return (
    <div className="flex h-screen w-full">
      <div className="flex-1 min-w-0">
        <IfcViewer
          key={reloadKey}
          projectId={projectId}
          projectName={projectName}
          currentVersion={version}
          elementCount={Math.max(elementCount, reloadKey > 0 ? 1 : elementCount)}
          onNewVersion={handleNewVersion}
        />
      </div>
      <div className="w-[360px] shrink-0">
        <AiChatPanel
          projectId={projectId}
          onNewVersion={handleNewVersion}
        />
      </div>
    </div>
  );
}
