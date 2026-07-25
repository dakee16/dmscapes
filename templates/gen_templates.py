#!/usr/bin/env python3
"""Generate + validate Dormscape layout templates.

Coordinate convention (documented in templates/README.md):
- Origin (0,0) = top-left corner of the room, units = feet.
- x runs along the room's LENGTH (left->right), y along its WIDTH (top->bottom).
- rotation_deg 0: width_ft spans x, length_ft spans y.
- rotation_deg 90: length_ft spans x, width_ft spans y.
- (x_ft, y_ft) is always the top-left of the item's axis-aligned footprint.

Validation layers (generator-internal, not written to JSON):
- solid: floor furniture; must not overlap other solids, must stay out of the
  door clearance zone.
- flat: rugs; floor layer, things may sit on them.
- wall: wall-mounted (lights, decor, mirror, power strip); must hug a wall.
- on:<id>: must be fully inside the referenced item's footprint
  (pillows/bins on or under a bed, lamp on a desk).
"""
import json, math, os, sys

OUT = os.path.dirname(os.path.abspath(__file__))

BED_W, BED_L = 3.17, 6.67          # Twin XL footprint
DESK_W, DESK_L = 3.5, 2.0
CHAIR = 1.5
DRESSER_W, DRESSER_L = 2.5, 2.0

COLOR = {
    "bed": "bed", "desk": "desk", "desk_chair": "desk", "dresser": "dresser",
    "rug": "rug", "desk_lamp": "lighting", "string_lights": "lighting",
    "wall_decor": "decor", "storage_bins": "storage", "throw_pillows": "decor",
    "trash_can": "storage", "power_strip": "lighting", "mirror": "decor",
    "laundry_hamper": "storage",
}
PRODUCT = {
    "rug": "rug", "desk_lamp": "desk-lamp", "string_lights": "string-lights",
    "wall_decor": "wall-decor", "storage_bins": "storage-bins",
    "throw_pillows": "throw-pillows", "trash_can": "trash-can",
    "power_strip": "power-strip", "mirror": "mirror",
    "laundry_hamper": "laundry-hamper",
}
BUILT_IN_TYPES = {"bed", "desk", "desk_chair", "dresser"}


def F(id, type, label, owner, x, y, w, l, rot=0, layer="solid", ref=None):
    built_in = type in BUILT_IN_TYPES
    item = {
        "id": id, "type": type, "label": label, "owner": owner,
        "x_ft": x, "y_ft": y, "width_ft": w, "length_ft": l,
        "rotation_deg": rot, "movable": True, "built_in": built_in,
        "color_category": COLOR[type],
    }
    if not built_in:
        item["product_category"] = PRODUCT[type]
    return {"item": item, "layer": layer, "ref": ref}


def rect(it):
    i = it["item"]
    w, l = i["width_ft"], i["length_ft"]
    dx, dy = (w, l) if i["rotation_deg"] == 0 else (l, w)
    return (i["x_ft"], i["y_ft"], i["x_ft"] + dx, i["y_ft"] + dy)


def overlap(a, b, eps=1e-6):
    return a[0] < b[2] - eps and b[0] < a[2] - eps and \
           a[1] < b[3] - eps and b[1] < a[3] - eps


def inside(inner, outer, eps=1e-6):
    return inner[0] >= outer[0] - eps and inner[1] >= outer[1] - eps and \
           inner[2] <= outer[2] + eps and inner[3] <= outer[3] + eps


def validate(t, L, W, door, items):
    errs = []
    room = (0, 0, L, W)
    by_id = {it["item"]["id"]: it for it in items}
    solids = [it for it in items if it["layer"] == "solid"]
    for it in items:
        i, r = it["item"], rect(it)
        if not inside(r, room):
            errs.append(f"{i['id']}: out of bounds {r} room {L}x{W}")
        if it["layer"] == "wall":
            d = min(r[0], r[1], L - r[2], W - r[3])
            if d > 0.35:
                errs.append(f"{i['id']}: wall item not against a wall (gap {d:.2f})")
        if it["ref"]:
            host = by_id.get(it["ref"])
            if host is None:
                errs.append(f"{i['id']}: ref {it['ref']} missing")
            elif not inside(r, rect(host)):
                errs.append(f"{i['id']}: not inside {it['ref']} {r} vs {rect(host)}")
    for a in range(len(solids)):
        for b in range(a + 1, len(solids)):
            if overlap(rect(solids[a]), rect(solids[b])):
                errs.append(f"OVERLAP {solids[a]['item']['id']} x "
                            f"{solids[b]['item']['id']} "
                            f"{rect(solids[a])} vs {rect(solids[b])}")
    dz = (door[0], door[1], door[0] + door[2], door[1] + door[3])
    for s in solids:
        if overlap(rect(s), dz):
            errs.append(f"{s['item']['id']}: intrudes door zone {rect(s)} vs {dz}")
    con = t["room_constraints"]
    if not (con["min_length_ft"] <= L <= con["max_length_ft"] and
            con["min_width_ft"] <= W <= con["max_width_ft"]):
        errs.append(f"nominal {L}x{W} outside own constraints")
    return errs


def template(tid, name, desc, con, L, W, door, items):
    t = {
        "template_id": tid, "name": name, "description": desc,
        "room_constraints": con,
        "furniture": [it["item"] for it in items],
    }
    errs = validate(t, L, W, door, items)
    return t, errs, (L, W, door, items)


def con(minL, maxL, minW, maxW, occ, types):
    return {"min_length_ft": minL, "max_length_ft": maxL,
            "min_width_ft": minW, "max_width_ft": maxW,
            "occupants": occ, "room_types": types}


TEMPLATES = []

# ---------------------------------------------------------------- T1 15x12
TEMPLATES.append(template(
    "standard-double-15x12-v1", "Standard Double — Parallel Beds",
    "Two beds on opposite long walls, both desks under the window on the "
    "right wall, rug in the center walkway. Authored for a 15 x 12 ft room; "
    "assumes the door at the bottom of the left wall and the window centered "
    "on the right wall.",
    con(14, 16, 11, 13, 2, ["double"]), 15, 12, (0, 8.5, 3, 3.5), [
        F("bed-a", "bed", "Bed A", "A", 0.5, 0.5, BED_W, BED_L, 90),
        F("bed-b", "bed", "Bed B", "B", 3.8, 8.33, BED_W, BED_L, 90),
        F("desk-a", "desk", "Desk A", "A", 12.5, 1.6, DESK_W, DESK_L, 90),
        F("desk-b", "desk", "Desk B", "B", 12.5, 6.0, DESK_W, DESK_L, 90),
        F("chair-a", "desk_chair", "Desk Chair A", "A", 10.8, 2.9, CHAIR, CHAIR),
        F("chair-b", "desk_chair", "Desk Chair B", "B", 10.8, 7.0, CHAIR, CHAIR),
        F("dresser-a", "dresser", "Dresser A", "A", 0.5, 4.2, DRESSER_W, DRESSER_L, 90),
        F("dresser-b", "dresser", "Dresser B", "B", 10.9, 9.6, DRESSER_W, DRESSER_L, 0),
        F("rug", "rug", "Area Rug", "shared", 4.0, 4.1, 6, 4, 0, "flat"),
        F("lamp-a", "desk_lamp", "Desk Lamp A", "A", 13.3, 2.0, 0.5, 0.5, 0, "on", "desk-a"),
        F("lamp-b", "desk_lamp", "Desk Lamp B", "B", 13.3, 7.3, 0.5, 0.5, 0, "on", "desk-b"),
        F("string-lights", "string_lights", "String Lights", "shared", 0.7, 0.05, 6, 0.15, 0, "wall"),
        F("wall-decor", "wall_decor", "Wall Decor / Tapestry", "shared", 5.2, 11.8, 3, 0.15, 0, "wall"),
        F("pillows-a", "throw_pillows", "Throw Pillows A", "A", 0.8, 1.4, 1.5, 1, 0, "on", "bed-a"),
        F("pillows-b", "throw_pillows", "Throw Pillows B", "B", 4.1, 9.5, 1.5, 1, 0, "on", "bed-b"),
        F("bins-a", "storage_bins", "Under-Bed Storage Bins A", "A", 4.5, 1.1, 2, 1.5, 0, "on", "bed-a"),
        F("bins-b", "storage_bins", "Under-Bed Storage Bins B", "B", 7.5, 9.3, 2, 1.5, 0, "on", "bed-b"),
        F("trash", "trash_can", "Trash Can", "shared", 13.9, 0.5, 1, 1),
        F("power-strip", "power_strip", "Power Strip", "shared", 14.75, 3.4, 1, 0.25, 90, "wall"),
        F("mirror", "mirror", "Wall Mirror", "shared", 0.05, 7.0, 1.5, 0.15, 90, "wall"),
        F("hamper-a", "laundry_hamper", "Laundry Hamper A", "A", 0.6, 6.9, 1.5, 1.5),
        F("hamper-b", "laundry_hamper", "Laundry Hamper B", "B", 13.45, 10.45, 1.5, 1.5),
    ]))

# ---------------------------------------------------------------- T2 12x11
TEMPLATES.append(template(
    "compact-square-double-12x11-v1", "Compact Square Double — L-Shaped Beds",
    "L-shaped bed arrangement: Bed A along the top wall, Bed B along the "
    "right wall, desks tucked into the remaining corners, dressers by the "
    "door. Authored for a 12 x 11 ft room; assumes the door at the bottom of "
    "the left wall and the window high on the right wall.",
    con(11.5, 13, 10.5, 12, 2, ["double"]), 12, 11, (0, 8, 3, 3), [
        F("bed-a", "bed", "Bed A", "A", 0.5, 0.5, BED_W, BED_L, 90),
        F("bed-b", "bed", "Bed B", "B", 8.33, 4.3, BED_W, BED_L, 0),
        F("desk-a", "desk", "Desk A", "A", 0.5, 4.1, DESK_W, DESK_L, 90),
        F("desk-b", "desk", "Desk B", "B", 7.6, 0.5, DESK_W, DESK_L, 0),
        F("chair-a", "desk_chair", "Desk Chair A", "A", 2.7, 5.1, CHAIR, CHAIR),
        F("chair-b", "desk_chair", "Desk Chair B", "B", 8.5, 2.6, CHAIR, CHAIR),
        F("dresser-a", "dresser", "Dresser A", "A", 3.1, 9.0, DRESSER_W, DRESSER_L, 0),
        F("dresser-b", "dresser", "Dresser B", "B", 5.7, 9.0, DRESSER_W, DRESSER_L, 0),
        F("rug", "rug", "Area Rug", "shared", 3.0, 4.3, 4.5, 4, 0, "flat"),
        F("lamp-a", "desk_lamp", "Desk Lamp A", "A", 1.2, 5.5, 0.5, 0.5, 0, "on", "desk-a"),
        F("lamp-b", "desk_lamp", "Desk Lamp B", "B", 9.5, 1.0, 0.5, 0.5, 0, "on", "desk-b"),
        F("string-lights", "string_lights", "String Lights", "shared", 0.6, 0.05, 6, 0.15, 0, "wall"),
        F("wall-decor", "wall_decor", "Wall Decor / Tapestry", "shared", 11.85, 0.8, 3, 0.15, 90, "wall"),
        F("pillows-a", "throw_pillows", "Throw Pillows A", "A", 0.7, 1.4, 1.5, 1, 0, "on", "bed-a"),
        F("pillows-b", "throw_pillows", "Throw Pillows B", "B", 8.6, 4.6, 1.5, 1, 0, "on", "bed-b"),
        F("bins-a", "storage_bins", "Under-Bed Storage Bins A", "A", 3.5, 1.2, 2, 1.5, 0, "on", "bed-a"),
        F("bins-b", "storage_bins", "Under-Bed Storage Bins B", "B", 9.0, 7.5, 1.5, 2, 0, "on", "bed-b"),
        F("trash", "trash_can", "Trash Can", "shared", 2.8, 6.9, 1, 1),
        F("power-strip", "power_strip", "Power Strip", "shared", 8.0, 0.1, 1, 0.25, 0, "wall"),
        F("mirror", "mirror", "Over-Door Mirror", "shared", 0.05, 9.2, 1.5, 0.15, 90, "wall"),
        F("hamper", "laundry_hamper", "Collapsible Laundry Hamper", "shared", 5.4, 4.1, 1.5, 1.5),
    ]))

# ---------------------------------------------------------------- T3 17x10.5
TEMPLATES.append(template(
    "long-double-17x10-v1", "Long Double — Beds Along One Wall",
    "Longer, narrower room: both beds head-to-head along the top wall with a "
    "shared dresser between them, Desk A on the bottom wall and Desk B under "
    "the window. Authored for a 17 x 10.5 ft room; assumes the door at the "
    "bottom of the left wall and the window on the right wall.",
    con(16, 18, 9.5, 11.5, 2, ["double"]), 17, 10.5, (0, 7.5, 3, 3), [
        F("bed-a", "bed", "Bed A", "A", 0.5, 0.5, BED_W, BED_L, 90),
        F("bed-b", "bed", "Bed B", "B", 9.5, 0.5, BED_W, BED_L, 90),
        F("dresser-a", "dresser", "Dresser A (between beds)", "A", 7.4, 0.5, DRESSER_W, DRESSER_L, 90),
        F("dresser-b", "dresser", "Dresser B", "B", 15.0, 4.2, DRESSER_W, DRESSER_L, 90),
        F("desk-a", "desk", "Desk A", "A", 3.6, 8.4, DESK_W, DESK_L, 0),
        F("desk-b", "desk", "Desk B", "B", 15.0, 6.9, DESK_W, DESK_L, 90),
        F("chair-a", "desk_chair", "Desk Chair A", "A", 4.4, 6.8, CHAIR, CHAIR),
        F("chair-b", "desk_chair", "Desk Chair B", "B", 13.3, 7.9, CHAIR, CHAIR),
        F("rug", "rug", "Runner Rug", "shared", 4.0, 4.2, 7, 2.6, 0, "flat"),
        F("lamp-a", "desk_lamp", "Desk Lamp A", "A", 4.4, 9.0, 0.5, 0.5, 0, "on", "desk-a"),
        F("lamp-b", "desk_lamp", "Desk Lamp B", "B", 15.6, 7.5, 0.5, 0.5, 0, "on", "desk-b"),
        F("string-lights", "string_lights", "String Lights", "shared", 1.0, 0.05, 8, 0.15, 0, "wall"),
        F("wall-decor", "wall_decor", "Wall Decor / Tapestry", "shared", 8.0, 10.3, 3, 0.15, 0, "wall"),
        F("pillows-a", "throw_pillows", "Throw Pillows A", "A", 5.3, 1.5, 1.5, 1, 0, "on", "bed-a"),
        F("pillows-b", "throw_pillows", "Throw Pillows B", "B", 9.8, 1.5, 1.5, 1, 0, "on", "bed-b"),
        F("bins-a", "storage_bins", "Under-Bed Storage Bins A", "A", 1.5, 1.2, 2, 1.5, 0, "on", "bed-a"),
        F("bins-b", "storage_bins", "Under-Bed Storage Bins B", "B", 13.5, 1.2, 2, 1.5, 0, "on", "bed-b"),
        F("trash", "trash_can", "Trash Can", "shared", 12.0, 9.4, 1, 1),
        F("power-strip", "power_strip", "Power Strip", "shared", 4.5, 10.3, 1, 0.2, 0, "wall"),
        F("mirror", "mirror", "Wall Mirror", "shared", 0.05, 4.5, 1.5, 0.15, 90, "wall"),
        F("hamper-a", "laundry_hamper", "Laundry Hamper A", "A", 0.5, 4.2, 1.5, 1.5),
        F("hamper-b", "laundry_hamper", "Laundry Hamper B", "B", 13.4, 4.2, 1.5, 1.5),
    ]))

# ---------------------------------------------------------------- T4 11x8.8
TEMPLATES.append(template(
    "small-single-11x9-v1", "Small Single — Bed and Desk Opposite",
    "Single room: bed along the top wall, desk under the window on the right "
    "wall, dresser opposite the bed. Authored for an 11 x 8.8 ft room; "
    "assumes the door at the bottom of the left wall and the window on the "
    "right wall.",
    con(10, 12.5, 8, 10, 1, ["single"]), 11, 8.8, (0, 5.8, 3, 3), [
        F("bed", "bed", "Bed", "A", 0.5, 0.5, BED_W, BED_L, 90),
        F("desk", "desk", "Desk", "A", 9.0, 3.9, DESK_W, DESK_L, 90),
        F("chair", "desk_chair", "Desk Chair", "A", 7.4, 5.0, CHAIR, CHAIR),
        F("dresser", "dresser", "Dresser", "A", 3.3, 6.7, DRESSER_W, DRESSER_L, 0),
        F("rug", "rug", "Area Rug", "A", 2.0, 4.0, 4, 2.5, 0, "flat"),
        F("lamp", "desk_lamp", "Desk Lamp", "A", 9.6, 4.4, 0.5, 0.5, 0, "on", "desk"),
        F("string-lights", "string_lights", "String Lights", "A", 0.7, 0.05, 6, 0.15, 0, "wall"),
        F("wall-decor", "wall_decor", "Wall Decor / Tapestry", "A", 10.85, 0.8, 3, 0.15, 90, "wall"),
        F("pillows", "throw_pillows", "Throw Pillows", "A", 0.7, 1.4, 1.5, 1, 0, "on", "bed"),
        F("bins", "storage_bins", "Under-Bed Storage Bins", "A", 3.0, 1.2, 2, 1.5, 0, "on", "bed"),
        F("trash", "trash_can", "Trash Can", "A", 9.3, 7.6, 1, 1),
        F("power-strip", "power_strip", "Power Strip", "A", 10.75, 2.9, 1, 0.25, 90, "wall"),
        F("mirror", "mirror", "Over-Door Mirror", "A", 0.05, 6.2, 1.5, 0.15, 90, "wall"),
        F("hamper", "laundry_hamper", "Laundry Hamper", "A", 5.9, 6.9, 1.5, 1.5),
    ]))

# ---------------------------------------------------------------- T5 12.4x10
TEMPLATES.append(template(
    "compact-double-bunked-12x10-v1", "Compact Double — Bunked Beds",
    "Tight double: beds bunked into a single footprint on the top-left wall "
    "(A lower, B upper), freeing the floor for two desks stacked along the "
    "window wall and dressers by the door. Authored for a 12.4 x 10 ft room; "
    "assumes the door at the bottom of the left wall and the window on the "
    "right wall.",
    con(11.5, 13.5, 9, 10.4, 2, ["double"]), 12.4, 10, (0, 7, 3, 3), [
        F("bed-bunk", "bed", "Bunked Beds (A lower, B upper)", "shared", 0.5, 0.5, BED_W, BED_L, 90),
        F("desk-a", "desk", "Desk A", "A", 10.4, 0.6, DESK_W, DESK_L, 90),
        F("desk-b", "desk", "Desk B", "B", 10.4, 4.6, DESK_W, DESK_L, 90),
        F("chair-a", "desk_chair", "Desk Chair A", "A", 8.7, 1.8, CHAIR, CHAIR),
        F("chair-b", "desk_chair", "Desk Chair B", "B", 8.7, 5.9, CHAIR, CHAIR),
        F("dresser-a", "dresser", "Dresser A", "A", 3.3, 8.0, DRESSER_W, DRESSER_L, 0),
        F("dresser-b", "dresser", "Dresser B", "B", 6.0, 8.0, DRESSER_W, DRESSER_L, 0),
        F("rug", "rug", "Area Rug", "shared", 3.2, 4.2, 4.5, 3.2, 0, "flat"),
        F("lamp-a", "desk_lamp", "Desk Lamp A", "A", 11.1, 1.0, 0.5, 0.5, 0, "on", "desk-a"),
        F("lamp-b", "desk_lamp", "Desk Lamp B", "B", 11.1, 5.0, 0.5, 0.5, 0, "on", "desk-b"),
        F("string-lights", "string_lights", "String Lights", "shared", 0.8, 0.05, 6, 0.15, 0, "wall"),
        F("wall-decor", "wall_decor", "Wall Decor / Tapestry", "shared", 0.05, 4.2, 3, 0.15, 90, "wall"),
        F("pillows", "throw_pillows", "Throw Pillows (lower bunk)", "A", 0.8, 1.4, 1.5, 1, 0, "on", "bed-bunk"),
        F("bins", "storage_bins", "Under-Bed Storage Bins", "shared", 3.5, 1.2, 2, 1.5, 0, "on", "bed-bunk"),
        F("trash", "trash_can", "Trash Can", "shared", 9.0, 8.7, 1, 1),
        F("power-strip", "power_strip", "Power Strip", "shared", 12.15, 4.25, 1, 0.25, 90, "wall"),
        F("mirror", "mirror", "Over-Door Mirror", "shared", 0.05, 7.4, 1.5, 0.15, 90, "wall"),
        F("hamper", "laundry_hamper", "Collapsible Laundry Hamper", "shared", 10.3, 8.4, 1.5, 1.5),
    ]))

# ---------------------------------------------------------------- T6 16x15
TEMPLATES.append(template(
    "large-square-double-16x15-v1", "Large Square Double — Open Center",
    "Spacious near-square double: parallel beds on the top and bottom walls, "
    "desks under the window, large open rug in the middle with extra wall "
    "decor. Authored for a 16 x 15 ft room; assumes the door at the bottom "
    "of the left wall and the window on the right wall.",
    con(15, 17, 14, 16, 2, ["double"]), 16, 15, (0, 11.5, 3.5, 3.5), [
        F("bed-a", "bed", "Bed A", "A", 0.5, 0.5, BED_W, BED_L, 90),
        F("bed-b", "bed", "Bed B", "B", 3.9, 11.33, BED_W, BED_L, 90),
        F("desk-a", "desk", "Desk A", "A", 14.0, 2.0, DESK_W, DESK_L, 90),
        F("desk-b", "desk", "Desk B", "B", 14.0, 8.5, DESK_W, DESK_L, 90),
        F("chair-a", "desk_chair", "Desk Chair A", "A", 12.3, 3.2, CHAIR, CHAIR),
        F("chair-b", "desk_chair", "Desk Chair B", "B", 12.3, 9.7, CHAIR, CHAIR),
        F("dresser-a", "dresser", "Dresser A", "A", 0.5, 4.2, DRESSER_W, DRESSER_L, 90),
        F("dresser-b", "dresser", "Dresser B", "B", 11.0, 12.5, DRESSER_W, DRESSER_L, 0),
        F("rug", "rug", "Large Area Rug", "shared", 4.0, 4.5, 7, 5.5, 0, "flat"),
        F("lamp-a", "desk_lamp", "Desk Lamp A", "A", 14.7, 2.4, 0.5, 0.5, 0, "on", "desk-a"),
        F("lamp-b", "desk_lamp", "Desk Lamp B", "B", 14.7, 8.9, 0.5, 0.5, 0, "on", "desk-b"),
        F("string-lights", "string_lights", "String Lights", "shared", 0.8, 0.05, 7, 0.15, 0, "wall"),
        F("wall-decor-a", "wall_decor", "Wall Decor / Tapestry", "shared", 4.5, 14.8, 3, 0.15, 0, "wall"),
        F("wall-decor-b", "wall_decor", "Wall Decor (window wall)", "shared", 15.8, 6.0, 2.5, 0.15, 90, "wall"),
        F("pillows-a", "throw_pillows", "Throw Pillows A", "A", 0.7, 1.4, 1.5, 1, 0, "on", "bed-a"),
        F("pillows-b", "throw_pillows", "Throw Pillows B", "B", 4.1, 12.5, 1.5, 1, 0, "on", "bed-b"),
        F("bins-a", "storage_bins", "Under-Bed Storage Bins A", "A", 4.5, 1.1, 2, 1.5, 0, "on", "bed-a"),
        F("bins-b", "storage_bins", "Under-Bed Storage Bins B", "B", 7.5, 12.3, 2, 1.5, 0, "on", "bed-b"),
        F("trash", "trash_can", "Trash Can", "shared", 14.9, 6.4, 1, 1),
        F("power-strip", "power_strip", "Power Strip", "shared", 15.75, 3.0, 1, 0.25, 90, "wall"),
        F("mirror", "mirror", "Wall Mirror", "shared", 0.05, 7.2, 1.5, 0.15, 90, "wall"),
        F("hamper-a", "laundry_hamper", "Laundry Hamper A", "A", 0.6, 8.8, 1.5, 1.5),
        F("hamper-b", "laundry_hamper", "Laundry Hamper B", "B", 13.7, 12.7, 1.5, 1.5),
    ]))

# ---------------------------------------------------------------- T7 25x15
TEMPLATES.append(template(
    "suite-large-25x15-v1", "Suite-Style Large — Sleep + Living Zones",
    "Large suite-style room split into zones: sleeping zone on the left "
    "(both beds, dressers), study/living zone on the right (desks under the "
    "window, large living rug, storage cubes, full-length mirror). Authored "
    "for a 25 x 15 ft room; assumes the door at the bottom of the left wall "
    "and the window on the right wall.",
    con(22, 28, 13, 17, 2, ["double", "suite"]), 25, 15, (0, 11.5, 3.5, 3.5), [
        F("bed-a", "bed", "Bed A", "A", 0.5, 0.5, BED_W, BED_L, 90),
        F("bed-b", "bed", "Bed B", "B", 4.0, 11.33, BED_W, BED_L, 90),
        F("dresser-a", "dresser", "Dresser A", "A", 0.5, 4.5, DRESSER_W, DRESSER_L, 90),
        F("dresser-b", "dresser", "Dresser B", "B", 0.5, 7.3, DRESSER_W, DRESSER_L, 90),
        F("desk-a", "desk", "Desk A", "A", 23.0, 1.5, DESK_W, DESK_L, 90),
        F("desk-b", "desk", "Desk B", "B", 23.0, 10.0, DESK_W, DESK_L, 90),
        F("chair-a", "desk_chair", "Desk Chair A", "A", 21.3, 2.7, CHAIR, CHAIR),
        F("chair-b", "desk_chair", "Desk Chair B", "B", 21.3, 11.2, CHAIR, CHAIR),
        F("rug-sleep", "rug", "Bedside Rug (sleep zone)", "shared", 3.3, 4.4, 5, 4.5, 0, "flat"),
        F("rug-living", "rug", "Living Zone Rug", "shared", 14.5, 5.0, 7, 5, 0, "flat"),
        F("storage-cubes", "storage_bins", "Stackable Storage Cubes", "shared", 14.0, 12.9, 2, 1.5),
        F("lamp-a", "desk_lamp", "Desk Lamp A", "A", 23.6, 2.0, 0.5, 0.5, 0, "on", "desk-a"),
        F("lamp-b", "desk_lamp", "Desk Lamp B", "B", 23.6, 10.5, 0.5, 0.5, 0, "on", "desk-b"),
        F("string-lights-a", "string_lights", "String Lights (sleep zone)", "shared", 0.8, 0.05, 7, 0.15, 0, "wall"),
        F("string-lights-b", "string_lights", "LED Strip (living zone)", "shared", 15.0, 0.05, 8, 0.15, 0, "wall"),
        F("wall-decor-a", "wall_decor", "Wall Decor (sleep zone)", "shared", 8.5, 0.1, 3, 0.2, 0, "wall"),
        F("wall-decor-b", "wall_decor", "Wall Decor (living zone)", "shared", 16.5, 14.8, 3, 0.15, 0, "wall"),
        F("mirror", "mirror", "Full-Length Mirror", "shared", 11.5, 14.8, 1.5, 0.15, 0, "wall"),
        F("pillows-a", "throw_pillows", "Throw Pillows A", "A", 0.7, 1.4, 1.5, 1, 0, "on", "bed-a"),
        F("pillows-b", "throw_pillows", "Throw Pillows B", "B", 4.2, 12.5, 1.5, 1, 0, "on", "bed-b"),
        F("bins-a", "storage_bins", "Under-Bed Storage Bins A", "A", 4.5, 1.1, 2, 1.5, 0, "on", "bed-a"),
        F("bins-b", "storage_bins", "Under-Bed Storage Bins B", "B", 7.6, 12.3, 2, 1.5, 0, "on", "bed-b"),
        F("trash", "trash_can", "Trash Can", "shared", 23.9, 6.2, 1, 1),
        F("power-strip", "power_strip", "Power Strip", "shared", 24.75, 8.0, 1, 0.25, 90, "wall"),
        F("hamper-a", "laundry_hamper", "Laundry Hamper A", "A", 0.6, 9.9, 1.5, 1.5),
        F("hamper-b", "laundry_hamper", "Laundry Hamper B", "B", 11.2, 12.9, 1.5, 1.5),
    ]))

# ---------------------------------------------------------------- T8 18x13
TEMPLATES.append(template(
    "wide-double-18x13-v1", "Wide Double — Parallel Beds, Center Walkway",
    "Generous rectangle: parallel beds on the top and bottom walls with a "
    "wide center walkway, desks under the window on the right wall. Authored "
    "for an 18 x 13 ft room; assumes the door at the bottom of the left wall "
    "and the window on the right wall.",
    con(17, 19, 12, 14, 2, ["double"]), 18, 13, (0, 9.5, 3.5, 3.5), [
        F("bed-a", "bed", "Bed A", "A", 0.5, 0.5, BED_W, BED_L, 90),
        F("bed-b", "bed", "Bed B", "B", 3.9, 9.33, BED_W, BED_L, 90),
        F("desk-a", "desk", "Desk A", "A", 16.0, 1.8, DESK_W, DESK_L, 90),
        F("desk-b", "desk", "Desk B", "B", 16.0, 7.2, DESK_W, DESK_L, 90),
        F("chair-a", "desk_chair", "Desk Chair A", "A", 14.3, 3.0, CHAIR, CHAIR),
        F("chair-b", "desk_chair", "Desk Chair B", "B", 14.3, 8.4, CHAIR, CHAIR),
        F("dresser-a", "dresser", "Dresser A", "A", 0.5, 4.3, DRESSER_W, DRESSER_L, 90),
        F("dresser-b", "dresser", "Dresser B", "B", 11.0, 10.9, DRESSER_W, DRESSER_L, 0),
        F("rug", "rug", "Area Rug", "shared", 4.2, 4.2, 6.5, 4.5, 0, "flat"),
        F("lamp-a", "desk_lamp", "Desk Lamp A", "A", 16.7, 2.2, 0.5, 0.5, 0, "on", "desk-a"),
        F("lamp-b", "desk_lamp", "Desk Lamp B", "B", 16.7, 7.6, 0.5, 0.5, 0, "on", "desk-b"),
        F("string-lights", "string_lights", "String Lights", "shared", 0.8, 0.05, 7, 0.15, 0, "wall"),
        F("wall-decor", "wall_decor", "Wall Decor / Tapestry", "shared", 4.8, 12.8, 3, 0.15, 0, "wall"),
        F("pillows-a", "throw_pillows", "Throw Pillows A", "A", 0.7, 1.4, 1.5, 1, 0, "on", "bed-a"),
        F("pillows-b", "throw_pillows", "Throw Pillows B", "B", 4.2, 10.5, 1.5, 1, 0, "on", "bed-b"),
        F("bins-a", "storage_bins", "Under-Bed Storage Bins A", "A", 4.5, 1.1, 2, 1.5, 0, "on", "bed-a"),
        F("bins-b", "storage_bins", "Under-Bed Storage Bins B", "B", 7.5, 10.3, 2, 1.5, 0, "on", "bed-b"),
        F("trash", "trash_can", "Trash Can", "shared", 17.0, 5.9, 1, 1),
        F("power-strip", "power_strip", "Power Strip", "shared", 17.75, 2.2, 1, 0.25, 90, "wall"),
        F("mirror", "mirror", "Wall Mirror", "shared", 0.05, 7.2, 1.5, 0.15, 90, "wall"),
        F("hamper-a", "laundry_hamper", "Laundry Hamper A", "A", 0.6, 7.4, 1.5, 1.5),
        F("hamper-b", "laundry_hamper", "Laundry Hamper B", "B", 14.0, 10.9, 1.5, 1.5),
    ]))

# ---------------------------------------------------------------- T9 24x8.5
TEMPLATES.append(template(
    "corridor-double-24x8-v1", "Corridor Double — Linear Layout",
    "Long, narrow room (aspect > 2.7): beds end-to-end along the top wall, "
    "dressers continuing the same wall, desks on the opposite wall toward "
    "the window end, runner rug as the zone divider. Authored for a "
    "24 x 8.5 ft room; assumes the door on the left end wall and the window "
    "on the right end wall.",
    con(22, 26, 7.5, 9.5, 2, ["double"]), 24, 8.5, (0, 5.5, 3, 3), [
        F("bed-a", "bed", "Bed A", "A", 0.5, 0.4, BED_W, BED_L, 90),
        F("bed-b", "bed", "Bed B", "B", 7.5, 0.4, BED_W, BED_L, 90),
        F("dresser-a", "dresser", "Dresser A", "A", 14.5, 0.4, DRESSER_W, DRESSER_L, 0),
        F("dresser-b", "dresser", "Dresser B", "B", 17.3, 0.4, DRESSER_W, DRESSER_L, 0),
        F("desk-a", "desk", "Desk A", "A", 10.0, 6.3, DESK_W, DESK_L, 0),
        F("desk-b", "desk", "Desk B", "B", 14.0, 6.3, DESK_W, DESK_L, 0),
        F("chair-a", "desk_chair", "Desk Chair A", "A", 10.9, 4.7, CHAIR, CHAIR),
        F("chair-b", "desk_chair", "Desk Chair B", "B", 14.9, 4.7, CHAIR, CHAIR),
        F("rug", "rug", "Runner Rug (zone divider)", "shared", 3.2, 3.8, 6, 2.4, 0, "flat"),
        F("storage-cubes", "storage_bins", "Stackable Storage Cubes", "shared", 21.0, 6.6, 2, 1.5),
        F("lamp-a", "desk_lamp", "Desk Lamp A", "A", 10.7, 6.7, 0.5, 0.5, 0, "on", "desk-a"),
        F("lamp-b", "desk_lamp", "Desk Lamp B", "B", 14.7, 6.7, 0.5, 0.5, 0, "on", "desk-b"),
        F("string-lights", "string_lights", "String Lights", "shared", 1.0, 0.02, 10, 0.15, 0, "wall"),
        F("wall-decor", "wall_decor", "Wall Decor / Tapestry", "shared", 4.5, 8.3, 3, 0.15, 0, "wall"),
        F("pillows-a", "throw_pillows", "Throw Pillows A", "A", 0.7, 1.1, 1.5, 1, 0, "on", "bed-a"),
        F("pillows-b", "throw_pillows", "Throw Pillows B", "B", 7.7, 1.1, 1.5, 1, 0, "on", "bed-b"),
        F("bins-a", "storage_bins", "Under-Bed Storage Bins A", "A", 3.0, 1.0, 2, 1.5, 0, "on", "bed-a"),
        F("bins-b", "storage_bins", "Under-Bed Storage Bins B", "B", 10.5, 1.0, 2, 1.5, 0, "on", "bed-b"),
        F("trash", "trash_can", "Trash Can", "shared", 17.8, 7.3, 1, 1),
        F("power-strip", "power_strip", "Power Strip", "shared", 12.0, 8.3, 1, 0.15, 0, "wall"),
        F("mirror", "mirror", "Wall Mirror (window end)", "shared", 23.8, 3.4, 1.5, 0.2, 90, "wall"),
        F("hamper-a", "laundry_hamper", "Laundry Hamper A", "A", 3.3, 6.9, 1.5, 1.5),
        F("hamper-b", "laundry_hamper", "Laundry Hamper B", "B", 19.5, 6.8, 1.5, 1.5),
    ]))

# ---------------------------------------------------------------- T10 23x8
TEMPLATES.append(template(
    "corridor-single-23x8-v1", "Corridor Single — End-to-End Layout",
    "Long, narrow single: bed across the far (window) end, desk at the entry "
    "end, dresser, bins, and hamper lined along the top wall, runner rug "
    "down the middle. Authored for a 23 x 8 ft room; assumes the door on the "
    "left end wall and the window on the right end wall behind the bed.",
    con(21, 25, 7.5, 9, 1, ["single"]), 23, 8, (0, 5, 3, 3), [
        F("bed", "bed", "Bed", "A", 19.3, 0.6, BED_W, BED_L, 0),
        F("desk", "desk", "Desk", "A", 0.4, 0.5, DESK_W, DESK_L, 90),
        F("chair", "desk_chair", "Desk Chair", "A", 2.6, 1.7, CHAIR, CHAIR),
        F("dresser", "dresser", "Dresser", "A", 4.6, 0.4, DRESSER_W, DRESSER_L, 0),
        F("bins-a", "storage_bins", "Stackable Storage Bins", "A", 7.6, 0.4, 2, 1.5),
        F("hamper", "laundry_hamper", "Laundry Hamper", "A", 10.1, 0.4, 1.5, 1.5),
        F("rug", "rug", "Runner Rug", "A", 5.0, 3.4, 9, 2.2, 0, "flat"),
        F("lamp", "desk_lamp", "Desk Lamp", "A", 0.9, 1.0, 0.5, 0.5, 0, "on", "desk"),
        F("string-lights", "string_lights", "String Lights", "A", 13.5, 0.05, 8, 0.15, 0, "wall"),
        F("wall-decor", "wall_decor", "Wall Decor / Tapestry", "A", 12.5, 7.8, 3, 0.15, 0, "wall"),
        F("pillows", "throw_pillows", "Throw Pillows", "A", 19.9, 0.9, 1.5, 1, 0, "on", "bed"),
        F("bins-b", "storage_bins", "Under-Bed Storage Bins", "A", 19.8, 4.5, 2, 1.5, 0, "on", "bed"),
        F("trash", "trash_can", "Trash Can", "A", 0.4, 4.0, 1, 1),
        F("power-strip", "power_strip", "Power Strip", "A", 0.05, 0.8, 1, 0.15, 90, "wall"),
        F("mirror", "mirror", "Over-Door Mirror", "A", 0.05, 5.5, 1.5, 0.15, 90, "wall"),
    ]))


# ---------------------------------------------------------------- T11 17x16 (triple)
TEMPLATES.append(template(
    "standard-triple-17x16-v1", "Standard Triple — Two Walls, Third Bed Along the Bottom",
    "Three beds: A and B head-to-head along the top wall with a dresser "
    "between them, C along the bottom-right wall clear of the door swing. "
    "Desks for A and B stack under the window on the right wall; Desk C "
    "sits against the bottom wall left of center. Authored for a 17 x 16 "
    "ft room; assumes the door at the bottom of the left wall and the "
    "window on the right wall.",
    con(14.5, 21, 15, 19, 3, ["triple"]), 17, 16, (0, 12.5, 3, 3.5), [
        F("bed-a", "bed", "Bed A", "A", 0.5, 0.5, BED_W, BED_L, 90),
        F("bed-b", "bed", "Bed B", "B", 9.3, 0.5, BED_W, BED_L, 90),
        F("bed-c", "bed", "Bed C", "C", 9.3, 12.33, BED_W, BED_L, 90),
        F("dresser-a", "dresser", "Dresser A", "A", 7.2, 0.5, DRESSER_W, DRESSER_L, 90),
        F("dresser-b", "dresser", "Dresser B", "B", 9.3, 3.9, DRESSER_W, DRESSER_L, 90),
        F("dresser-c", "dresser", "Dresser C", "C", 7.3, 12.33, DRESSER_W, DRESSER_L, 90),
        F("desk-a", "desk", "Desk A", "A", 14.5, 4.6, DESK_W, DESK_L, 90),
        F("desk-b", "desk", "Desk B", "B", 14.5, 8.6, DESK_W, DESK_L, 90),
        F("desk-c", "desk", "Desk C", "C", 3.7, 13.6, DESK_W, DESK_L, 0),
        F("chair-a", "desk_chair", "Desk Chair A", "A", 12.7, 5.6, CHAIR, CHAIR),
        F("chair-b", "desk_chair", "Desk Chair B", "B", 12.7, 9.6, CHAIR, CHAIR),
        F("chair-c", "desk_chair", "Desk Chair C", "C", 4.8, 11.9, CHAIR, CHAIR),
        F("rug", "rug", "Area Rug", "shared", 7.4, 5.0, 5, 5, 0, "flat"),
        F("storage-cubes", "storage_bins", "Stackable Storage Cubes", "shared", 10.0, 7.0, 2, 1.5),
        F("lamp-a", "desk_lamp", "Desk Lamp A", "A", 15.0, 5.0, 0.5, 0.5, 0, "on", "desk-a"),
        F("lamp-b", "desk_lamp", "Desk Lamp B", "B", 15.0, 9.0, 0.5, 0.5, 0, "on", "desk-b"),
        F("lamp-c", "desk_lamp", "Desk Lamp C", "C", 4.2, 13.8, 0.5, 0.5, 0, "on", "desk-c"),
        F("string-lights", "string_lights", "String Lights", "shared", 0.7, 0.05, 6, 0.15, 0, "wall"),
        F("wall-decor", "wall_decor", "Wall Decor / Tapestry", "shared", 10.0, 15.8, 4, 0.15, 0, "wall"),
        F("power-strip", "power_strip", "Power Strip", "shared", 16.75, 6.2, 1, 0.25, 90, "wall"),
        F("mirror", "mirror", "Wall Mirror", "shared", 0.05, 7.2, 1.5, 0.15, 90, "wall"),
        F("pillows-a", "throw_pillows", "Throw Pillows A", "A", 0.7, 1.4, 1.5, 1, 0, "on", "bed-a"),
        F("pillows-b", "throw_pillows", "Throw Pillows B", "B", 9.5, 1.4, 1.5, 1, 0, "on", "bed-b"),
        F("pillows-c", "throw_pillows", "Throw Pillows C", "C", 9.5, 12.7, 1.5, 1, 0, "on", "bed-c"),
        F("bins-a", "storage_bins", "Under-Bed Storage Bins A", "A", 4.5, 1.1, 2, 1.5, 0, "on", "bed-a"),
        F("bins-b", "storage_bins", "Under-Bed Storage Bins B", "B", 11.5, 1.1, 2, 1.5, 0, "on", "bed-b"),
        F("bins-c", "storage_bins", "Under-Bed Storage Bins C", "C", 13.0, 12.4, 2, 1.5, 0, "on", "bed-c"),
        F("trash", "trash_can", "Trash Can", "shared", 0.6, 9.3, 1, 1),
        F("hamper-a", "laundry_hamper", "Laundry Hamper A", "A", 0.6, 4.0, 1.5, 1.5),
        F("hamper-b", "laundry_hamper", "Laundry Hamper B", "B", 13.0, 3.9, 1.5, 1.5),
        F("hamper-c", "laundry_hamper", "Laundry Hamper C", "C", 7.6, 14.9, 1.3, 1.0),
    ]))

# ---------------------------------------------------------------- T12 27x14 (triple)
TEMPLATES.append(template(
    "long-triple-27x14-v1", "Long Triple — Three Beds Along the Top Wall",
    "Long room (aspect ~1.9): all three beds end-to-end along the top wall. "
    "Desks and dressers share the bottom wall (desks left of center, dressers "
    "toward the window end) so the bed wall never has to carry more than three "
    "bed-lengths, and a runner rug divides the two zones. Authored for a 27 x "
    "14 ft room; assumes the door on the left end wall and the window on the "
    "right end wall.",
    con(21, 33, 9, 24.5, 3, ["triple"]), 27, 14, (0, 10.5, 3, 3.5), [
        F("bed-a", "bed", "Bed A", "A", 0.5, 0.4, BED_W, BED_L, 90),
        F("bed-b", "bed", "Bed B", "B", 7.5, 0.4, BED_W, BED_L, 90),
        F("bed-c", "bed", "Bed C", "C", 14.5, 0.4, BED_W, BED_L, 90),
        F("desk-a", "desk", "Desk A", "A", 3.2, 12.0, DESK_W, DESK_L, 0),
        F("desk-b", "desk", "Desk B", "B", 6.9, 12.0, DESK_W, DESK_L, 0),
        F("desk-c", "desk", "Desk C", "C", 10.6, 12.0, DESK_W, DESK_L, 0),
        F("dresser-a", "dresser", "Dresser A", "A", 14.4, 12.0, DRESSER_W, DRESSER_L, 0),
        F("dresser-b", "dresser", "Dresser B", "B", 17.1, 12.0, DRESSER_W, DRESSER_L, 0),
        F("dresser-c", "dresser", "Dresser C", "C", 19.8, 12.0, DRESSER_W, DRESSER_L, 0),
        F("chair-a", "desk_chair", "Desk Chair A", "A", 3.9, 10.0, CHAIR, CHAIR),
        F("chair-b", "desk_chair", "Desk Chair B", "B", 7.6, 10.0, CHAIR, CHAIR),
        F("chair-c", "desk_chair", "Desk Chair C", "C", 11.3, 10.0, CHAIR, CHAIR),
        F("rug", "rug", "Runner Rug (zone divider)", "shared", 4.0, 5.0, 18, 3.5, 0, "flat"),
        F("storage-cubes", "storage_bins", "Stackable Storage Cubes", "shared", 23.5, 12.0, 2, 1.5),
        F("lamp-a", "desk_lamp", "Desk Lamp A", "A", 3.6, 12.4, 0.5, 0.5, 0, "on", "desk-a"),
        F("lamp-b", "desk_lamp", "Desk Lamp B", "B", 7.3, 12.4, 0.5, 0.5, 0, "on", "desk-b"),
        F("lamp-c", "desk_lamp", "Desk Lamp C", "C", 11.0, 12.4, 0.5, 0.5, 0, "on", "desk-c"),
        F("string-lights", "string_lights", "String Lights", "shared", 1.0, 0.02, 10, 0.15, 0, "wall"),
        F("wall-decor", "wall_decor", "Wall Decor / Tapestry", "shared", 22.0, 0.05, 3, 0.15, 0, "wall"),
        F("power-strip", "power_strip", "Power Strip", "shared", 26.85, 6.0, 1, 0.15, 90, "wall"),
        F("mirror", "mirror", "Wall Mirror (window end)", "shared", 26.8, 3.4, 1.5, 0.2, 90, "wall"),
        F("pillows-a", "throw_pillows", "Throw Pillows A", "A", 0.7, 1.1, 1.5, 1, 0, "on", "bed-a"),
        F("pillows-b", "throw_pillows", "Throw Pillows B", "B", 7.7, 1.1, 1.5, 1, 0, "on", "bed-b"),
        F("pillows-c", "throw_pillows", "Throw Pillows C", "C", 14.7, 1.1, 1.5, 1, 0, "on", "bed-c"),
        F("bins-a", "storage_bins", "Under-Bed Storage Bins A", "A", 3.0, 1.0, 2, 1.5, 0, "on", "bed-a"),
        F("bins-b", "storage_bins", "Under-Bed Storage Bins B", "B", 10.0, 1.0, 2, 1.5, 0, "on", "bed-b"),
        F("bins-c", "storage_bins", "Under-Bed Storage Bins C", "C", 17.0, 1.0, 2, 1.5, 0, "on", "bed-c"),
        F("trash", "trash_can", "Trash Can", "shared", 24.0, 8.5, 1, 1),
        F("hamper-a", "laundry_hamper", "Laundry Hamper A", "A", 0.5, 5.0, 1.5, 1.5),
        F("hamper-b", "laundry_hamper", "Laundry Hamper B", "B", 22.5, 8.5, 1.5, 1.5),
        F("hamper-c", "laundry_hamper", "Laundry Hamper C", "C", 24.5, 5.0, 1.5, 1.5),
    ]))

# ---------------------------------------------------------------- T13 25x17 (quad)
TEMPLATES.append(template(
    "standard-quad-25x17-v1", "Standard Quad — Two Pairs, Individual Dressers",
    "Four beds as two head-to-head pairs: A/B along the top wall, C/D along "
    "the bottom wall. Each occupant gets their own dresser, A/C in the gap "
    "between the pairs and B/D past the far end of their bed. Desks for "
    "all four line the right wall under the window, paired stacked front-"
    "to-back. Authored for a 25 x 17 ft room; assumes the door at the "
    "bottom of the left wall and the window on the right wall.",
    con(20, 28, 13, 22, 4, ["quad"]), 25, 17, (0, 13.5, 3, 3.5), [
        F("bed-a", "bed", "Bed A", "A", 0.5, 0.4, BED_W, BED_L, 90),
        F("bed-b", "bed", "Bed B", "B", 9.5, 0.4, BED_W, BED_L, 90),
        F("bed-c", "bed", "Bed C", "C", 0.5, 10.33, BED_W, BED_L, 90),
        F("bed-d", "bed", "Bed D", "D", 9.5, 10.33, BED_W, BED_L, 90),
        F("dresser-a", "dresser", "Dresser A", "A", 7.3, 0.4, DRESSER_W, DRESSER_L, 90),
        F("dresser-b", "dresser", "Dresser B", "B", 16.3, 0.4, DRESSER_W, DRESSER_L, 90),
        F("dresser-c", "dresser", "Dresser C", "C", 7.3, 10.33, DRESSER_W, DRESSER_L, 90),
        F("dresser-d", "dresser", "Dresser D", "D", 16.3, 11.0, DRESSER_W, DRESSER_L, 90),
        F("desk-a", "desk", "Desk A", "A", 20.5, 0.5, DESK_W, DESK_L, 90),
        F("desk-b", "desk", "Desk B", "B", 20.5, 4.5, DESK_W, DESK_L, 90),
        F("desk-c", "desk", "Desk C", "C", 20.5, 9.0, DESK_W, DESK_L, 90),
        F("desk-d", "desk", "Desk D", "D", 20.5, 13.0, DESK_W, DESK_L, 90),
        F("chair-a", "desk_chair", "Desk Chair A", "A", 18.7, 1.5, CHAIR, CHAIR),
        F("chair-b", "desk_chair", "Desk Chair B", "B", 18.7, 5.5, CHAIR, CHAIR),
        F("chair-c", "desk_chair", "Desk Chair C", "C", 18.7, 10.0, CHAIR, CHAIR),
        F("chair-d", "desk_chair", "Desk Chair D", "D", 18.7, 14.0, CHAIR, CHAIR),
        F("rug", "rug", "Large Area Rug", "shared", 4.0, 5.7, 8, 5.5, 0, "flat"),
        F("storage-cubes", "storage_bins", "Stackable Storage Cubes", "shared", 14.0, 5.9, 2, 1.5),
        F("lamp-a", "desk_lamp", "Desk Lamp A", "A", 21.2, 0.9, 0.5, 0.5, 0, "on", "desk-a"),
        F("lamp-b", "desk_lamp", "Desk Lamp B", "B", 21.2, 4.9, 0.5, 0.5, 0, "on", "desk-b"),
        F("lamp-c", "desk_lamp", "Desk Lamp C", "C", 21.2, 9.4, 0.5, 0.5, 0, "on", "desk-c"),
        F("lamp-d", "desk_lamp", "Desk Lamp D", "D", 21.2, 13.4, 0.5, 0.5, 0, "on", "desk-d"),
        F("string-lights-a", "string_lights", "String Lights (top)", "shared", 0.8, 0.05, 7, 0.15, 0, "wall"),
        F("string-lights-b", "string_lights", "String Lights (bottom)", "shared", 0.8, 16.8, 7, 0.15, 0, "wall"),
        F("wall-decor", "wall_decor", "Wall Decor / Tapestry", "shared", 10.0, 0.05, 3, 0.15, 0, "wall"),
        F("power-strip", "power_strip", "Power Strip", "shared", 24.75, 7.0, 1, 0.25, 90, "wall"),
        F("mirror", "mirror", "Wall Mirror", "shared", 0.05, 5.6, 1.5, 0.15, 90, "wall"),
        F("pillows-a", "throw_pillows", "Throw Pillows A", "A", 0.7, 1.4, 1.5, 1, 0, "on", "bed-a"),
        F("pillows-b", "throw_pillows", "Throw Pillows B", "B", 9.7, 1.4, 1.5, 1, 0, "on", "bed-b"),
        F("pillows-c", "throw_pillows", "Throw Pillows C", "C", 0.7, 11.2, 1.5, 1, 0, "on", "bed-c"),
        F("pillows-d", "throw_pillows", "Throw Pillows D", "D", 9.7, 11.2, 1.5, 1, 0, "on", "bed-d"),
        F("bins-a", "storage_bins", "Under-Bed Storage Bins A", "A", 4.0, 1.1, 2, 1.5, 0, "on", "bed-a"),
        F("bins-b", "storage_bins", "Under-Bed Storage Bins B", "B", 12.0, 1.1, 2, 1.5, 0, "on", "bed-b"),
        F("bins-c", "storage_bins", "Under-Bed Storage Bins C", "C", 4.0, 11.0, 2, 1.5, 0, "on", "bed-c"),
        F("bins-d", "storage_bins", "Under-Bed Storage Bins D", "D", 12.0, 11.0, 2, 1.5, 0, "on", "bed-d"),
        F("trash", "trash_can", "Trash Can", "shared", 18.0, 7.5, 1, 1),
        F("hamper-a", "laundry_hamper", "Laundry Hamper A", "A", 4.5, 3.7, 1.5, 1.5),
        F("hamper-b", "laundry_hamper", "Laundry Hamper B", "B", 12.5, 3.7, 1.5, 1.5),
        F("hamper-c", "laundry_hamper", "Laundry Hamper C", "C", 4.5, 13.6, 1.5, 1.5),
        F("hamper-d", "laundry_hamper", "Laundry Hamper D", "D", 12.5, 13.6, 1.5, 1.5),
    ]))

# ---------------------------------------------------------------- T14 33x14 (quad)
TEMPLATES.append(template(
    "long-quad-33x14-v1", "Long Quad — Four Beds Along the Top Wall",
    "Long, narrower room: all four beds end-to-end along the top wall, "
    "dressers continuing the same run toward the window end. Desks line "
    "the bottom wall in pairs. Authored for a 33 x 14 ft room; assumes the "
    "door at the bottom-left and the window on the right end wall.",
    con(28, 40, 11, 19, 4, ["quad"]), 33, 14, (0, 10.5, 3, 3.5), [
        F("bed-a", "bed", "Bed A", "A", 0.5, 0.4, BED_W, BED_L, 90),
        F("bed-b", "bed", "Bed B", "B", 7.5, 0.4, BED_W, BED_L, 90),
        F("bed-c", "bed", "Bed C", "C", 14.5, 0.4, BED_W, BED_L, 90),
        F("bed-d", "bed", "Bed D", "D", 21.5, 0.4, BED_W, BED_L, 90),
        F("dresser-a", "dresser", "Dresser A", "A", 28.5, 0.4, DRESSER_W, DRESSER_L, 0),
        F("dresser-b", "dresser", "Dresser B", "B", 30.5, 2.5, DRESSER_W, DRESSER_L, 0),
        F("dresser-c", "dresser", "Dresser C", "C", 28.5, 4.6, DRESSER_W, DRESSER_L, 0),
        F("dresser-d", "dresser", "Dresser D", "D", 30.5, 6.7, DRESSER_W, DRESSER_L, 0),
        F("desk-a", "desk", "Desk A", "A", 4.0, 8.0, DESK_W, DESK_L, 0),
        F("desk-b", "desk", "Desk B", "B", 8.0, 8.0, DESK_W, DESK_L, 0),
        F("desk-c", "desk", "Desk C", "C", 15.0, 8.0, DESK_W, DESK_L, 0),
        F("desk-d", "desk", "Desk D", "D", 19.0, 8.0, DESK_W, DESK_L, 0),
        F("chair-a", "desk_chair", "Desk Chair A", "A", 4.8, 6.3, CHAIR, CHAIR),
        F("chair-b", "desk_chair", "Desk Chair B", "B", 8.8, 6.3, CHAIR, CHAIR),
        F("chair-c", "desk_chair", "Desk Chair C", "C", 15.8, 6.3, CHAIR, CHAIR),
        F("chair-d", "desk_chair", "Desk Chair D", "D", 19.8, 6.3, CHAIR, CHAIR),
        F("rug", "rug", "Runner Rug (zone divider)", "shared", 3.5, 4.2, 12, 2.2, 0, "flat"),
        F("lamp-a", "desk_lamp", "Desk Lamp A", "A", 4.7, 8.4, 0.5, 0.5, 0, "on", "desk-a"),
        F("lamp-b", "desk_lamp", "Desk Lamp B", "B", 8.7, 8.4, 0.5, 0.5, 0, "on", "desk-b"),
        F("lamp-c", "desk_lamp", "Desk Lamp C", "C", 15.7, 8.4, 0.5, 0.5, 0, "on", "desk-c"),
        F("lamp-d", "desk_lamp", "Desk Lamp D", "D", 19.7, 8.4, 0.5, 0.5, 0, "on", "desk-d"),
        F("string-lights", "string_lights", "String Lights", "shared", 1.0, 0.02, 14, 0.15, 0, "wall"),
        F("wall-decor", "wall_decor", "Wall Decor / Tapestry", "shared", 23.5, 13.8, 3, 0.15, 0, "wall"),
        F("power-strip", "power_strip", "Power Strip", "shared", 21.0, 13.8, 1, 0.15, 0, "wall"),
        F("mirror", "mirror", "Wall Mirror (window end)", "shared", 32.8, 3.4, 1.5, 0.2, 90, "wall"),
        F("pillows-a", "throw_pillows", "Throw Pillows A", "A", 0.7, 1.1, 1.5, 1, 0, "on", "bed-a"),
        F("pillows-b", "throw_pillows", "Throw Pillows B", "B", 7.7, 1.1, 1.5, 1, 0, "on", "bed-b"),
        F("pillows-c", "throw_pillows", "Throw Pillows C", "C", 14.7, 1.1, 1.5, 1, 0, "on", "bed-c"),
        F("pillows-d", "throw_pillows", "Throw Pillows D", "D", 21.7, 1.1, 1.5, 1, 0, "on", "bed-d"),
        F("bins-a", "storage_bins", "Under-Bed Storage Bins A", "A", 3.0, 1.0, 2, 1.5, 0, "on", "bed-a"),
        F("bins-b", "storage_bins", "Under-Bed Storage Bins B", "B", 10.0, 1.0, 2, 1.5, 0, "on", "bed-b"),
        F("bins-c", "storage_bins", "Under-Bed Storage Bins C", "C", 17.0, 1.0, 2, 1.5, 0, "on", "bed-c"),
        F("bins-d", "storage_bins", "Under-Bed Storage Bins D", "D", 24.0, 1.0, 2, 1.5, 0, "on", "bed-d"),
        F("trash", "trash_can", "Trash Can", "shared", 26.8, 7.3, 1, 1),
        F("hamper-a", "laundry_hamper", "Laundry Hamper A", "A", 3.3, 6.3, 1.5, 1.5),
        F("hamper-b", "laundry_hamper", "Laundry Hamper B", "B", 17.3, 6.3, 1.5, 1.5),
        F("hamper-c", "laundry_hamper", "Laundry Hamper C", "C", 24.5, 8.0, 1.5, 1.5),
        F("hamper-d", "laundry_hamper", "Laundry Hamper D", "D", 26.5, 10.0, 1.5, 1.5),
    ]))

# ---------------------------------------------------------------- T15 13x12 (compact triple, bunked, L-shape)
# Tight triples (roughly < 250 sqft) cannot hold three flat beds plus three
# desks and dressers; a flat template refit into them overlaps no matter how it
# is packed. Bunking A over B frees floor, and the beds sit on PERPENDICULAR
# walls (L-shape) so no single wall must carry two 6.7 ft bed-lengths, which is
# what breaks in rooms narrower than ~13.5 ft.
TEMPLATES.append(template(
    "compact-triple-bunked-13x12-v1", "Compact Triple — Bunked Pair, L-Shape",
    "Tight triple: A and B bunked on the top-left wall, the third bed on the "
    "right wall (an L, so neither wall needs two bed-lengths). Desks A and B "
    "line the left wall, desk C and the dressers run along the bottom wall "
    "clear of the door. Authored for a 13 x 12 ft room; assumes the door at "
    "the bottom of the left wall and the window on the right wall.",
    con(11, 18.5, 9, 15, 3, ["triple"]), 13, 12, (0, 9, 3, 3), [
        F("bed-ab", "bed", "Bunked Beds (A lower, B upper)", "shared", 0.5, 0.5, BED_W, BED_L, 90),
        F("bed-c", "bed", "Bed C", "C", 9.83, 0.5, BED_W, BED_L, 0),
        F("desk-a", "desk", "Desk A", "A", 0.5, 4.0, DESK_W, DESK_L, 0),
        F("desk-b", "desk", "Desk B", "B", 0.5, 6.2, DESK_W, DESK_L, 0),
        F("desk-c", "desk", "Desk C", "C", 3.2, 10.0, DESK_W, DESK_L, 0),
        F("dresser-a", "dresser", "Dresser A", "A", 7.0, 10.0, DRESSER_W, DRESSER_L, 0),
        F("dresser-b", "dresser", "Dresser B", "B", 9.7, 10.0, DRESSER_W, DRESSER_L, 0),
        # Beside bed C (not stacked under it): a vertical bed plus two stacked
        # dressers would overrun the wall when the room compresses below 11 ft.
        F("dresser-c", "dresser", "Dresser C", "C", 7.2, 5.0, DRESSER_W, DRESSER_L, 0),
        F("chair-a", "desk_chair", "Desk Chair A", "A", 4.2, 4.2, CHAIR, CHAIR),
        F("chair-b", "desk_chair", "Desk Chair B", "B", 4.2, 6.4, CHAIR, CHAIR),
        F("chair-c", "desk_chair", "Desk Chair C", "C", 4.0, 8.2, CHAIR, CHAIR),
        F("rug", "rug", "Area Rug", "shared", 4.0, 3.9, 5, 4, 0, "flat"),
        F("lamp-a", "desk_lamp", "Desk Lamp A", "A", 1.0, 4.4, 0.5, 0.5, 0, "on", "desk-a"),
        F("lamp-b", "desk_lamp", "Desk Lamp B", "B", 1.0, 6.6, 0.5, 0.5, 0, "on", "desk-b"),
        F("lamp-c", "desk_lamp", "Desk Lamp C", "C", 3.6, 10.4, 0.5, 0.5, 0, "on", "desk-c"),
        F("string-lights", "string_lights", "String Lights", "shared", 0.7, 0.05, 6, 0.15, 0, "wall"),
        F("wall-decor", "wall_decor", "Wall Decor / Tapestry", "shared", 7.5, 0.05, 2, 0.15, 0, "wall"),
        F("power-strip", "power_strip", "Power Strip", "shared", 12.75, 8.0, 1, 0.25, 90, "wall"),
        F("mirror", "mirror", "Wall Mirror", "shared", 0.05, 8.0, 1.5, 0.15, 90, "wall"),
        F("pillows-a", "throw_pillows", "Throw Pillows (lower bunk)", "A", 0.8, 1.2, 1.5, 1, 0, "on", "bed-ab"),
        F("pillows-c", "throw_pillows", "Throw Pillows C", "C", 10.2, 1.0, 1.5, 1, 0, "on", "bed-c"),
        F("bins-ab", "storage_bins", "Under-Bed Storage Bins", "shared", 3.5, 1.1, 2, 1.5, 0, "on", "bed-ab"),
        F("bins-c", "storage_bins", "Under-Bed Storage Bins C", "C", 10.0, 4.5, 2, 1.5, 0, "on", "bed-c"),
        F("trash", "trash_can", "Trash Can", "shared", 7.0, 7.5, 1, 1),
    ]))

# ---------------------------------------------------------------- T16 15x13 (compact quad, bunked, L-shape)
# Tight quads (down to ~130 sqft) cannot seat four flat beds. Two bunk stacks
# on PERPENDICULAR walls (A/B on the top wall, C/D on the right wall) keep both
# bunks off the bottom-left door and never put two bed-lengths on one wall,
# freeing floor for four desks and four dressers.
TEMPLATES.append(template(
    "compact-quad-bunked-15x13-v1", "Compact Quad — Two Bunk Stacks, L-Shape",
    "Tight quad: bunk A/B on the top wall and bunk C/D on the right wall (an "
    "L). Desks A and B line the left wall, desks C and D the bottom wall clear "
    "of the door; each occupant keeps their own dresser. Authored for a 15 x "
    "13 ft room; assumes the door at the bottom of the left wall and the "
    "window on the right wall.",
    con(11, 20, 9, 19, 4, ["quad"]), 15, 13, (0, 10, 3, 3), [
        F("bed-ab", "bed", "Bunked Beds (A lower, B upper)", "shared", 0.5, 0.4, BED_W, BED_L, 90),
        F("bed-cd", "bed", "Bunked Beds (C lower, D upper)", "shared", 11.83, 0.4, BED_W, BED_L, 0),
        F("desk-a", "desk", "Desk A", "A", 0.5, 4.0, DESK_W, DESK_L, 0),
        F("desk-b", "desk", "Desk B", "B", 0.5, 6.2, DESK_W, DESK_L, 0),
        F("desk-c", "desk", "Desk C", "C", 3.2, 11.0, DESK_W, DESK_L, 0),
        F("desk-d", "desk", "Desk D", "D", 6.9, 11.0, DESK_W, DESK_L, 0),
        F("dresser-a", "dresser", "Dresser A", "A", 4.5, 4.0, DRESSER_W, DRESSER_L, 0),
        F("dresser-b", "dresser", "Dresser B", "B", 4.5, 6.2, DRESSER_W, DRESSER_L, 0),
        F("dresser-c", "dresser", "Dresser C", "C", 11.5, 8.0, DRESSER_W, DRESSER_L, 0),
        F("dresser-d", "dresser", "Dresser D", "D", 10.6, 11.0, DRESSER_W, DRESSER_L, 0),
        F("chair-a", "desk_chair", "Desk Chair A", "A", 7.5, 4.2, CHAIR, CHAIR),
        F("chair-b", "desk_chair", "Desk Chair B", "B", 7.5, 6.4, CHAIR, CHAIR),
        F("chair-c", "desk_chair", "Desk Chair C", "C", 3.6, 9.2, CHAIR, CHAIR),
        F("chair-d", "desk_chair", "Desk Chair D", "D", 7.3, 9.2, CHAIR, CHAIR),
        F("rug", "rug", "Large Area Rug", "shared", 7.0, 4.0, 4.5, 4.5, 0, "flat"),
        F("lamp-a", "desk_lamp", "Desk Lamp A", "A", 1.0, 4.4, 0.5, 0.5, 0, "on", "desk-a"),
        F("lamp-b", "desk_lamp", "Desk Lamp B", "B", 1.0, 6.6, 0.5, 0.5, 0, "on", "desk-b"),
        F("lamp-c", "desk_lamp", "Desk Lamp C", "C", 3.6, 11.4, 0.5, 0.5, 0, "on", "desk-c"),
        F("lamp-d", "desk_lamp", "Desk Lamp D", "D", 7.3, 11.4, 0.5, 0.5, 0, "on", "desk-d"),
        F("string-lights-a", "string_lights", "String Lights (left)", "shared", 0.7, 0.05, 6, 0.15, 0, "wall"),
        F("string-lights-b", "string_lights", "String Lights (right)", "shared", 7.5, 0.05, 4, 0.15, 0, "wall"),
        F("wall-decor", "wall_decor", "Wall Decor / Tapestry", "shared", 0.05, 8.5, 1.5, 0.15, 90, "wall"),
        F("power-strip", "power_strip", "Power Strip", "shared", 14.75, 8.5, 1, 0.25, 90, "wall"),
        F("mirror", "mirror", "Wall Mirror", "shared", 0.05, 4.0, 1.5, 0.15, 90, "wall"),
        F("pillows-a", "throw_pillows", "Throw Pillows (A/B bunk)", "A", 0.8, 1.0, 1.5, 1, 0, "on", "bed-ab"),
        F("pillows-c", "throw_pillows", "Throw Pillows (C/D bunk)", "C", 12.2, 1.0, 1.5, 1, 0, "on", "bed-cd"),
        F("bins-ab", "storage_bins", "Under-Bed Storage Bins (A/B)", "shared", 3.5, 1.0, 2, 1.5, 0, "on", "bed-ab"),
        F("bins-cd", "storage_bins", "Under-Bed Storage Bins (C/D)", "shared", 12.0, 4.0, 2, 1.5, 0, "on", "bed-cd"),
        F("trash", "trash_can", "Trash Can", "shared", 9.5, 8.3, 1, 1),
        F("hamper", "laundry_hamper", "Collapsible Laundry Hamper", "shared", 5.5, 8.3, 1.5, 1.5),
    ]))


def main():
    os.makedirs(OUT, exist_ok=True)
    bad = 0
    meta = []
    for t, errs, (L, W, door, items) in TEMPLATES:
        if errs:
            bad += 1
            print(f"FAIL {t['template_id']} ({L}x{W}):")
            for e in errs:
                print("   ", e)
        else:
            path = os.path.join(OUT, t["template_id"] + ".json")
            json.dump(t, open(path, "w"), indent=2, ensure_ascii=False)
            print(f"OK   {t['template_id']:34} {L}x{W}  "
                  f"items={len(t['furniture'])}")
        meta.append((t, L, W, door, items))
    if bad:
        sys.exit(1)
    # constraint-range overlap check (same occupancy only)
    for i in range(len(meta)):
        for j in range(i + 1, len(meta)):
            a, b = meta[i][0]["room_constraints"], meta[j][0]["room_constraints"]
            if a["occupants"] != b["occupants"]:
                continue
            if (a["min_length_ft"] < b["max_length_ft"] and
                    b["min_length_ft"] < a["max_length_ft"] and
                    a["min_width_ft"] < b["max_width_ft"] and
                    b["min_width_ft"] < a["max_width_ft"]):
                print(f"RANGE OVERLAP: {meta[i][0]['template_id']} x "
                      f"{meta[j][0]['template_id']}")
    print("all templates written to", OUT)


if __name__ == "__main__":
    main()
