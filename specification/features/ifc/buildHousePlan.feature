@F-038 @UC-USR-026
Feature: Build a complete house model from scratch
  As a user
  I want to create a full residential house plan using IFC API calls
  So that I can verify the entire modelling workflow end-to-end

  @S-269 @UC-USR-026
  Scenario: Build a 3-bedroom detached house from an empty project
    # ─── Authentication & project creation ────────
    Given the house plan user is authenticated with scope "ifc:read ifc:write ifc:delete"
    And the user has an IFC file with ID "house-001"
    And the IFC file "house-001" has a default site and building

    # ─── Project metadata & units ─────────────────
    When the user PATCHes "/api/v1/ifc/files/house-001/project" with:
      """
      {
        "description": "3-bedroom detached house, Surrey",
        "phase": "RIBA Stage 3 - Spatial Coordination"
      }
      """
    Then the response code is 200
    And the response data contains "description": "3-bedroom detached house, Surrey"
    And the response data contains "phase": "RIBA Stage 3 - Spatial Coordination"
    When the user PATCHes "/api/v1/ifc/files/house-001/project/units" with:
      """
      {
        "units": [
          { "unitType": "LENGTHUNIT", "name": "METRE", "prefix": "MILLI" },
          { "unitType": "AREAUNIT", "name": "SQUARE_METRE" },
          { "unitType": "PLANEANGLEUNIT", "name": "DEGREE" }
        ]
      }
      """
    Then the response code is 200

    # ─── Spatial structure: storeys ───────────────
    When the user POSTs to "/api/v1/ifc/files/house-001/storeys" with:
      """
      { "name": "Ground Floor", "elevation": 0.0 }
      """
    Then the response code is 201
    And the response data contains "name": "Ground Floor"
    And the response data contains a "globalId" field
    And the user saves response field "globalId" as "ground-floor-id"
    When the user POSTs to "/api/v1/ifc/files/house-001/storeys" with:
      """
      { "name": "First Floor", "elevation": 3000.0 }
      """
    Then the response code is 201
    And the user saves response field "globalId" as "first-floor-id"

    # ─── External walls (ground floor, brick) ─────
    # Floor plan: 10m × 5m with central hallway
    #
    #  Y=5000 ┌──────────┬─────────┬──────────┐
    #         │ Kitchen  │ Bed 1   │ Bed 2    │
    #  Y=3000 ├──────────┴─────────┴──────────┤
    #         │     Central Hallway (1m)       │
    #  Y=2000 ├──────────┬─────────┬──────────┤
    #         │ Living   │ Bed 3   │ Bathroom │
    #  Y=0    └──────────┴─────────┴──────────┘
    #         X=0     X=3500   X=6500      X=10000
    When the user POSTs to "/api/v1/ifc/files/house-001/elements" with:
      """
      { "ifcType": "IfcWall", "name": "External Wall - North", "storeyGlobalId": "{ground-floor-id}" }
      """
    Then the response code is 201
    And the response data contains "ifcType": "IfcWall"
    And the user saves response field "globalId" as "wall-north-id"
    When the user POSTs to "/api/v1/ifc/files/house-001/elements" with:
      """
      { "ifcType": "IfcWall", "name": "External Wall - South", "storeyGlobalId": "{ground-floor-id}" }
      """
    Then the response code is 201
    And the user saves response field "globalId" as "wall-south-id"
    When the user POSTs to "/api/v1/ifc/files/house-001/elements" with:
      """
      { "ifcType": "IfcWall", "name": "External Wall - East", "storeyGlobalId": "{ground-floor-id}" }
      """
    Then the response code is 201
    And the user saves response field "globalId" as "wall-east-id"
    When the user POSTs to "/api/v1/ifc/files/house-001/elements" with:
      """
      { "ifcType": "IfcWall", "name": "External Wall - West", "storeyGlobalId": "{ground-floor-id}" }
      """
    Then the response code is 201
    And the user saves response field "globalId" as "wall-west-id"

    # ─── Wall geometry & placement ────────────────
    # North wall: 10m long × 0.3m thick × 3m high, centered along Y=5m edge
    When the user PATCHes "/api/v1/ifc/files/house-001/elements/{wall-north-id}/placement" with:
      """
      { "location": { "x": 5000, "y": 5000, "z": 0 }, "axis": { "x": 0, "y": 0, "z": 1 }, "refDirection": { "x": 1, "y": 0, "z": 0 } }
      """
    Then the response code is 200
    When the user PUTs to "/api/v1/ifc/files/house-001/elements/{wall-north-id}/geometry" with:
      """
      { "representations": [{ "representationType": "SweptSolid", "items": [{ "type": "IfcExtrudedAreaSolid", "depth": 3000, "direction": { "x": 0, "y": 0, "z": 1 }, "profile": { "type": "IfcRectangleProfileDef", "xDim": 10000, "yDim": 300 } }] }] }
      """
    Then the response code is 200
    # South wall: 10m long × 0.3m thick × 3m high, centered along Y=0 edge
    When the user PATCHes "/api/v1/ifc/files/house-001/elements/{wall-south-id}/placement" with:
      """
      { "location": { "x": 5000, "y": 0, "z": 0 }, "axis": { "x": 0, "y": 0, "z": 1 }, "refDirection": { "x": 1, "y": 0, "z": 0 } }
      """
    Then the response code is 200
    When the user PUTs to "/api/v1/ifc/files/house-001/elements/{wall-south-id}/geometry" with:
      """
      { "representations": [{ "representationType": "SweptSolid", "items": [{ "type": "IfcExtrudedAreaSolid", "depth": 3000, "direction": { "x": 0, "y": 0, "z": 1 }, "profile": { "type": "IfcRectangleProfileDef", "xDim": 10000, "yDim": 300 } }] }] }
      """
    Then the response code is 200
    # East wall: 5m long × 0.3m thick × 3m high, centered along X=10m edge
    When the user PATCHes "/api/v1/ifc/files/house-001/elements/{wall-east-id}/placement" with:
      """
      { "location": { "x": 10000, "y": 2500, "z": 0 }, "axis": { "x": 0, "y": 0, "z": 1 }, "refDirection": { "x": 0, "y": 1, "z": 0 } }
      """
    Then the response code is 200
    When the user PUTs to "/api/v1/ifc/files/house-001/elements/{wall-east-id}/geometry" with:
      """
      { "representations": [{ "representationType": "SweptSolid", "items": [{ "type": "IfcExtrudedAreaSolid", "depth": 3000, "direction": { "x": 0, "y": 0, "z": 1 }, "profile": { "type": "IfcRectangleProfileDef", "xDim": 5000, "yDim": 300 } }] }] }
      """
    Then the response code is 200
    # West wall: 5m long × 0.3m thick × 3m high, centered along X=0 edge
    When the user PATCHes "/api/v1/ifc/files/house-001/elements/{wall-west-id}/placement" with:
      """
      { "location": { "x": 0, "y": 2500, "z": 0 }, "axis": { "x": 0, "y": 0, "z": 1 }, "refDirection": { "x": 0, "y": 1, "z": 0 } }
      """
    Then the response code is 200
    When the user PUTs to "/api/v1/ifc/files/house-001/elements/{wall-west-id}/geometry" with:
      """
      { "representations": [{ "representationType": "SweptSolid", "items": [{ "type": "IfcExtrudedAreaSolid", "depth": 3000, "direction": { "x": 0, "y": 0, "z": 1 }, "profile": { "type": "IfcRectangleProfileDef", "xDim": 5000, "yDim": 300 } }] }] }
      """
    Then the response code is 200

    # ─── Slab ───────────────────────────────────
    When the user POSTs to "/api/v1/ifc/files/house-001/elements" with:
      """
      { "ifcType": "IfcSlab", "name": "Ground Floor Slab", "predefinedType": "FLOOR", "storeyGlobalId": "{ground-floor-id}" }
      """
    Then the response code is 201
    And the response data contains "ifcType": "IfcSlab"
    And the user saves response field "globalId" as "slab-id"

    # ─── Slab geometry ───────────────────────────
    # Ground slab: 10m × 5m footprint, 200mm thick, centered
    When the user PATCHes "/api/v1/ifc/files/house-001/elements/{slab-id}/placement" with:
      """
      { "location": { "x": 5000, "y": 2500, "z": 0 }, "axis": { "x": 0, "y": 0, "z": 1 }, "refDirection": { "x": 1, "y": 0, "z": 0 } }
      """
    Then the response code is 200
    When the user PUTs to "/api/v1/ifc/files/house-001/elements/{slab-id}/geometry" with:
      """
      { "representations": [{ "representationType": "SweptSolid", "items": [{ "type": "IfcExtrudedAreaSolid", "depth": 200, "direction": { "x": 0, "y": 0, "z": -1 }, "profile": { "type": "IfcRectangleProfileDef", "xDim": 10000, "yDim": 5000 } }] }] }
      """
    Then the response code is 200

    # ─── Interior walls (corridor + partitions, timber) ───
    # Open-plan layout – hallway opens into living/dining/kitchen
    #
    #  Y=5000 ┌──────────────────────┬──────────┐
    #         │                      │          │
    #         │  Open Plan Living/   │ Bed 2    │
    #         │  Dining/Kitchen      │ 3.5m×2m  │
    #         │  6.5m × 2m  [arch]  │          │
    #  Y=3000 │                  ┌───┴──────────┤
    #         │   (open to hall) │   Hallway    │
    #  Y=2000 ├──────────┬───────┴──┬───────────┤
    #         │ Bed 1    │ Bed 3    │ Bathroom  │
    #         │ 3.5m×2m  │ 3m×2m   │ 3.5m×2m  │
    #  Y=0    └──────────┴──────────┴───────────┘
    #         X=0     X=3500   X=6500       X=10000
    #
    # Corridor south wall: 10m × 100mm × 2.7m at Y=2000
    When the user POSTs to "/api/v1/ifc/files/house-001/elements" with:
      """
      { "ifcType": "IfcWall", "name": "Corridor Wall - South", "storeyGlobalId": "{ground-floor-id}" }
      """
    Then the response code is 201
    And the user saves response field "globalId" as "corridor-south-id"
    When the user PATCHes "/api/v1/ifc/files/house-001/elements/{corridor-south-id}/placement" with:
      """
      { "location": { "x": 5000, "y": 2000, "z": 0 }, "axis": { "x": 0, "y": 0, "z": 1 }, "refDirection": { "x": 1, "y": 0, "z": 0 } }
      """
    Then the response code is 200
    When the user PUTs to "/api/v1/ifc/files/house-001/elements/{corridor-south-id}/geometry" with:
      """
      { "representations": [{ "representationType": "SweptSolid", "items": [{ "type": "IfcExtrudedAreaSolid", "depth": 2700, "direction": { "x": 0, "y": 0, "z": 1 }, "profile": { "type": "IfcRectangleProfileDef", "xDim": 10000, "yDim": 100 } }] }] }
      """
    Then the response code is 200
    # Corridor north wall: 3.5m × 100mm × 2.7m at Y=3000 (Bed 2 side only)
    # Open-plan: no wall from X=0 to X=6500 — hallway flows into living area
    When the user POSTs to "/api/v1/ifc/files/house-001/elements" with:
      """
      { "ifcType": "IfcWall", "name": "Corridor Wall - North", "storeyGlobalId": "{ground-floor-id}" }
      """
    Then the response code is 201
    And the user saves response field "globalId" as "corridor-north-id"
    When the user PATCHes "/api/v1/ifc/files/house-001/elements/{corridor-north-id}/placement" with:
      """
      { "location": { "x": 8250, "y": 3000, "z": 0 }, "axis": { "x": 0, "y": 0, "z": 1 }, "refDirection": { "x": 1, "y": 0, "z": 0 } }
      """
    Then the response code is 200
    When the user PUTs to "/api/v1/ifc/files/house-001/elements/{corridor-north-id}/geometry" with:
      """
      { "representations": [{ "representationType": "SweptSolid", "items": [{ "type": "IfcExtrudedAreaSolid", "depth": 2700, "direction": { "x": 0, "y": 0, "z": 1 }, "profile": { "type": "IfcRectangleProfileDef", "xDim": 3500, "yDim": 100 } }] }] }
      """
    Then the response code is 200
    # Partition Open Plan / Bed 2: 2m × 100mm × 2.7m at X=6500 (upper)
    When the user POSTs to "/api/v1/ifc/files/house-001/elements" with:
      """
      { "ifcType": "IfcWall", "name": "Partition - Open Plan/Bed2", "storeyGlobalId": "{ground-floor-id}" }
      """
    Then the response code is 201
    And the user saves response field "globalId" as "part-open-bed2-id"
    When the user PATCHes "/api/v1/ifc/files/house-001/elements/{part-open-bed2-id}/placement" with:
      """
      { "location": { "x": 6500, "y": 4000, "z": 0 }, "axis": { "x": 0, "y": 0, "z": 1 }, "refDirection": { "x": 0, "y": 1, "z": 0 } }
      """
    Then the response code is 200
    When the user PUTs to "/api/v1/ifc/files/house-001/elements/{part-open-bed2-id}/geometry" with:
      """
      { "representations": [{ "representationType": "SweptSolid", "items": [{ "type": "IfcExtrudedAreaSolid", "depth": 2700, "direction": { "x": 0, "y": 0, "z": 1 }, "profile": { "type": "IfcRectangleProfileDef", "xDim": 2000, "yDim": 100 } }] }] }
      """
    Then the response code is 200
    # Partition Bed1 / Bed3: 2m × 100mm × 2.7m at X=3500 (lower)
    When the user POSTs to "/api/v1/ifc/files/house-001/elements" with:
      """
      { "ifcType": "IfcWall", "name": "Partition - Bed1/Bed3", "storeyGlobalId": "{ground-floor-id}" }
      """
    Then the response code is 201
    And the user saves response field "globalId" as "part-bed1-bed3-id"
    When the user PATCHes "/api/v1/ifc/files/house-001/elements/{part-bed1-bed3-id}/placement" with:
      """
      { "location": { "x": 3500, "y": 1000, "z": 0 }, "axis": { "x": 0, "y": 0, "z": 1 }, "refDirection": { "x": 0, "y": 1, "z": 0 } }
      """
    Then the response code is 200
    When the user PUTs to "/api/v1/ifc/files/house-001/elements/{part-bed1-bed3-id}/geometry" with:
      """
      { "representations": [{ "representationType": "SweptSolid", "items": [{ "type": "IfcExtrudedAreaSolid", "depth": 2700, "direction": { "x": 0, "y": 0, "z": 1 }, "profile": { "type": "IfcRectangleProfileDef", "xDim": 2000, "yDim": 100 } }] }] }
      """
    Then the response code is 200
    # Partition Bed3 / Bathroom: 2m × 100mm × 2.7m at X=6500 (lower)
    When the user POSTs to "/api/v1/ifc/files/house-001/elements" with:
      """
      { "ifcType": "IfcWall", "name": "Partition - Bed3/Bathroom", "storeyGlobalId": "{ground-floor-id}" }
      """
    Then the response code is 201
    And the user saves response field "globalId" as "part-bed3-bath-id"
    When the user PATCHes "/api/v1/ifc/files/house-001/elements/{part-bed3-bath-id}/placement" with:
      """
      { "location": { "x": 6500, "y": 1000, "z": 0 }, "axis": { "x": 0, "y": 0, "z": 1 }, "refDirection": { "x": 0, "y": 1, "z": 0 } }
      """
    Then the response code is 200
    When the user PUTs to "/api/v1/ifc/files/house-001/elements/{part-bed3-bath-id}/geometry" with:
      """
      { "representations": [{ "representationType": "SweptSolid", "items": [{ "type": "IfcExtrudedAreaSolid", "depth": 2700, "direction": { "x": 0, "y": 0, "z": 1 }, "profile": { "type": "IfcRectangleProfileDef", "xDim": 2000, "yDim": 100 } }] }] }
      """
    Then the response code is 200

    # ─── Arch beam (open plan divider) ────────────
    # IfcBeam at X=3500 spanning Y=3000→5000, at Z=2400 (lintel height)
    # Separates living/dining zone from kitchen zone
    When the user POSTs to "/api/v1/ifc/files/house-001/elements" with:
      """
      { "ifcType": "IfcBeam", "name": "Arch Beam", "storeyGlobalId": "{ground-floor-id}" }
      """
    Then the response code is 201
    And the user saves response field "globalId" as "arch-beam-id"
    When the user PATCHes "/api/v1/ifc/files/house-001/elements/{arch-beam-id}/placement" with:
      """
      { "location": { "x": 3500, "y": 4000, "z": 2400 }, "axis": { "x": 0, "y": 0, "z": 1 }, "refDirection": { "x": 0, "y": 1, "z": 0 } }
      """
    Then the response code is 200
    When the user PUTs to "/api/v1/ifc/files/house-001/elements/{arch-beam-id}/geometry" with:
      """
      { "representations": [{ "representationType": "SweptSolid", "items": [{ "type": "IfcExtrudedAreaSolid", "depth": 300, "direction": { "x": 0, "y": 0, "z": 1 }, "profile": { "type": "IfcRectangleProfileDef", "xDim": 2000, "yDim": 200 } }] }] }
      """
    Then the response code is 200

    # ─── Front door with opening ──────────────────
    # Front door in west wall at hallway level (Y=2500)
    When the user POSTs to "/api/v1/ifc/files/house-001/elements" with:
      """
      { "ifcType": "IfcDoor", "name": "Front Door", "storeyGlobalId": "{ground-floor-id}" }
      """
    Then the response code is 201
    And the user saves response field "globalId" as "front-door-id"
    When the user PUTs to "/api/v1/ifc/files/house-001/elements/{front-door-id}/geometry" with:
      """
      { "representations": [{ "representationType": "SweptSolid", "items": [{ "type": "IfcExtrudedAreaSolid", "depth": 50, "direction": { "x": 0, "y": 0, "z": 1 }, "profile": { "type": "IfcRectangleProfileDef", "xDim": 900, "yDim": 2100 } }] }] }
      """
    Then the response code is 200
    When the user POSTs to "/api/v1/ifc/files/house-001/elements/{wall-west-id}/openings" with:
      """
      { "name": "Front Door Opening", "placement": { "x": 0, "y": 2500, "z": 0 }, "dimensions": { "width": 900, "height": 2100 } }
      """
    Then the response code is 201
    And the user saves response field "globalId" as "front-door-opening-id"
    When the user PUTs to "/api/v1/ifc/files/house-001/elements/{wall-west-id}/openings/{front-door-opening-id}/filling" with:
      """
      { "fillingGlobalId": "{front-door-id}" }
      """
    Then the response code is 200

    # ─── Interior doors from hallway ──────────────
    # No open-plan door needed — corridor-north wall is removed in this section
    # Bedroom 2 door (corridor north wall)
    When the user POSTs to "/api/v1/ifc/files/house-001/elements" with:
      """
      { "ifcType": "IfcDoor", "name": "Bedroom 2 Door", "storeyGlobalId": "{ground-floor-id}" }
      """
    Then the response code is 201
    And the user saves response field "globalId" as "door-bed2-id"
    When the user PUTs to "/api/v1/ifc/files/house-001/elements/{door-bed2-id}/geometry" with:
      """
      { "representations": [{ "representationType": "SweptSolid", "items": [{ "type": "IfcExtrudedAreaSolid", "depth": 40, "direction": { "x": 0, "y": 0, "z": 1 }, "profile": { "type": "IfcRectangleProfileDef", "xDim": 800, "yDim": 2100 } }] }] }
      """
    Then the response code is 200
    When the user POSTs to "/api/v1/ifc/files/house-001/elements/{corridor-north-id}/openings" with:
      """
      { "name": "Bedroom 2 Door Opening", "placement": { "x": 8250, "y": 3000, "z": 0 }, "dimensions": { "width": 800, "height": 2100 } }
      """
    Then the response code is 201
    And the user saves response field "globalId" as "opening-bed2-id"
    When the user PUTs to "/api/v1/ifc/files/house-001/elements/{corridor-north-id}/openings/{opening-bed2-id}/filling" with:
      """
      { "fillingGlobalId": "{door-bed2-id}" }
      """
    Then the response code is 200
    # Bedroom 1 door (corridor south wall)
    When the user POSTs to "/api/v1/ifc/files/house-001/elements" with:
      """
      { "ifcType": "IfcDoor", "name": "Bedroom 1 Door", "storeyGlobalId": "{ground-floor-id}" }
      """
    Then the response code is 201
    And the user saves response field "globalId" as "door-bed1-id"
    When the user PUTs to "/api/v1/ifc/files/house-001/elements/{door-bed1-id}/geometry" with:
      """
      { "representations": [{ "representationType": "SweptSolid", "items": [{ "type": "IfcExtrudedAreaSolid", "depth": 40, "direction": { "x": 0, "y": 0, "z": 1 }, "profile": { "type": "IfcRectangleProfileDef", "xDim": 800, "yDim": 2100 } }] }] }
      """
    Then the response code is 200
    When the user POSTs to "/api/v1/ifc/files/house-001/elements/{corridor-south-id}/openings" with:
      """
      { "name": "Bedroom 1 Door Opening", "placement": { "x": 1750, "y": 2000, "z": 0 }, "dimensions": { "width": 800, "height": 2100 } }
      """
    Then the response code is 201
    And the user saves response field "globalId" as "opening-bed1-id"
    When the user PUTs to "/api/v1/ifc/files/house-001/elements/{corridor-south-id}/openings/{opening-bed1-id}/filling" with:
      """
      { "fillingGlobalId": "{door-bed1-id}" }
      """
    Then the response code is 200
    # Bedroom 3 door (corridor south wall)
    When the user POSTs to "/api/v1/ifc/files/house-001/elements" with:
      """
      { "ifcType": "IfcDoor", "name": "Bedroom 3 Door", "storeyGlobalId": "{ground-floor-id}" }
      """
    Then the response code is 201
    And the user saves response field "globalId" as "door-bed3-id"
    When the user PUTs to "/api/v1/ifc/files/house-001/elements/{door-bed3-id}/geometry" with:
      """
      { "representations": [{ "representationType": "SweptSolid", "items": [{ "type": "IfcExtrudedAreaSolid", "depth": 40, "direction": { "x": 0, "y": 0, "z": 1 }, "profile": { "type": "IfcRectangleProfileDef", "xDim": 800, "yDim": 2100 } }] }] }
      """
    Then the response code is 200
    When the user POSTs to "/api/v1/ifc/files/house-001/elements/{corridor-south-id}/openings" with:
      """
      { "name": "Bedroom 3 Door Opening", "placement": { "x": 5000, "y": 2000, "z": 0 }, "dimensions": { "width": 800, "height": 2100 } }
      """
    Then the response code is 201
    And the user saves response field "globalId" as "opening-bed3-id"
    When the user PUTs to "/api/v1/ifc/files/house-001/elements/{corridor-south-id}/openings/{opening-bed3-id}/filling" with:
      """
      { "fillingGlobalId": "{door-bed3-id}" }
      """
    Then the response code is 200
    # Bathroom door (corridor south wall)
    When the user POSTs to "/api/v1/ifc/files/house-001/elements" with:
      """
      { "ifcType": "IfcDoor", "name": "Bathroom Door", "storeyGlobalId": "{ground-floor-id}" }
      """
    Then the response code is 201
    And the user saves response field "globalId" as "door-bath-id"
    When the user PUTs to "/api/v1/ifc/files/house-001/elements/{door-bath-id}/geometry" with:
      """
      { "representations": [{ "representationType": "SweptSolid", "items": [{ "type": "IfcExtrudedAreaSolid", "depth": 40, "direction": { "x": 0, "y": 0, "z": 1 }, "profile": { "type": "IfcRectangleProfileDef", "xDim": 800, "yDim": 2100 } }] }] }
      """
    Then the response code is 200
    When the user POSTs to "/api/v1/ifc/files/house-001/elements/{corridor-south-id}/openings" with:
      """
      { "name": "Bathroom Door Opening", "placement": { "x": 8250, "y": 2000, "z": 0 }, "dimensions": { "width": 800, "height": 2100 } }
      """
    Then the response code is 201
    And the user saves response field "globalId" as "opening-bath-id"
    When the user PUTs to "/api/v1/ifc/files/house-001/elements/{corridor-south-id}/openings/{opening-bath-id}/filling" with:
      """
      { "fillingGlobalId": "{door-bath-id}" }
      """
    Then the response code is 200

    # ─── Windows ──────────────────────────────────
    # Living area window (north wall)
    When the user POSTs to "/api/v1/ifc/files/house-001/elements" with:
      """
      { "ifcType": "IfcWindow", "name": "Living Area Window", "storeyGlobalId": "{ground-floor-id}" }
      """
    Then the response code is 201
    And the user saves response field "globalId" as "win-living-id"
    When the user PUTs to "/api/v1/ifc/files/house-001/elements/{win-living-id}/geometry" with:
      """
      { "representations": [{ "representationType": "SweptSolid", "items": [{ "type": "IfcExtrudedAreaSolid", "depth": 50, "direction": { "x": 0, "y": 0, "z": 1 }, "profile": { "type": "IfcRectangleProfileDef", "xDim": 1800, "yDim": 1200 } }] }] }
      """
    Then the response code is 200
    When the user POSTs to "/api/v1/ifc/files/house-001/elements/{wall-north-id}/openings" with:
      """
      { "name": "Living Area Window Opening", "placement": { "x": 1750, "y": 5000, "z": 900 }, "dimensions": { "width": 1800, "height": 1200 } }
      """
    Then the response code is 201
    And the user saves response field "globalId" as "opening-win-living-id"
    When the user PUTs to "/api/v1/ifc/files/house-001/elements/{wall-north-id}/openings/{opening-win-living-id}/filling" with:
      """
      { "fillingGlobalId": "{win-living-id}" }
      """
    Then the response code is 200
    # Kitchen window (north wall)
    When the user POSTs to "/api/v1/ifc/files/house-001/elements" with:
      """
      { "ifcType": "IfcWindow", "name": "Kitchen Window", "storeyGlobalId": "{ground-floor-id}" }
      """
    Then the response code is 201
    And the user saves response field "globalId" as "win-kitchen-id"
    When the user PUTs to "/api/v1/ifc/files/house-001/elements/{win-kitchen-id}/geometry" with:
      """
      { "representations": [{ "representationType": "SweptSolid", "items": [{ "type": "IfcExtrudedAreaSolid", "depth": 50, "direction": { "x": 0, "y": 0, "z": 1 }, "profile": { "type": "IfcRectangleProfileDef", "xDim": 1200, "yDim": 1200 } }] }] }
      """
    Then the response code is 200
    When the user POSTs to "/api/v1/ifc/files/house-001/elements/{wall-north-id}/openings" with:
      """
      { "name": "Kitchen Window Opening", "placement": { "x": 5000, "y": 5000, "z": 900 }, "dimensions": { "width": 1200, "height": 1200 } }
      """
    Then the response code is 201
    And the user saves response field "globalId" as "opening-win-kitchen-id"
    When the user PUTs to "/api/v1/ifc/files/house-001/elements/{wall-north-id}/openings/{opening-win-kitchen-id}/filling" with:
      """
      { "fillingGlobalId": "{win-kitchen-id}" }
      """
    Then the response code is 200
    # Bedroom 2 window (east wall)
    When the user POSTs to "/api/v1/ifc/files/house-001/elements" with:
      """
      { "ifcType": "IfcWindow", "name": "Bedroom 2 Window", "storeyGlobalId": "{ground-floor-id}" }
      """
    Then the response code is 201
    And the user saves response field "globalId" as "win-bed2-id"
    When the user PUTs to "/api/v1/ifc/files/house-001/elements/{win-bed2-id}/geometry" with:
      """
      { "representations": [{ "representationType": "SweptSolid", "items": [{ "type": "IfcExtrudedAreaSolid", "depth": 50, "direction": { "x": 0, "y": 0, "z": 1 }, "profile": { "type": "IfcRectangleProfileDef", "xDim": 1200, "yDim": 1200 } }] }] }
      """
    Then the response code is 200
    When the user POSTs to "/api/v1/ifc/files/house-001/elements/{wall-east-id}/openings" with:
      """
      { "name": "Bedroom 2 Window Opening", "placement": { "x": 10000, "y": 4000, "z": 900 }, "dimensions": { "width": 1200, "height": 1200 } }
      """
    Then the response code is 201
    And the user saves response field "globalId" as "opening-win-bed2-id"
    When the user PUTs to "/api/v1/ifc/files/house-001/elements/{wall-east-id}/openings/{opening-win-bed2-id}/filling" with:
      """
      { "fillingGlobalId": "{win-bed2-id}" }
      """
    Then the response code is 200
    # Bedroom 1 window (south wall)
    When the user POSTs to "/api/v1/ifc/files/house-001/elements" with:
      """
      { "ifcType": "IfcWindow", "name": "Bedroom 1 Window", "storeyGlobalId": "{ground-floor-id}" }
      """
    Then the response code is 201
    And the user saves response field "globalId" as "win-bed1-id"
    When the user PUTs to "/api/v1/ifc/files/house-001/elements/{win-bed1-id}/geometry" with:
      """
      { "representations": [{ "representationType": "SweptSolid", "items": [{ "type": "IfcExtrudedAreaSolid", "depth": 50, "direction": { "x": 0, "y": 0, "z": 1 }, "profile": { "type": "IfcRectangleProfileDef", "xDim": 1200, "yDim": 1200 } }] }] }
      """
    Then the response code is 200
    When the user POSTs to "/api/v1/ifc/files/house-001/elements/{wall-south-id}/openings" with:
      """
      { "name": "Bedroom 1 Window Opening", "placement": { "x": 1750, "y": 0, "z": 900 }, "dimensions": { "width": 1200, "height": 1200 } }
      """
    Then the response code is 201
    And the user saves response field "globalId" as "opening-win-bed1-id"
    When the user PUTs to "/api/v1/ifc/files/house-001/elements/{wall-south-id}/openings/{opening-win-bed1-id}/filling" with:
      """
      { "fillingGlobalId": "{win-bed1-id}" }
      """
    Then the response code is 200
    # Bedroom 3 window (south wall)
    When the user POSTs to "/api/v1/ifc/files/house-001/elements" with:
      """
      { "ifcType": "IfcWindow", "name": "Bedroom 3 Window", "storeyGlobalId": "{ground-floor-id}" }
      """
    Then the response code is 201
    And the user saves response field "globalId" as "win-bed3-id"
    When the user PUTs to "/api/v1/ifc/files/house-001/elements/{win-bed3-id}/geometry" with:
      """
      { "representations": [{ "representationType": "SweptSolid", "items": [{ "type": "IfcExtrudedAreaSolid", "depth": 50, "direction": { "x": 0, "y": 0, "z": 1 }, "profile": { "type": "IfcRectangleProfileDef", "xDim": 1200, "yDim": 1200 } }] }] }
      """
    Then the response code is 200
    When the user POSTs to "/api/v1/ifc/files/house-001/elements/{wall-south-id}/openings" with:
      """
      { "name": "Bedroom 3 Window Opening", "placement": { "x": 5000, "y": 0, "z": 900 }, "dimensions": { "width": 1200, "height": 1200 } }
      """
    Then the response code is 201
    And the user saves response field "globalId" as "opening-win-bed3-id"
    When the user PUTs to "/api/v1/ifc/files/house-001/elements/{wall-south-id}/openings/{opening-win-bed3-id}/filling" with:
      """
      { "fillingGlobalId": "{win-bed3-id}" }
      """
    Then the response code is 200
    # Bathroom window (east wall, small and high)
    When the user POSTs to "/api/v1/ifc/files/house-001/elements" with:
      """
      { "ifcType": "IfcWindow", "name": "Bathroom Window", "storeyGlobalId": "{ground-floor-id}" }
      """
    Then the response code is 201
    And the user saves response field "globalId" as "win-bath-id"
    When the user PUTs to "/api/v1/ifc/files/house-001/elements/{win-bath-id}/geometry" with:
      """
      { "representations": [{ "representationType": "SweptSolid", "items": [{ "type": "IfcExtrudedAreaSolid", "depth": 50, "direction": { "x": 0, "y": 0, "z": 1 }, "profile": { "type": "IfcRectangleProfileDef", "xDim": 600, "yDim": 600 } }] }] }
      """
    Then the response code is 200
    When the user POSTs to "/api/v1/ifc/files/house-001/elements/{wall-east-id}/openings" with:
      """
      { "name": "Bathroom Window Opening", "placement": { "x": 10000, "y": 1000, "z": 1500 }, "dimensions": { "width": 600, "height": 600 } }
      """
    Then the response code is 201
    And the user saves response field "globalId" as "opening-win-bath-id"
    When the user PUTs to "/api/v1/ifc/files/house-001/elements/{wall-east-id}/openings/{opening-win-bath-id}/filling" with:
      """
      { "fillingGlobalId": "{win-bath-id}" }
      """
    Then the response code is 200

    # ─── Materials & wall layer sets ──────────────
    When the user POSTs to "/api/v1/ifc/files/house-001/materials" with:
      """
      { "name": "Brick", "category": "Masonry" }
      """
    Then the response code is 201
    And the response data contains "name": "Brick"
    When the user POSTs to "/api/v1/ifc/files/house-001/materials" with:
      """
      { "name": "Insulation Board", "category": "Insulation" }
      """
    Then the response code is 201
    When the user POSTs to "/api/v1/ifc/files/house-001/materials" with:
      """
      { "name": "Plasterboard", "category": "Finish" }
      """
    Then the response code is 201
    When the user POSTs to "/api/v1/ifc/files/house-001/materials" with:
      """
      { "name": "Timber Frame", "category": "Framing" }
      """
    Then the response code is 201
    When the user POSTs to "/api/v1/ifc/files/house-001/materials" with:
      """
      { "name": "Timber Flooring", "category": "Finish" }
      """
    Then the response code is 201
    And the user saves response field "materialId" as "timber-flooring-mat-id"
    When the user POSTs to "/api/v1/ifc/files/house-001/materials" with:
      """
      { "name": "Granite", "category": "Finish" }
      """
    Then the response code is 201
    And the user saves response field "materialId" as "granite-mat-id"
    When the user POSTs to "/api/v1/ifc/files/house-001/materials" with:
      """
      { "name": "Ceramic", "category": "Finish" }
      """
    Then the response code is 201
    And the user saves response field "materialId" as "ceramic-mat-id"
    When the user POSTs to "/api/v1/ifc/files/house-001/materials" with:
      """
      { "name": "Stainless Steel", "category": "Metal" }
      """
    Then the response code is 201
    And the user saves response field "materialId" as "steel-mat-id"
    # Brick cavity wall on all external walls
    When the user PUTs to "/api/v1/ifc/files/house-001/elements/{wall-north-id}/material" with:
      """
      { "layers": [{ "materialName": "Brick", "thickness": 102.5 }, { "materialName": "Insulation Board", "thickness": 100 }, { "materialName": "Plasterboard", "thickness": 12.5 }] }
      """
    Then the response code is 200
    And the response data contains "assignmentType": "IfcMaterialLayerSetUsage"
    When the user PUTs to "/api/v1/ifc/files/house-001/elements/{wall-south-id}/material" with:
      """
      { "layers": [{ "materialName": "Brick", "thickness": 102.5 }, { "materialName": "Insulation Board", "thickness": 100 }, { "materialName": "Plasterboard", "thickness": 12.5 }] }
      """
    Then the response code is 200
    When the user PUTs to "/api/v1/ifc/files/house-001/elements/{wall-east-id}/material" with:
      """
      { "layers": [{ "materialName": "Brick", "thickness": 102.5 }, { "materialName": "Insulation Board", "thickness": 100 }, { "materialName": "Plasterboard", "thickness": 12.5 }] }
      """
    Then the response code is 200
    When the user PUTs to "/api/v1/ifc/files/house-001/elements/{wall-west-id}/material" with:
      """
      { "layers": [{ "materialName": "Brick", "thickness": 102.5 }, { "materialName": "Insulation Board", "thickness": 100 }, { "materialName": "Plasterboard", "thickness": 12.5 }] }
      """
    Then the response code is 200
    # Timber stud partition on all interior walls
    When the user PUTs to "/api/v1/ifc/files/house-001/elements/{corridor-south-id}/material" with:
      """
      { "layers": [{ "materialName": "Plasterboard", "thickness": 12.5 }, { "materialName": "Timber Frame", "thickness": 75 }, { "materialName": "Plasterboard", "thickness": 12.5 }] }
      """
    Then the response code is 200
    When the user PUTs to "/api/v1/ifc/files/house-001/elements/{corridor-north-id}/material" with:
      """
      { "layers": [{ "materialName": "Plasterboard", "thickness": 12.5 }, { "materialName": "Timber Frame", "thickness": 75 }, { "materialName": "Plasterboard", "thickness": 12.5 }] }
      """
    Then the response code is 200
    When the user PUTs to "/api/v1/ifc/files/house-001/elements/{part-open-bed2-id}/material" with:
      """
      { "layers": [{ "materialName": "Plasterboard", "thickness": 12.5 }, { "materialName": "Timber Frame", "thickness": 75 }, { "materialName": "Plasterboard", "thickness": 12.5 }] }
      """
    Then the response code is 200
    When the user PUTs to "/api/v1/ifc/files/house-001/elements/{part-bed1-bed3-id}/material" with:
      """
      { "layers": [{ "materialName": "Plasterboard", "thickness": 12.5 }, { "materialName": "Timber Frame", "thickness": 75 }, { "materialName": "Plasterboard", "thickness": 12.5 }] }
      """
    Then the response code is 200
    When the user PUTs to "/api/v1/ifc/files/house-001/elements/{part-bed3-bath-id}/material" with:
      """
      { "layers": [{ "materialName": "Plasterboard", "thickness": 12.5 }, { "materialName": "Timber Frame", "thickness": 75 }, { "materialName": "Plasterboard", "thickness": 12.5 }] }
      """
    Then the response code is 200
    # Timber flooring on slab
    When the user PUTs to "/api/v1/ifc/files/house-001/elements/{slab-id}/material" with:
      """
      { "materialId": "{timber-flooring-mat-id}" }
      """
    Then the response code is 200

    # ─── Kitchen fixtures (open plan, X=4000–6200 Y=3200–4800) ───
    # Kitchen bench/counter: 2.2m × 0.6m × 0.9m
    When the user POSTs to "/api/v1/ifc/files/house-001/elements" with:
      """
      { "ifcType": "IfcFurnishingElement", "name": "Kitchen Bench", "storeyGlobalId": "{ground-floor-id}" }
      """
    Then the response code is 201
    And the user saves response field "globalId" as "kitchen-bench-id"
    When the user PATCHes "/api/v1/ifc/files/house-001/elements/{kitchen-bench-id}/placement" with:
      """
      { "location": { "x": 5100, "y": 4700, "z": 0 }, "axis": { "x": 0, "y": 0, "z": 1 }, "refDirection": { "x": 1, "y": 0, "z": 0 } }
      """
    Then the response code is 200
    When the user PUTs to "/api/v1/ifc/files/house-001/elements/{kitchen-bench-id}/geometry" with:
      """
      { "representations": [{ "representationType": "SweptSolid", "items": [{ "type": "IfcExtrudedAreaSolid", "depth": 900, "direction": { "x": 0, "y": 0, "z": 1 }, "profile": { "type": "IfcRectangleProfileDef", "xDim": 2200, "yDim": 600 } }] }] }
      """
    Then the response code is 200
    When the user PUTs to "/api/v1/ifc/files/house-001/elements/{kitchen-bench-id}/material" with:
      """
      { "materialId": "{granite-mat-id}" }
      """
    Then the response code is 200
    # Cooktop: 0.6m × 0.6m × 0.05m on top of bench
    When the user POSTs to "/api/v1/ifc/files/house-001/elements" with:
      """
      { "ifcType": "IfcFurnishingElement", "name": "Cooktop", "storeyGlobalId": "{ground-floor-id}" }
      """
    Then the response code is 201
    And the user saves response field "globalId" as "cooktop-id"
    When the user PATCHes "/api/v1/ifc/files/house-001/elements/{cooktop-id}/placement" with:
      """
      { "location": { "x": 4600, "y": 4700, "z": 900 }, "axis": { "x": 0, "y": 0, "z": 1 }, "refDirection": { "x": 1, "y": 0, "z": 0 } }
      """
    Then the response code is 200
    When the user PUTs to "/api/v1/ifc/files/house-001/elements/{cooktop-id}/geometry" with:
      """
      { "representations": [{ "representationType": "SweptSolid", "items": [{ "type": "IfcExtrudedAreaSolid", "depth": 50, "direction": { "x": 0, "y": 0, "z": 1 }, "profile": { "type": "IfcRectangleProfileDef", "xDim": 600, "yDim": 600 } }] }] }
      """
    Then the response code is 200
    When the user PUTs to "/api/v1/ifc/files/house-001/elements/{cooktop-id}/material" with:
      """
      { "materialId": "{steel-mat-id}" }
      """
    Then the response code is 200
    # Fridge: 0.7m × 0.7m × 1.8m
    When the user POSTs to "/api/v1/ifc/files/house-001/elements" with:
      """
      { "ifcType": "IfcFurnishingElement", "name": "Fridge", "storeyGlobalId": "{ground-floor-id}" }
      """
    Then the response code is 201
    And the user saves response field "globalId" as "fridge-id"
    When the user PATCHes "/api/v1/ifc/files/house-001/elements/{fridge-id}/placement" with:
      """
      { "location": { "x": 6200, "y": 4650, "z": 0 }, "axis": { "x": 0, "y": 0, "z": 1 }, "refDirection": { "x": 1, "y": 0, "z": 0 } }
      """
    Then the response code is 200
    When the user PUTs to "/api/v1/ifc/files/house-001/elements/{fridge-id}/geometry" with:
      """
      { "representations": [{ "representationType": "SweptSolid", "items": [{ "type": "IfcExtrudedAreaSolid", "depth": 1800, "direction": { "x": 0, "y": 0, "z": 1 }, "profile": { "type": "IfcRectangleProfileDef", "xDim": 700, "yDim": 700 } }] }] }
      """
    Then the response code is 200
    When the user PUTs to "/api/v1/ifc/files/house-001/elements/{fridge-id}/material" with:
      """
      { "materialId": "{steel-mat-id}" }
      """
    Then the response code is 200
    # Kitchen sink: 0.5m × 0.4m × 0.2m on bench
    When the user POSTs to "/api/v1/ifc/files/house-001/elements" with:
      """
      { "ifcType": "IfcFurnishingElement", "name": "Kitchen Sink", "storeyGlobalId": "{ground-floor-id}" }
      """
    Then the response code is 201
    And the user saves response field "globalId" as "kitchen-sink-id"
    When the user PATCHes "/api/v1/ifc/files/house-001/elements/{kitchen-sink-id}/placement" with:
      """
      { "location": { "x": 5500, "y": 4700, "z": 900 }, "axis": { "x": 0, "y": 0, "z": 1 }, "refDirection": { "x": 1, "y": 0, "z": 0 } }
      """
    Then the response code is 200
    When the user PUTs to "/api/v1/ifc/files/house-001/elements/{kitchen-sink-id}/geometry" with:
      """
      { "representations": [{ "representationType": "SweptSolid", "items": [{ "type": "IfcExtrudedAreaSolid", "depth": 200, "direction": { "x": 0, "y": 0, "z": 1 }, "profile": { "type": "IfcRectangleProfileDef", "xDim": 500, "yDim": 400 } }] }] }
      """
    Then the response code is 200
    When the user PUTs to "/api/v1/ifc/files/house-001/elements/{kitchen-sink-id}/material" with:
      """
      { "materialId": "{steel-mat-id}" }
      """
    Then the response code is 200

    # ─── Bathroom fixtures (X=6700–9800 Y=200–1800) ───
    # Toilet: 0.4m × 0.7m × 0.45m
    When the user POSTs to "/api/v1/ifc/files/house-001/elements" with:
      """
      { "ifcType": "IfcFurnishingElement", "name": "Toilet", "storeyGlobalId": "{ground-floor-id}" }
      """
    Then the response code is 201
    And the user saves response field "globalId" as "toilet-id"
    When the user PATCHes "/api/v1/ifc/files/house-001/elements/{toilet-id}/placement" with:
      """
      { "location": { "x": 9500, "y": 500, "z": 0 }, "axis": { "x": 0, "y": 0, "z": 1 }, "refDirection": { "x": 1, "y": 0, "z": 0 } }
      """
    Then the response code is 200
    When the user PUTs to "/api/v1/ifc/files/house-001/elements/{toilet-id}/geometry" with:
      """
      { "representations": [{ "representationType": "SweptSolid", "items": [{ "type": "IfcExtrudedAreaSolid", "depth": 450, "direction": { "x": 0, "y": 0, "z": 1 }, "profile": { "type": "IfcRectangleProfileDef", "xDim": 400, "yDim": 700 } }] }] }
      """
    Then the response code is 200
    When the user PUTs to "/api/v1/ifc/files/house-001/elements/{toilet-id}/material" with:
      """
      { "materialId": "{ceramic-mat-id}" }
      """
    Then the response code is 200
    # Vanity unit: 0.6m × 0.5m × 0.85m (floor-standing cabinet + basin on top)
    When the user POSTs to "/api/v1/ifc/files/house-001/elements" with:
      """
      { "ifcType": "IfcFurnishingElement", "name": "Bathroom Vanity", "storeyGlobalId": "{ground-floor-id}" }
      """
    Then the response code is 201
    And the user saves response field "globalId" as "vanity-id"
    When the user PATCHes "/api/v1/ifc/files/house-001/elements/{vanity-id}/placement" with:
      """
      { "location": { "x": 8200, "y": 450, "z": 0 }, "axis": { "x": 0, "y": 0, "z": 1 }, "refDirection": { "x": 1, "y": 0, "z": 0 } }
      """
    Then the response code is 200
    When the user PUTs to "/api/v1/ifc/files/house-001/elements/{vanity-id}/geometry" with:
      """
      { "representations": [{ "representationType": "SweptSolid", "items": [{ "type": "IfcExtrudedAreaSolid", "depth": 850, "direction": { "x": 0, "y": 0, "z": 1 }, "profile": { "type": "IfcRectangleProfileDef", "xDim": 600, "yDim": 500 } }] }] }
      """
    Then the response code is 200
    When the user PUTs to "/api/v1/ifc/files/house-001/elements/{vanity-id}/material" with:
      """
      { "materialId": "{ceramic-mat-id}" }
      """
    Then the response code is 200
    # Shower enclosure: 0.9m × 0.9m × 2.1m (full height glass enclosure)
    When the user POSTs to "/api/v1/ifc/files/house-001/elements" with:
      """
      { "ifcType": "IfcFurnishingElement", "name": "Shower Enclosure", "storeyGlobalId": "{ground-floor-id}" }
      """
    Then the response code is 201
    And the user saves response field "globalId" as "shower-id"
    When the user PATCHes "/api/v1/ifc/files/house-001/elements/{shower-id}/placement" with:
      """
      { "location": { "x": 7100, "y": 650, "z": 0 }, "axis": { "x": 0, "y": 0, "z": 1 }, "refDirection": { "x": 1, "y": 0, "z": 0 } }
      """
    Then the response code is 200
    When the user PUTs to "/api/v1/ifc/files/house-001/elements/{shower-id}/geometry" with:
      """
      { "representations": [{ "representationType": "SweptSolid", "items": [{ "type": "IfcExtrudedAreaSolid", "depth": 2100, "direction": { "x": 0, "y": 0, "z": 1 }, "profile": { "type": "IfcRectangleProfileDef", "xDim": 900, "yDim": 900 } }] }] }
      """
    Then the response code is 200
    When the user PUTs to "/api/v1/ifc/files/house-001/elements/{shower-id}/material" with:
      """
      { "materialId": "{ceramic-mat-id}" }
      """
    Then the response code is 200

    # ─── Property sets ────────────────────────────
    When the user POSTs to "/api/v1/ifc/files/house-001/elements/{wall-north-id}/property-sets" with:
      """
      {
        "name": "Pset_WallCommon",
        "properties": [
          { "name": "FireRating", "type": "IfcLabel", "value": "REI 60" },
          { "name": "IsExternal", "type": "IfcBoolean", "value": true },
          { "name": "ThermalTransmittance", "type": "IfcReal", "value": 0.18 }
        ]
      }
      """
    Then the response code is 201
    And the response data contains "name": "Pset_WallCommon"
    When the user GETs "/api/v1/ifc/files/house-001/elements/{wall-north-id}/property-sets/Pset_WallCommon"
    Then the response code is 200
    And the response data has property "FireRating" with value "REI 60"
    And the response data has property "IsExternal" with value "true"

    # ─── Classification system & reference ────────
    When the user POSTs to "/api/v1/ifc/files/house-001/classifications" with:
      """
      { "name": "Uniclass 2015", "source": "https://www.thenbs.com/our-tools/uniclass-2015", "edition": "2015 v1.31" }
      """
    Then the response code is 201
    And the response data contains "name": "Uniclass 2015"
    And the user saves response field "systemId" as "uniclass-system-id"
    When the user POSTs to "/api/v1/ifc/files/house-001/elements/{wall-north-id}/classifications" with:
      """
      { "systemId": "{uniclass-system-id}", "notation": "Ss_25_10_30", "name": "Masonry wall systems" }
      """
    Then the response code is 201
    And the response data contains "notation": "Ss_25_10_30"

    # ─── Verification: spatial structure ──────────
    When the user GETs "/api/v1/ifc/files/house-001/spatial-structure"
    Then the response code is 200
    And the spatial structure includes a storey named "Ground Floor"
    And the spatial structure includes a storey named "First Floor"

    # ─── Verification: element listing ────────────
    When the user GETs "/api/v1/ifc/files/house-001/elements"
    Then the response code is 200
    And the elements list includes "External Wall - North"
    And the elements list includes "External Wall - South"
    And the elements list includes "Corridor Wall - South"
    And the elements list includes "Corridor Wall - North"
    And the elements list includes "Partition - Open Plan/Bed2"
    And the elements list includes "Partition - Bed1/Bed3"
    And the elements list includes "Partition - Bed3/Bathroom"
    And the elements list includes "Arch Beam"
    And the elements list includes "Ground Floor Slab"
    And the elements list includes "Front Door"
    And the elements list includes "Bathroom Door"
    And the elements list includes "Living Area Window"
    And the elements list includes "Kitchen Window"
    And the elements list includes "Bathroom Window"
    And the elements list includes "Kitchen Bench"
    And the elements list includes "Cooktop"
    And the elements list includes "Fridge"
    And the elements list includes "Toilet"
    And the elements list includes "Bathroom Vanity"
    And the elements list includes "Shower Enclosure"

    # ─── Verification: version history ────────────
    When the user GETs "/api/v1/ifc/files/house-001/versions"
    Then the response code is 200
    And the versions list has more than 1 entry

    # ─── Export: download IFC file ────────────────
    When the user exports "/api/v1/ifc/files/house-001/export?format=ifc"
    Then the response code is 200
    And the exported file is saved to "output/house-plan.ifc"
