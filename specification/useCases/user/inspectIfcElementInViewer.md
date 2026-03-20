# Inspect IFC Element in Viewer

## Metadata

| Field            | Value                          |
|------------------|--------------------------------|
| **ID**           | UC-USR-018                     |
| **Actor**        | User                           |
| **Priority**     | Medium                         |
| **Status**       | Draft                          |
| **Created**      | 2026-03-16                     |
| **Last Updated** | 2026-03-16                     |

## Summary

While viewing an IFC model in the browser (see [UC-USR-017 View IFC Model in Browser](./viewIfcModelInBrowser.md)), the user clicks on a 3D element in the viewport. The system highlights the selected element and displays its IFC properties — such as its type, name, and associated property sets — in a side panel.

## Preconditions

- The IFC model has been successfully loaded and rendered in the browser viewport (see [UC-USR-017 View IFC Model in Browser](./viewIfcModelInBrowser.md)).
- The model contains at least one IFC element with geometry that is visible in the scene.

## Trigger

The user clicks on a visible 3D element in the IFC viewport.

## Main Flow (Happy Path)

1. The user moves the cursor over the viewport; the system highlights the element under the cursor to indicate it is selectable.
2. The user clicks on an element in the viewport.
3. The system identifies the IFC entity corresponding to the clicked geometry using `@thatopen/components` fragment picking.
4. The system visually highlights the selected element (e.g., changes its surface colour) to confirm selection.
5. The system retrieves the IFC properties for the selected entity: its global ID, IFC type (e.g., `IfcWall`, `IfcSlab`), name, object type, and all associated property sets.
6. The system displays the retrieved properties in a side panel alongside the viewport, grouped by property set.
7. The user reads the element's properties.

## Alternative Flows

### Deselect the Current Element

- **Branches from**: Step 7 of Main Flow
- The user clicks on an empty area of the viewport (no geometry).
- The system removes the highlight from the previously selected element and clears the properties panel.

### Select a Different Element

- **Branches from**: Step 7 of Main Flow
- The user clicks on a different element in the viewport.
- The system replaces the previous selection: Step 3 through Step 6 are repeated for the newly clicked element.

### Element Has No Named Property Sets

- **Branches from**: Step 5 of Main Flow
- The selected IFC entity exists but has no associated property sets (only its base attributes such as global ID and type are available).
- The system displays the base attributes and shows an informational message that no property sets are attached to this element.

### Copy Global ID

- **Branches from**: Step 7 of Main Flow
- The user activates the copy control next to the element's global ID in the properties panel.
- The system copies the global ID string to the clipboard.

## Exception Flows

### Element Properties Cannot Be Retrieved

- **Triggered at**: Step 5 of Main Flow
- The system can identify the IFC entity from the geometry pick but fails to retrieve its property data (e.g., due to a parsing error in the loaded Fragments).
- The system displays an error message in the properties panel indicating the properties could not be loaded for this element.
- The element remains highlighted so the user can identify which element was selected.

### Click Does Not Hit Any Geometry

- **Triggered at**: Step 3 of Main Flow
- The user clicks in the viewport but the ray cast does not intersect any IFC geometry (e.g., clicking on empty space or the background).
- No element is selected or highlighted. If a previous selection exists, it is preserved.

## Postconditions

- The selected IFC element is visually highlighted in the viewport.
- The element's IFC properties are displayed in the properties panel.

## Business Rules

- Selection and property retrieval are performed entirely client-side using the loaded Fragments; no additional server request is required.
- Only one element may be selected at a time (multi-selection is out of scope for the initial implementation).
- The properties panel is read-only — the user cannot edit IFC properties through the viewer.
- The global ID displayed must match the `GlobalId` attribute of the corresponding IFC entity as stored in the server-side IFC model.

## UI Reference

[design/ui/ifcWorkspace.html](../../../design/ui/ifcWorkspace.html)

## Features

| Feature ID | Scenario IDs                              | Description                                      |
|------------|-------------------------------------------|--------------------------------------------------|
| F-030      | S-221, S-222, S-223, S-224, S-225, S-226, S-227, S-228 | IFC viewer — inspect element properties |

## Notes

- Element picking relies on `@thatopen/components` fragment-based ray casting — this is the standard selection mechanism for the library and avoids direct Three.js mesh inspection.
- Property retrieval uses the IFC data stored within the Fragments object that was already loaded in memory; no extra network round-trip is needed.
- Multi-element selection and model-tree navigation are potential future extensions of this use case.
- This use case depends on [UC-USR-017 View IFC Model in Browser](./viewIfcModelInBrowser.md) being complete (model loaded and rendered).
