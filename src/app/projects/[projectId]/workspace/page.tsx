import type { Metadata } from "next";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createServerClient } from "@/lib/supabase/serverClient";
import { getProject } from "@/modules/ifc/projectService";
import { getElementCount } from "@/modules/ifc/ifcModelService";
import { WorkspaceLayout } from "@/components/ifc/workspaceLayout";

export const metadata: Metadata = {
  title: "Workspace — Model Helper",
};

export default async function WorkspacePage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;

  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get("sb_session");

  if (!sessionCookie?.value) {
    redirect(`/login?redirectTo=/projects/${projectId}/workspace`);
  }

  const supabase = createServerClient();
  const { data, error } = await supabase.auth.getUser(sessionCookie.value);

  if (error || !data.user) {
    redirect(`/login?redirectTo=/projects/${projectId}/workspace`);
  }

  const supabaseUserId = data.user.id;

  let projectName: string;
  let currentVersion: number;
  let elementCount: number;
  try {
    const result = await getProject(supabaseUserId, projectId);
    projectName = result.project.name;
    currentVersion = result.currentIfcVersion;
    elementCount = await getElementCount(projectId);
  } catch {
    redirect("/projects");
  }

  return (
    <WorkspaceLayout
      projectId={projectId}
      projectName={projectName}
      currentVersion={currentVersion}
      elementCount={elementCount}
    />
  );
}
