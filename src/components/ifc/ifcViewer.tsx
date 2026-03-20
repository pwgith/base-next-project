"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import Link from "next/link";

type ViewerState =
  | "loading"
  | "loaded"
  | "empty"
  | "error-fetch"
  | "error-convert";

interface IfcViewerProps {
  projectId: string;
  projectName: string;
  currentVersion: number;
  elementCount: number;
  onNewVersion?: (version: number) => void;
}

export function IfcViewer({
  projectId,
  projectName,
  currentVersion,
  elementCount,
  onNewVersion,
}: IfcViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const componentsRef = useRef<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const worldRef = useRef<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const modelRef = useRef<any>(null);

  const [viewerState, setViewerState] = useState<ViewerState>("loading");
  const [cameraResetToast, setCameraResetToast] = useState(false);

  const initAndLoad = useCallback(
    async (preserveCamera: boolean) => {
      setViewerState("loading");

      const container = containerRef.current;
      if (!container) return;

      // Dynamic import — @thatopen/components only works in the browser
      const OBC = await import("@thatopen/components");
      const THREE = await import("three");

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let components: any = componentsRef.current;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let world: any = worldRef.current;

      // Save camera state before reload if requested
      let savedCameraPosition: { x: number; y: number; z: number } | null =
        null;
      let savedCameraTarget: { x: number; y: number; z: number } | null = null;
      if (preserveCamera && world) {
        const cam = world.camera;
        if (cam?.three?.position) {
          savedCameraPosition = {
            x: cam.three.position.x,
            y: cam.three.position.y,
            z: cam.three.position.z,
          };
        }
        if (cam?.controls?.getTarget) {
          const target = new THREE.Vector3();
          cam.controls.getTarget(target);
          savedCameraTarget = { x: target.x, y: target.y, z: target.z } ;
        }
      }

      // Dispose old model if reloading
      if (modelRef.current) {
        try {
          if (typeof modelRef.current.dispose === "function") {
            modelRef.current.dispose();
          }
        } catch {
          // ignore disposal errors
        }
        modelRef.current = null;
      }

      // Initialise components + world on first load
      if (!components) {
        components = new OBC.Components();
        componentsRef.current = components;

        const worlds = components.get(OBC.Worlds);
        world = worlds.create();
        worldRef.current = world;

        world.scene = new OBC.SimpleScene(components);
        world.renderer = new OBC.SimpleRenderer(components, container);
        world.camera = new OBC.SimpleCamera(components);

        world.scene.setup();

        // Add a grid
        const grids = components.get(OBC.Grids);
        grids.create(world);

        // FragmentsManager must be initialised before IfcLoader.load()
        const fragments = components.get(OBC.FragmentsManager);
        fragments.init();

        // Start the render/update loop
        components.init();
      }

      // If the project has no elements, skip fetching and parsing the IFC file
      // entirely — the minimal STEP file (only IfcProject metadata) may not be
      // parseable by the @thatopen/components IfcLoader.
      if (elementCount === 0) {
        setViewerState("empty");
        return;
      }

      // Fetch IFC file
      let ifcBuffer: ArrayBuffer;
      try {
        const response = await fetch(`/api/projects/${projectId}/ifc`);
        if (!response.ok) {
          setViewerState("error-fetch");
          return;
        }
        ifcBuffer = await response.arrayBuffer();
      } catch {
        setViewerState("error-fetch");
        return;
      }

      // Convert IFC to Fragments
      try {
        const ifcLoader = components.get(OBC.IfcLoader);
        await ifcLoader.setup({ autoSetWasm: false });
        ifcLoader.settings.wasm.path = "/wasm/";
        ifcLoader.settings.wasm.absolute = true;

        const data = new Uint8Array(ifcBuffer);
        const model = await ifcLoader.load(data, true, projectName);
        modelRef.current = model;

        // Add the model's Three.js object to the world scene
        world.scene.three.add(model.object);

        // Register the camera so the model can do LOD / culling
        model.useCamera(world.camera.three);

        // Force-flush tile loading so model.box is populated before we fit the camera.
        // Without this, model.box is empty because tiles are loaded lazily.
        const fragmentsMgr = components.get(OBC.FragmentsManager);
        await fragmentsMgr.core.update(true);

        setViewerState("loaded");

        // Fit camera to model
        if (savedCameraPosition && savedCameraTarget) {
          world.camera.three.position.set(
            savedCameraPosition.x,
            savedCameraPosition.y,
            savedCameraPosition.z,
          );
          world.camera.controls.setTarget(
            savedCameraTarget.x,
            savedCameraTarget.y,
            savedCameraTarget.z,
            false,
          );
        } else {
          // Fit to scene on initial load using the model bounding box
          const sphere = new THREE.Sphere();
          model.box.getBoundingSphere(sphere);
          if (sphere.radius > 0) {
            world.camera.controls.fitToSphere(sphere, true);
          }
        }
      } catch (err) {
        console.error("[IfcViewer] Fragment conversion failed:", err);
        setViewerState("error-convert");
      }
    },
    [projectId, projectName, elementCount],
  );

  useEffect(() => {
    initAndLoad(false);

    return () => {
      // Cleanup on unmount
      if (componentsRef.current?.dispose) {
        componentsRef.current.dispose();
      }
      componentsRef.current = null;
      worldRef.current = null;
      modelRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleReload(): void {
    initAndLoad(true);
  }

  function handleResetCamera(): void {
    const world = worldRef.current;
    if (!world?.camera?.controls || !world?.scene?.three) return;

    import("three").then((THREE) => {
      const bbox = new THREE.Box3().setFromObject(world.scene.three);
      const sphere = new THREE.Sphere();
      bbox.getBoundingSphere(sphere);
      world.camera.controls.fitToSphere(sphere, true);
    });

    setCameraResetToast(true);
    setTimeout(() => setCameraResetToast(false), 2000);
  }

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col text-slate-100">
      {/* Nav bar */}
      <nav className="bg-slate-900/95 backdrop-blur-sm border-b border-slate-700/60 sticky top-0 z-50">
        <div className="max-w-full px-4 sm:px-6 flex items-center justify-between h-[52px] gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <Link
              href="/projects"
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-slate-700/60 transition-colors shrink-0"
              aria-label="Back to projects"
            >
              <svg
                className="w-4 h-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2.5}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18"
                />
              </svg>
            </Link>
            <div className="h-4 w-px bg-slate-700 shrink-0" />
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-500 flex items-center justify-center shrink-0">
                <svg
                  className="w-3.5 h-3.5 text-white"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={1.8}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M2.25 21h19.5m-18-18v18m10.5-18v18m6-13.5V21"
                  />
                </svg>
              </div>
              <span className="font-semibold text-slate-100 text-sm truncate">
                {projectName}
              </span>
              <span className="inline-flex items-center gap-1 bg-slate-700/70 text-slate-300 text-xs font-medium rounded-full px-2 py-0.5 shrink-0">
                <svg
                  className="w-3 h-3"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M3.75 12h16.5m-16.5 3.75h16.5M3.75 19.5h16.5M5.625 4.5h12.75a1.875 1.875 0 010 3.75H5.625a1.875 1.875 0 010-3.75z"
                  />
                </svg>
                v{currentVersion}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={handleReload}
              title="Reload model"
              className="p-2 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-slate-700/60 transition-colors"
              aria-label="Reload model"
            >
              <svg
                className="w-4 h-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99"
                />
              </svg>
            </button>
          </div>
        </div>
      </nav>

      {/* Workspace body */}
      <div className="flex flex-1 overflow-hidden">
        {/* Toolbar */}
        <aside className="bg-slate-800/70 border-r border-slate-700/50 flex flex-col items-center py-3 gap-1 w-12 shrink-0">
          <span className="sr-only">Camera controls</span>

          {/* Reset camera */}
          <button
            onClick={handleResetCamera}
            title="Reset camera to fit model"
            className="p-2 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-slate-700/60 transition-colors"
            aria-label="Reset camera"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1.8}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M9 9V4.5M9 9H4.5M9 9L3.75 3.75M9 15v4.5M9 15H4.5M9 15l-5.25 5.25M15 9h4.5M15 9V4.5M15 9l5.25-5.25M15 15h4.5M15 15v4.5m0-4.5l5.25 5.25"
              />
            </svg>
          </button>
        </aside>

        {/* Viewport */}
        <div className="flex-1 relative">
          <div
            ref={containerRef}
            className="absolute inset-0"
            style={{ cursor: "grab" }}
            data-testid="ifc-viewport"
            data-viewer-state={viewerState}
          />

          {/* Loading overlay */}
          {viewerState === "loading" && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 text-center bg-slate-900/80 z-10">
              <div className="w-12 h-12 rounded-full border-2 border-blue-500/30 border-t-blue-400 animate-spin" />
              <div>
                <p className="text-slate-300 font-medium text-sm">
                  Loading model…
                </p>
                <p className="text-slate-500 text-xs mt-0.5">
                  Converting IFC to Fragments
                </p>
              </div>
            </div>
          )}

          {/* Empty model overlay */}
          {viewerState === "empty" && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-center px-6 pointer-events-none z-10">
              <div className="w-14 h-14 rounded-2xl bg-slate-700/60 flex items-center justify-center">
                <svg
                  className="w-7 h-7 text-slate-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={1.5}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M2.25 21h19.5m-18-18v18m10.5-18v18m6-13.5V21"
                  />
                </svg>
              </div>
              <div>
                <p className="text-slate-300 font-semibold text-sm">
                  No visible geometry
                </p>
                <p className="text-slate-500 text-xs mt-1 max-w-xs">
                  This model contains only a root IfcProject entity. Add
                  elements via the API and reload to see the model.
                </p>
              </div>
            </div>
          )}

          {/* Fetch error overlay */}
          {viewerState === "error-fetch" && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-center px-6 z-10">
              <div className="w-14 h-14 rounded-2xl bg-red-900/40 flex items-center justify-center">
                <svg
                  className="w-7 h-7 text-red-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={1.5}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"
                  />
                </svg>
              </div>
              <div>
                <p className="text-red-300 font-semibold text-sm">
                  Model could not be loaded
                </p>
                <p className="text-slate-500 text-xs mt-1 max-w-xs">
                  The IFC file could not be fetched from the server. Check your
                  connection and try again.
                </p>
              </div>
              <button
                onClick={handleReload}
                className="mt-1 inline-flex items-center gap-2 bg-slate-700 hover:bg-slate-600 text-slate-200 text-xs font-semibold rounded-xl px-4 py-2 transition-colors"
              >
                <svg
                  className="w-3.5 h-3.5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99"
                  />
                </svg>
                Retry
              </button>
            </div>
          )}

          {/* Conversion error overlay */}
          {viewerState === "error-convert" && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-center px-6 z-10">
              <div className="w-14 h-14 rounded-2xl bg-amber-900/40 flex items-center justify-center">
                <svg
                  className="w-7 h-7 text-amber-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={1.5}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M9.75 9.75l4.5 4.5m0-4.5l-4.5 4.5M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </div>
              <div>
                <p className="text-amber-300 font-semibold text-sm">
                  Model could not be processed
                </p>
                <p className="text-slate-500 text-xs mt-1 max-w-xs">
                  The IFC file was downloaded but could not be converted to
                  Fragments. The file may be malformed or use unsupported IFC
                  schema features.
                </p>
              </div>
              <Link
                href="/projects"
                className="mt-1 inline-flex items-center gap-2 bg-slate-700 hover:bg-slate-600 text-slate-200 text-xs font-semibold rounded-xl px-4 py-2 transition-colors"
              >
                ← Back to projects
              </Link>
            </div>
          )}

          {/* Camera reset toast */}
          {cameraResetToast && (
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-slate-800/90 text-slate-200 text-xs font-medium rounded-xl px-4 py-2 shadow-xl border border-slate-700 pointer-events-none z-20">
              Camera reset to fit model
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
